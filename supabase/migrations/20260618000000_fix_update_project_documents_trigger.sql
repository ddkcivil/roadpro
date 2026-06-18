CREATE OR REPLACE FUNCTION public.update_project_documents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.update_project_documents_updated_at() OWNER TO postgres;

CREATE OR REPLACE TRIGGER tr_project_documents_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_documents_updated_at();

GRANT ALL ON FUNCTION public.update_project_documents_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_project_documents_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_project_documents_updated_at() TO service_role;