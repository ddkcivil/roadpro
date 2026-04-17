-- SQL schema definitions derived from Mongoose schemas in roadModels.ts

-- Table for roads
CREATE TABLE IF NOT EXISTS public.roads (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    chainage_offset NUMERIC,
    -- Storing array of points as JSONB for geometry
    geometry JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for alignments
CREATE TABLE IF NOT EXISTS public.alignments (
    id VARCHAR(255) PRIMARY KEY,
    road_id VARCHAR(255) NOT NULL REFERENCES public.roads(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Pavement', 'Drainage', 'Footpath', 'Kerb', 'service')),
    total_length NUMERIC,
    kml_data TEXT
);

-- Table for structures
CREATE TABLE IF NOT EXISTS public.structures (
    id VARCHAR(255) PRIMARY KEY,
    road_id VARCHAR(255) NOT NULL REFERENCES public.roads(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL CHECK (type IN ('Box Culvert', 'Pipe Culvert', 'Bridge', 'Retaining Wall', 'Abutment', 'Pier', 'Slab Culvert', 'Minor Bridge', 'Major Bridge', 'Drainage (Lined)', 'Drainage (Unlined)', 'Breast Wall', 'Pavement (Flexible)', 'Pavement (Rigid)', 'Footpath', 'Utility Duct', 'Street Light Base', 'Road Signal', 'Junction Box', 'Median Barrier', 'Pedestrian Guardrail', 'Bus Shelter', 'culvert', 'box-culvert', 'bridge', 'underpass')),
    name VARCHAR(255) NOT NULL,
    chainage VARCHAR(50) NOT NULL,
    distance NUMERIC NOT NULL,
    -- Storing structure geometry as JSONB
    geometry JSONB,
    -- Storing array of alignment IDs as text array
    alignments TEXT[],
    -- Storing flexible properties as JSONB
    properties JSONB
);

-- Table for chainage points, linked to alignments
CREATE TABLE IF NOT EXISTS public.chainage_points (
    -- Using SERIAL as a surrogate primary key since ChainagePointSchema didn't provide a distinct unique ID for a standalone table
    id SERIAL PRIMARY KEY, 
    alignment_id VARCHAR(255) NOT NULL REFERENCES public.alignments(id) ON DELETE CASCADE,
    chainage_id VARCHAR(50) NOT NULL, -- Original 'chainage' field, e.g., "0+000"
    distance NUMERIC NOT NULL,       -- distance in meters from start
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    alt NUMERIC
);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_alignments_road_id ON public.alignments(road_id);
CREATE INDEX IF NOT EXISTS idx_structures_road_id ON public.structures(road_id);
CREATE INDEX IF NOT EXISTS idx_chainage_points_alignment_id ON public.chainage_points(alignment_id);

-- Consider adding GIN index for JSONB columns if you plan to query within them extensively
-- CREATE INDEX IF NOT EXISTS idx_roads_geometry_gin ON public.roads USING GIN (geometry);
-- CREATE INDEX IF NOT EXISTS idx_structures_properties_gin ON public.structures USING GIN (properties);

-- Note on data types:
-- - VARCHAR(255) used for IDs and names, adjust length as needed.
-- - NUMERIC used for lengths and distances for precision.
-- - JSONB used for storing complex nested objects (geometry, properties) and arrays of simple objects (road.geometry).
-- - TEXT[] used for array of strings (structure.alignments).
-- - TEXT for KML data.
-- - TIMESTAMP WITH TIME ZONE for audit trails.
-- - CHECK constraints used for enum-like fields.
