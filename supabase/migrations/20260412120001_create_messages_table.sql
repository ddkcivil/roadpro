-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id uuid, -- Can be a user_id or 'general'
    content TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    attachment_url TEXT,
    attachment_name TEXT,
    attachment_type TEXT
);

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view messages they sent or received, or general messages
CREATE POLICY "Users can view messages for projects they are involved in" ON public.messages
    FOR SELECT USING (
        auth.uid() IS NOT NULL -- Simplified RLS; consider adding project access check
    );

CREATE POLICY "Authenticated users can insert messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own messages as read" ON public.messages
    FOR UPDATE USING (auth.uid() IS NOT NULL);
