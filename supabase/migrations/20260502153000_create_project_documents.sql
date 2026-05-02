-- Migration: Create project_documents and document_versions tables
-- Description: Supports the new file upload and document management system

-- 1. Create project_documents table
CREATE TABLE IF NOT EXISTS public.project_documents (
  id text PRIMARY KEY,
  project_id text REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  folder text,
  tags text[] DEFAULT '{}',
  subject text,
  ref_no text,
  size text,
  type text,
  status text DEFAULT 'Active',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create document_versions table
CREATE TABLE IF NOT EXISTS public.document_versions (
  id text PRIMARY KEY,
  doc_id text REFERENCES public.project_documents(id) ON DELETE CASCADE,
  blob_url text NOT NULL,
  version_num integer NOT NULL,
  size bigint,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 3. Add indexes
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON public.project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc_id ON public.document_versions(doc_id);

-- 4. Enable RLS
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Allow all authenticated users to view documents
CREATE POLICY "Authenticated users can view documents" ON public.project_documents
FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to view versions
CREATE POLICY "Authenticated users can view document versions" ON public.document_versions
FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to insert (validation handled in app)
CREATE POLICY "Authenticated users can insert documents" ON public.project_documents
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can insert document versions" ON public.document_versions
FOR INSERT TO authenticated WITH CHECK (true);

-- Allow admins and project managers to update/delete (app logic also enforces this)
CREATE POLICY "Authorized users can update documents" ON public.project_documents
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('ADMIN', 'PROJECT MANAGER', 'MANAGER', 'PROJECT_MANAGER')
  )
);

CREATE POLICY "Authorized users can delete documents" ON public.project_documents
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('ADMIN', 'PROJECT MANAGER', 'MANAGER', 'PROJECT_MANAGER')
  )
);

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_project_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_project_documents_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION update_project_documents_updated_at();

-- 7. Verify
SELECT 'Document tables created successfully' as status;
