
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface CsvUploadSectionProps {
  messageType: 'sms' | 'email' | 'scheduled-sms';
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessages: () => void;
  onClear: () => void;
  isLoading?: boolean;
  csvFile: File | null;
  message: string;
  onMessageChange: (message: string) => void;
  characterCount: number;
}

export function CsvUploadSection({ 
  messageType, 
  onFileChange, 
  onSendMessages, 
  onClear,
  isLoading = false,
  csvFile,
  message,
  onMessageChange,
  characterCount
}: CsvUploadSectionProps) {
  // For both regular SMS and scheduled SMS, we want to show phone in instructions
  const contactType = messageType === 'email' ? 'email' : 'phone';
  
  const isSmsType = messageType === 'sms' || messageType === 'scheduled-sms';
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="csv-file">Upload CSV File</Label>
          <div className="flex items-center gap-2">
            <Input 
              id="csv-file" 
              type="file" 
              accept=".csv" 
              onChange={onFileChange}
              className="flex-1"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            CSV should include: {contactType} in the first column, and optional personalization fields in subsequent columns.
          </p>
          {csvFile && (
            <div className="bg-muted p-2 rounded text-sm">
              <p className="font-medium">Selected file:</p>
              <p className="truncate">{csvFile.name} ({Math.round(csvFile.size / 1024)} KB)</p>
            </div>
          )}
        </div>
        
        <div className="grid gap-2 mt-4">
          <Label htmlFor="csv-message">Message</Label>
          <Textarea
            id="csv-message"
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            rows={6}
            className="resize-none"
          />
          {isSmsType && (
            <div className="text-xs text-muted-foreground mt-1 flex justify-between">
              <span>Character count: {characterCount}</span>
              <span>
                SMS count: {Math.ceil(characterCount / 160)} 
                ({160 - (characterCount % 160 || 160)} characters left in current SMS)
              </span>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            You can use placeholders like {"{column_name}"} to personalize messages with data from your CSV.
          </p>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button 
          variant="outline"
          onClick={onClear}
          disabled={isLoading}
        >
          Clear
        </Button>
        <Button 
          onClick={onSendMessages} 
          disabled={isLoading || !csvFile || !message.trim()}
        >
          {isLoading ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Sending...
            </>
          ) : (
            <>
              {csvFile && message.trim() ? "Send Messages" : "Please upload CSV and add message"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
