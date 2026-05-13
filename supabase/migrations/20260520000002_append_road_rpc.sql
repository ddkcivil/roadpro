-- Migration: Add append_road_to_project RPC function
-- This function is called by api/roads.ts but doesn't exist in the database

CREATE OR REPLACE FUNCTION public.append_road_to_project(
    project_id UUID,
    new_road_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_id UUID;
BEGIN
    -- Update the project's roads array by appending the new road
    UPDATE public.projects
    SET 
        roads = COALESCE(roads, '[]'::jsonb) || new_road_data,
        updated_at = NOW()
    WHERE id = project_id
    RETURNING id INTO updated_id;

    -- If no row was updated, the project doesn't exist
    IF updated_id IS NULL THEN
        RAISE EXCEPTION 'Project not found: %', project_id;
    END IF;

    RETURN updated_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.append_road_to_project(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_road_to_project(UUID, JSONB) TO service_role;
