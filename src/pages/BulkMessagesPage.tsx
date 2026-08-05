import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, PhoneOutgoing, Clock, Mail } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendSMS } from "@/utils/sms";
import { sendCustomEmail } from "@/utils/customEmail";
import { useToast } from "@/components/ui/use-toast";
import { MessageTypeSelect } from "@/components/bulk-messages/MessageTypeSelect";
import { RecipientInput } from "@/components/bulk-messages/RecipientInput";
import { MessageInput } from "@/components/bulk-messages/MessageInput";
import { CsvUploadSection } from "@/components/bulk-messages/CsvUploadSection";
import { AttachmentUpload } from "@/components/bulk-messages/AttachmentUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmsBalanceCard } from "@/components/bulk-messages/SmsBalanceCard";
import { sendScheduledSMS } from "@/utils/scheduledSms";
import Papa from 'papaparse';

interface Attachment {
  filename: string;
  url: string;
}

export default function BulkMessagesPage() {
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [characterCount, setCharacterCount] = useState(0);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<Array<any>>([]);
  const [messageType, setMessageType] = useState<'sms' | 'email' | 'scheduled-sms'>('sms');
  const [senderId, setSenderId] = useState('MOVAconsult');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleMessageChange = (newMessage: string) => {
    setMessage(newMessage);
    setCharacterCount(newMessage.length);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setCsvFile(file);
      
      // Parse the CSV file
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvData(results.data);
          toast({
            title: "CSV File Loaded",
            description: `Successfully parsed ${results.data.length} rows of data.`,
          });
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          toast({
            title: "Error",
            description: "Failed to parse CSV file. Please check the format.",
            variant: "destructive",
          });
        }
      });
    }
  };

  const handleSendMessages = async () => {
    try {
      setIsLoading(true);
      
      if (messageType === 'email') {
        if (!emailSubject.trim()) {
          toast({
            title: "Error",
            description: "Email subject is required",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        let recipients: string[] = [];
        
        if (csvFile && csvData.length > 0) {
          // Extract email addresses from CSV data
          const emailColumn = Object.keys(csvData[0])[0]; // Get first column name
          recipients = csvData.map(row => row[emailColumn]?.toString().trim()).filter(Boolean);
          
          // Process personalization if needed
          if (message.includes('{') && message.includes('}')) {
            // For each recipient, send a personalized email
            const results = await Promise.all(
              csvData.map(async (row) => {
                const email = row[emailColumn]?.toString().trim();
                if (!email) return null;
                
                // Replace placeholders with actual values
                let personalizedMessage = message;
                let personalizedSubject = emailSubject;
                Object.keys(row).forEach(key => {
                  const placeholder = `{${key}}`;
                  if (personalizedMessage.includes(placeholder)) {
                    personalizedMessage = personalizedMessage.replace(new RegExp(placeholder, 'g'), row[key]);
                  }
                  if (personalizedSubject.includes(placeholder)) {
                    personalizedSubject = personalizedSubject.replace(new RegExp(placeholder, 'g'), row[key]);
                  }
                });
                
                return await sendCustomEmail({
                  to: [email],
                  subject: personalizedSubject,
                  text_body: personalizedMessage,
                  attachments: attachments
                });
              })
            );
            
            toast({
              title: "Success",
              description: `${results.filter(Boolean).length} personalized emails sent successfully`,
            });
            
            clearForm();
            setIsLoading(false);
            return;
          }
        } else {
          // Use manually entered email addresses
          recipients = phoneNumbers.split(',').map(email => email.trim()).filter(Boolean);
        }
        
        if (recipients.length === 0) {
          toast({
            title: "Error",
            description: "No valid email addresses found. Please check your input.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        await sendCustomEmail({
          to: recipients,
          subject: emailSubject,
          text_body: message,
          attachments: attachments
        });

        toast({
          title: "Success",
          description: `Emails sent successfully to ${recipients.length} recipients`,
        });

        clearForm();
      } else if (messageType === 'sms' || messageType === 'scheduled-sms') {
        let recipients: string[] = [];
        
        if (csvFile && csvData.length > 0) {
          // Extract phone numbers from CSV data
          // We expect the first column to contain the phone numbers
          const phoneColumn = Object.keys(csvData[0])[0]; // Get first column name
          recipients = csvData.map(row => row[phoneColumn]?.toString().trim()).filter(Boolean);
          
          // Process personalization if needed
          if (message.includes('{') && message.includes('}')) {
            // For each recipient, we'll need to send a personalized message
            const results = await Promise.all(
              csvData.map(async (row) => {
                const phone = row[phoneColumn]?.toString().trim();
                if (!phone) return null;
                
                // Replace placeholders with actual values
                let personalizedMessage = message;
                Object.keys(row).forEach(key => {
                  const placeholder = `{${key}}`;
                  if (personalizedMessage.includes(placeholder)) {
                    personalizedMessage = personalizedMessage.replace(new RegExp(placeholder, 'g'), row[key]);
                  }
                });
                
                if (messageType === 'scheduled-sms') {
                  return await sendScheduledSMS({
                    message: personalizedMessage,
                    recipients: [phone],
                    senderId,
                    scheduleTime: formatScheduleTime(scheduleDateTime)
                  });
                } else {
                  return await sendSMS({
                    message: personalizedMessage,
                    recipients: [phone],
                    senderId
                  });
                }
              })
            );
            
            toast({
              title: "Success",
              description: messageType === 'sms' 
                ? `${results.filter(Boolean).length} personalized SMS messages sent successfully`
                : `${results.filter(Boolean).length} personalized SMS messages scheduled successfully`,
            });
            
            clearForm();
            setIsLoading(false);
            return;
          }
        } else {
          // Use manually entered phone numbers
          recipients = phoneNumbers.split(',').map(num => num.trim()).filter(Boolean);
        }
        
        if (recipients.length === 0) {
          toast({
            title: "Error",
            description: "No valid recipients found. Please check your input.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        if (messageType === 'scheduled-sms') {
          if (!scheduleDateTime) {
            toast({
              title: "Error",
              description: "Please select a date and time for the scheduled SMS",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }

          const scheduleTime = formatScheduleTime(scheduleDateTime);
          
          await sendScheduledSMS({
            message,
            recipients,
            senderId,
            scheduleTime
          });

          toast({
            title: "Success",
            description: `SMS messages scheduled successfully for ${recipients.length} recipients`,
          });

          clearForm();
        } else {
          await sendSMS({
            message,
            recipients,
            senderId
          });

          toast({
            title: "Success",
            description: `SMS messages sent successfully to ${recipients.length} recipients`,
          });

          clearForm();
        }
      }
    } catch (error) {
      console.error('Error sending messages:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send messages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format the date for the API
  const formatScheduleTime = (dateTime: string): string => {
    const date = new Date(dateTime);
    // Extracting components
    const day: string = String(date.getUTCDate()).padStart(2, '0'); 
    const month: string = String(date.getUTCMonth() + 1).padStart(2, '0'); 
    const year: number = date.getUTCFullYear(); 
    let hours: number = date.getUTCHours(); 
    const minutes: string = String(date.getUTCMinutes()).padStart(2, '0'); 
    // determine am pm
    const ampm: string = hours >= 12 ? 'PM' : 'AM';
    // Constructing the desired format: DD-MM-YYYY HH:mm
    return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
  };

  const clearForm = () => {
    setPhoneNumbers('');
    setMessage('');
    setCharacterCount(0);
    setCsvFile(null);
    setCsvData([]);
    setScheduleDateTime('');
    setEmailSubject('');
    setAttachments([]);
  };

  return (
    <MainLayout title="Bulk Messages">
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
                <div>
                  <CardTitle>Bulk Messages</CardTitle>
                  <CardDescription>Send messages to multiple recipients at once</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
          
          <SmsBalanceCard />
        </div>

        <Tabs defaultValue="manual" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="upload">CSV Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Message Details</CardTitle>
                <CardDescription>Enter recipient details and message content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="message-type">Message Type</Label>
                    <div className="flex space-x-2 mt-1">
                      <Button 
                        type="button" 
                        variant={messageType === 'sms' ? "default" : "outline"}
                        onClick={() => setMessageType('sms')}
                        className="flex-1"
                      >
                        <PhoneOutgoing className="mr-2 h-4 w-4" />
                        SMS
                      </Button>
                      <Button 
                        type="button" 
                        variant={messageType === 'scheduled-sms' ? "default" : "outline"}
                        onClick={() => setMessageType('scheduled-sms')}
                        className="flex-1"
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Scheduled SMS
                      </Button>
                      <Button 
                        type="button" 
                        variant={messageType === 'email' ? "default" : "outline"}
                        onClick={() => setMessageType('email')}
                        className="flex-1"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Email
                      </Button>
                    </div>
                  </div>
                  
                  {(messageType === 'sms' || messageType === 'scheduled-sms') && (
                    <div>
                      <Label htmlFor="sender-id">Sender ID</Label>
                      <Input
                        id="sender-id"
                        placeholder="Enter sender ID (max 11 characters)"
                        value={senderId}
                        onChange={(e) => setSenderId(e.target.value)}
                        maxLength={11}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This is the name that will appear as the sender of the SMS message (max 11 characters)
                      </p>
                    </div>
                  )}

                  {messageType === 'email' && (
                    <>
                      <div>
                        <Label htmlFor="email-subject">Email Subject</Label>
                        <Input
                          id="email-subject"
                          placeholder="Enter email subject"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Subject line for your email message
                        </p>
                      </div>
                      
                      <AttachmentUpload 
                        attachments={attachments}
                        onAttachmentsChange={setAttachments}
                      />
                    </>
                  )}
                  
                  {messageType === 'scheduled-sms' && (
                    <div>
                      <Label htmlFor="schedule-datetime">Schedule Date & Time</Label>
                      <Input
                        id="schedule-datetime"
                        type="datetime-local"
                        value={scheduleDateTime}
                        onChange={(e) => setScheduleDateTime(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Select when you want the SMS to be sent
                      </p>
                    </div>
                  )}
                                 
                  <RecipientInput 
                    messageType={messageType}
                    recipients={phoneNumbers}
                    onRecipientsChange={setPhoneNumbers}
                  />

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <div className="mt-1">
                      <textarea
                        id="message"
                        rows={6}
                        className="w-full border rounded-md p-2 text-sm"
                        placeholder={messageType === 'email' ? "Type your email message here..." : "Type your message here..."}
                        value={message}
                        onChange={(e) => handleMessageChange(e.target.value)}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                      <span>Character count: {characterCount}</span>
                      {(messageType === 'sms' || messageType === 'scheduled-sms') ? (
                        <span>
                          SMS count: {Math.ceil(characterCount / 160)} 
                          ({160 - (characterCount % 160 || 160)} characters left in current SMS)
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline"
                    onClick={clearForm}
                    disabled={isLoading}
                  >
                    Clear
                  </Button>
                  <Button 
                    onClick={handleSendMessages}
                    disabled={isLoading || (messageType === 'email' && !emailSubject.trim())}
                  >
                    {isLoading ? (
                      <>Loading...</>
                    ) : (
                      <>
                        {messageType === 'sms' ? (
                          <PhoneOutgoing className="mr-2 h-4 w-4" />
                        ) : messageType === 'scheduled-sms' ? (
                          <Clock className="mr-2 h-4 w-4" />
                        ) : (
                          <Mail className="mr-2 h-4 w-4" />
                        )}
                        {messageType === 'sms' ? 'Send SMS' : 
                         messageType === 'scheduled-sms' ? 'Schedule SMS' : 
                         'Send Email'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>CSV Upload</CardTitle>
                <CardDescription>Upload a CSV file with recipient details</CardDescription>
              </CardHeader>
              <CardContent>
                <MessageTypeSelect 
                  messageType={messageType} 
                  onMessageTypeChange={(value) => setMessageType(value as 'sms' | 'email' | 'scheduled-sms')} 
                />
                
                {(messageType === 'sms' || messageType === 'scheduled-sms') && (
                  <div className="mt-4 mb-4">
                    <Label htmlFor="csv-sender-id">Sender ID</Label>
                    <Input
                      id="csv-sender-id"
                      placeholder="Enter sender ID (max 11 characters)"
                      value={senderId}
                      onChange={(e) => setSenderId(e.target.value)}
                      maxLength={11}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This is the name that will appear as the sender of the SMS message (max 11 characters)
                    </p>
                  </div>
                )}

                {messageType === 'email' && (
                  <>
                    <div className="mt-4 mb-4">
                      <Label htmlFor="csv-email-subject">Email Subject</Label>
                      <Input
                        id="csv-email-subject"
                        placeholder="Enter email subject"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Subject line for your email message
                      </p>
                    </div>
                    
                    <div className="mt-4 mb-4">
                      <AttachmentUpload 
                        attachments={attachments}
                        onAttachmentsChange={setAttachments}
                      />
                    </div>
                  </>
                )}
                
                <CsvUploadSection
                  messageType={messageType}
                  onFileChange={handleFileChange}
                  onSendMessages={handleSendMessages}
                  onClear={clearForm}
                  isLoading={isLoading}
                  csvFile={csvFile}
                  message={message}
                  onMessageChange={handleMessageChange}
                  characterCount={characterCount}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
