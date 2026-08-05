
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Paperclip, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Attachment {
  filename: string;
  url: string;
}

interface AttachmentUploadProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
}

export function AttachmentUpload({ attachments, onAttachmentsChange }: AttachmentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      const newFiles = Array.from(e.target.files);
      
      try {
        const uploadPromises = newFiles.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          const { data, error } = await supabase.storage
            .from('email-attachments')
            .upload(fileName, file);

          if (error) {
            console.error('Upload error:', error);
            throw error;
          }

          // Get the public URL for the uploaded file
          const { data: urlData } = supabase.storage
            .from('email-attachments')
            .getPublicUrl(fileName);

          return {
            filename: file.name,
            url: urlData.publicUrl
          };
        });

        const newAttachments = await Promise.all(uploadPromises);
        onAttachmentsChange([...attachments, ...newAttachments]);
        
        toast({
          title: "Files Uploaded",
          description: `${newFiles.length} file(s) uploaded successfully.`,
        });
      } catch (error) {
        console.error('Error uploading files:', error);
        toast({
          title: "Upload Error",
          description: "Failed to upload files. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        // Reset the input
        e.target.value = '';
      }
    }
  };

  const removeAttachment = async (index: number) => {
    const attachment = attachments[index];
    
    try {
      // Extract filename from URL to delete from storage
      const urlParts = attachment.url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const { error } = await supabase.storage
        .from('email-attachments')
        .remove([fileName]);

      if (error) {
        console.error('Error deleting file:', error);
      }
    } catch (error) {
      console.error('Error removing attachment:', error);
    }
    
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  return (
    <div>
      <Label htmlFor="attachments">Attachments</Label>
      <div className="mt-1">
        <Input
          id="attachments"
          type="file"
          multiple
          onChange={handleAttachmentChange}
          className="mb-2"
          disabled={isUploading}
        />
        {isUploading && (
          <p className="text-sm text-muted-foreground mb-2">Uploading files...</p>
        )}
        {attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                <div className="flex items-center">
                  <Paperclip className="h-4 w-4 mr-2" />
                  <span className="text-sm">{attachment.filename}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(index)}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Add files to attach to your email message
      </p>
    </div>
  );
}
