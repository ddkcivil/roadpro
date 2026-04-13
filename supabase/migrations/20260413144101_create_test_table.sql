-- Create a simple test table
CREATE TABLE IF NOT EXISTS public.test_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.test_table ENABLE ROW LEVEL SECURITY;

-- Allow public access for testing purposes
CREATE POLICY "Allow public read/write" ON public.test_table
  FOR ALL
  USING (true)
  WITH CHECK (true);
