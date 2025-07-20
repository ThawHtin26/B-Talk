-- Add call duration fields to messages table
ALTER TABLE messages 
ADD COLUMN call_duration INT NULL,
ADD COLUMN call_type VARCHAR(20) NULL,
ADD COLUMN call_status VARCHAR(20) NULL;

-- Add duration field to calls table
ALTER TABLE calls 
ADD COLUMN duration INT NULL;

-- Add index for better performance on call-related queries
CREATE INDEX idx_messages_call_type ON messages(call_type);
CREATE INDEX idx_messages_call_status ON messages(call_status);
CREATE INDEX idx_calls_duration ON calls(duration); 