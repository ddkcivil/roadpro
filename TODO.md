# Enhancements for Road Data Management

This document outlines tasks for improving the handling of multiple road alignments, structures, and associated data within the project.

## Phase 1: Data Modeling & Types

- **Task 1.1:** Define comprehensive TypeScript interfaces for `Road`, `Alignment`, `Structure`, and `ChainagePoint` in `roadTypes.ts`.
  - `Road` should include:
    - `id`: string (unique identifier for the road)
    - `name`: string (e.g., "Main Road", "Alignment B")
    - `geometry`: Array of `Point` objects defining the primary path of the road.
    - `chainageOffset`: number (meters) - optional, if a road segment doesn't start at 0+000.
    - `alignments`: Array of `Alignment` objects associated with this road.
    - `structures`: Array of `Structure` objects associated with this road.
  - `Alignment` should include:
    - `id`: string (unique identifier for the alignment)
    - `roadId`: string (references the parent `Road.id`)
    - `type`: string (e.g., "Pavement", "Drainage", "Footpath", "Kerb")
    - `chainagePoints`: Array of `ChainagePoint` objects defining the geometry of this specific alignment.
  - `Structure` should include:
    - `id`: string (unique identifier for the structure)
    - `roadId`: string (references the parent `Road.id`)
    - `type`: string (e.g., "Culvert", "Box Culvert", "Bridge")
    - `chainage`: number (meters) - the primary location of the structure along the road.
    - `geometry`: Could be a `Point`, `LineString`, or `Polygon` defining the structure's spatial extent.
    - `properties`: An object for additional attributes (e.g., dimensions, material, flow rate).
  - `ChainagePoint` should include:
    - `chainage`: number (meters from the start of the road's geometry)
    - `point`: `Point` object (lat, lng, alt)
  - `Point` should include:
    - `lat`: number
    - `lng`: number
    - `alt`?: number (optional elevation)

- **Task 1.2:** Implement chainage utility functions:
  - `formatChainage(meters: number): string`: Converts meters to "X+YYY" format (e.g., 3020 -> "3+020").
  - `parseChainage(chainageString: string): number`: Converts "X+YYY" string to meters.
  - Ensure these functions handle edge cases and potential errors gracefully.

## Phase 2: KML Data Ingestion & Parsing

- **Task 2.1:** Enhance `kmlParser.ts` to identify and parse different road entities from KML files.
  - Implement logic to differentiate between primary road geometry, specific alignment paths (e.g., placemarks for pavement, drainage), and structure placemarks.
  - Adapt parsing to map KML features/placemarks to the new `Road`, `Alignment`, and `Structure` interfaces.
- **Task 2.2:** Implement chainage calculation during KML parsing.
  - If chainage is not explicitly defined in KML (e.g., via custom attributes or specific placemark names), calculate cumulative distance along the linestring to derive chainage for points and structures.
  - Handle potential gaps or discontinuities in KML linestrings gracefully.
- **Task 2.3:** Associate parsed data with `roadId` and `alignmentId` where applicable during parsing.

## Phase 3: Data Management & Core Logic

- **Task 3.1:** Develop a `RoadDataManager` class or service to manage road data.
  - Implement CRUD (Create, Read, Update, Delete) operations for `Road`, `Alignment`, and `Structure` objects.
  - Consider persistence mechanisms if data needs to be saved beyond the current session.
- **Task 3.2:** Implement data validation for chainage.
  - Ensure chainage values are monotonically increasing/decreasing within a single road's primary geometry and its associated alignments.
  - Validate that structure chainages fall within the defined bounds of the road's geometry.
- **Task 3.3:** Implement querying capabilities.
  - Create functions to retrieve roads, alignments, or structures based on ID, name, type, or chainage range.

## Phase 4: User Interface & Visualization (Conceptual - for future implementation)

- **Task 4.1:** Design UI components for selecting and viewing multiple roads in the application.
- **Task 4.2:** Develop detailed views to display information about a selected road, including its various alignments and structures, using the formatted chainage.
- **Task 4.3:** Create intuitive input forms for adding/editing road data, structures, and alignments, ensuring user-friendly chainage input.
- **Task 4.4:** Integrate with a mapping library (e.g., Leaflet, Mapbox) to visualize road geometries, alignment paths, and structure locations.
- **Task 4.5:** Implement toggles to control the visibility of different alignment types and structures on the map.

## Phase 5: Testing & Refinement

- **Task 5.1:** Write unit tests for all new data models, parsing logic, chainage utility functions, and data management operations.
- **Task 5.2:** Develop integration tests to ensure the end-to-end flow from KML parsing to data management works correctly.
- **Task 5.3:** Conduct thorough manual testing with diverse KML datasets to identify and fix parsing or logic errors.
