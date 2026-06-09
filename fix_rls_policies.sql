DROP POLICY IF EXISTS "projects_select_permissive" ON projects;
DROP POLICY IF EXISTS "projects_insert_permissive" ON projects;
DROP POLICY IF EXISTS "projects_update_owner" ON projects;
DROP POLICY IF EXISTS "projects_delete_owner" ON projects;
CREATE POLICY "projects_select_permissive"
ON projects FOR SELECT
TO anon, authenticated
USING (true);
CREATE POLICY "projects_insert_permissive"
ON projects FOR INSERT
TO anon, authenticated
WITH CHECK (true);
CREATE POLICY "projects_update_owner"
ON projects FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR created_by IS NULL)
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "projects_delete_owner"
ON projects FOR DELETE
TO authenticated
USING (created_by = auth.uid());
GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;