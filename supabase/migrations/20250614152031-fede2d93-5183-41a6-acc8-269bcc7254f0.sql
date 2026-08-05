
-- Create a storage bucket for email attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', true);

-- Create policy to allow anyone to upload files to the email-attachments bucket
CREATE POLICY "Allow public uploads to email attachments bucket"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'email-attachments');

-- Create policy to allow anyone to view files in the email-attachments bucket
CREATE POLICY "Allow public access to email attachments bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'email-attachments');

-- Create policy to allow anyone to delete files from the email-attachments bucket
CREATE POLICY "Allow public delete from email attachments bucket"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'email-attachments');
