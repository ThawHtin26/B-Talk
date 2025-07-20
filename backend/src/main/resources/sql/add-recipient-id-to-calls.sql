-- Add recipient_id column to calls table
-- This migration adds the recipient_id column to support private calls

-- For MySQL
ALTER TABLE calls ADD COLUMN recipient_id VARCHAR(36) NULL;

-- For PostgreSQL (if using PostgreSQL)
-- ALTER TABLE calls ADD COLUMN recipient_id UUID NULL;

-- Add index for better query performance
CREATE INDEX idx_calls_recipient_id ON calls(recipient_id);

-- Update existing calls to have a default recipient_id if needed
-- This is optional and depends on your data requirements
-- UPDATE calls SET recipient_id = caller_id WHERE recipient_id IS NULL; 