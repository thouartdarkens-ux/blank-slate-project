
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface MessageTypeSelectProps {
  messageType: 'sms' | 'email' | 'scheduled-sms';
  onMessageTypeChange: (value: 'sms' | 'email' | 'scheduled-sms') => void;
}

export function MessageTypeSelect({ messageType, onMessageTypeChange }: MessageTypeSelectProps) {
  return (
    <div>
      <Label htmlFor="message-type">Message Type</Label>
      <Select 
        value={messageType} 
        onValueChange={onMessageTypeChange}
      >
        <SelectTrigger id="message-type">
          <SelectValue placeholder="Select message type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sms">SMS</SelectItem>
          <SelectItem value="scheduled-sms">Scheduled SMS</SelectItem>
          <SelectItem value="email">Email</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
