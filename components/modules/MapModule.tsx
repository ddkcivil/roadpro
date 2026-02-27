import React from 'react';
import { Project } from '../../types'; // Assuming Project type is needed
import { cn } from '~/lib/utils'; // Utility for conditional class names

interface MapModuleProps {
  currentProject: Project | undefined;
  settings: any; // Assuming settings might be needed for map config, though not explicitly used yet
}

const MapModule: React.FC<MapModuleProps> = ({ currentProject, settings }) => {
  // Extract location data if available
  const mapLocation = currentProject?.location;

  // Basic placeholder for map display.
  // In a real app, this would integrate a mapping library (e.g., Leaflet, Google Maps)
  const renderMap = () => {
    if (mapLocation) {
      // Example: Using a conceptual representation or a static map image URL
      // For a real interactive map, you'd use a library here.
      // For simplicity, we'll show a placeholder message with location info.
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-lg overflow-hidden">
          <div className="text-center p-4">
            <h3 className="text-lg font-semibold text-primary mb-2">Project Location:</h3>
            <p className="text-muted-foreground font-medium">{mapLocation}</p>
            <p className="text-sm text-gray-600 mt-2">Map visualization coming soon!</p>
            {/* You could add an iframe for a static map or a placeholder image here */}
          </div>
        </div>
      );
    } else {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
          <p className="text-muted-foreground">No location data available for this project.</p>
        </div>
      );
    }
  };

  return (
    <div className={cn(
      "flex flex-col p-4 border rounded-lg shadow-sm h-full min-h-[400px] overflow-hidden",
      "bg-background text-foreground" // Standard app background/text colors
    )}>
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-xl font-bold text-primary">Site Location Overview</h2>
          <p className="text-sm text-muted-foreground">Visualizing project site and key geographical data.</p>
        </div>
        {/* Add any map controls or info buttons here if needed */}
      </div>
      <div className="flex-1 relative"> {/* Make sure this div can contain the map */}
        {renderMap()}
      </div>
    </div>
  );
};

export default MapModule;