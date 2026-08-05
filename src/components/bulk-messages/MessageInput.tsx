
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";

interface MessageInputProps {
  message: string;
  characterCount: number;
  messageType: 'sms' | 'email' | 'scheduled-sms';
  onMessageChange: (value: string) => void;
}

export function MessageInput({ message, characterCount, messageType, onMessageChange }: MessageInputProps) {
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    onMessageChange(newMessage);
  };

  const isSmsType = messageType === 'sms' || messageType === 'scheduled-sms';

  return (
    <div>
      <Label htmlFor="message-content">Message</Label>
      <Textarea
        id="message-content"
        placeholder="Type your message"
        value={message}
        onChange={handleMessageChange}
        maxLength={isSmsType ? 160 : 10000}
        className="h-32"
      />
      {isSmsType && (
        <div className="text-sm text-muted-foreground mt-1 flex items-center">
          <Info className="h-4 w-4 mr-1" />
          <span>{characterCount}/160 characters (1 message)</span>
        </div>
      )}
    </div>
  );
}
