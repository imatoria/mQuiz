-- Add foreign key constraints for announcements and messages tables

-- Add foreign key for announcements.creator_id to profiles.user_id
ALTER TABLE public.announcements
ADD CONSTRAINT announcements_creator_id_fkey 
FOREIGN KEY (creator_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add foreign key for messages.sender_id to profiles.user_id
ALTER TABLE public.messages
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add foreign key for messages.recipient_id to profiles.user_id
ALTER TABLE public.messages
ADD CONSTRAINT messages_recipient_id_fkey 
FOREIGN KEY (recipient_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;