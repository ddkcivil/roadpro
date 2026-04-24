-- Fix missing schema causing API 500 errors
-- Add contractNo to projects (expected by frontend/types)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'contract_no'
    ) THEN
      ALTER TABLE public.projects ADD COLUMN contract_no VARCHAR(100);
    END IF;
  END IF;
END $$;

-- Create audit_logs table (missing, used by /api/audit)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    entity_name VARCHAR(255),
    severity VARCHAR(20) DEFAULT 'INFO',
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure profiles has required columns (status, last_seen)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN status VARCHAR(50) DEFAULT 'active';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_seen TIMESTAMPTZ;
  END IF;
END $$;

-- Ensure messages has required columns (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'read'
    ) THEN
      ALTER TABLE public.messages ADD COLUMN read BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'read_at'
    ) THEN
      ALTER TABLE public.messages ADD COLUMN read_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'attachment_url'
    ) THEN
      ALTER TABLE public.messages ADD COLUMN attachment_url TEXT;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'attachment_name'
    ) THEN
      ALTER TABLE public.messages ADD COLUMN attachment_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'attachment_type'
    ) THEN
      ALTER TABLE public.messages ADD COLUMN attachment_type VARCHAR(50);
    END IF;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'projects' AND indexname = 'idx_projects_contract_no') THEN
      CREATE INDEX idx_projects_contract_no ON public.projects(contract_no);
    END IF;
  END IF;
END $$;

-- Basic RLS policy for audit_logs (admin only read, authenticated insert)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Authenticated users can insert audit logs') THEN
        CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid()::text = user_id::text OR auth.role() = 'service_role');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Admins can read audit logs') THEN
        CREATE POLICY "Admins can read audit logs" ON public.audit_logs
            FOR SELECT TO authenticated
            USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN')));
    END IF;
END $$;

-- RLS for projects (owners + admins)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Users can view own projects') THEN
        CREATE POLICY "Users can view own projects" ON public.projects
            FOR SELECT TO authenticated
            USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN')));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Users can insert own projects') THEN
        CREATE POLICY "Users can insert own projects" ON public.projects
            FOR INSERT TO authenticated
            WITH CHECK (owner_id = auth.uid());
    END IF;
  END IF;
END $$;

SELECT 'Schema fixes applied successfully!' as status;
