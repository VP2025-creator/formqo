-- Create a public bucket for form-related uploads (welcome screen images, file upload responses)
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-uploads', 'form-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read files from this bucket (public forms need to display images)
CREATE POLICY "Public read form uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'form-uploads');

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Auth users can upload form files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'form-uploads'
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Auth users can delete own uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'form-uploads'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anonymous uploads to form-responses subfolder (for respondents uploading files)
CREATE POLICY "Anyone can upload form responses"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'form-uploads'
  AND (storage.foldername(name))[1] = 'responses'
);