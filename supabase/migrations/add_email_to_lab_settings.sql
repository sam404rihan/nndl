-- Add email column to lab_settings table
ALTER TABLE lab_settings 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN lab_settings.email IS 'Laboratory contact email address for reports and communications';
