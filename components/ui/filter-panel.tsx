import React from 'react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { X, Filter } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from '~/components/ui/dropdown-menu';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterGroup {
  id: string;
  title: string;
  options: FilterOption[];
}

interface FilterPanelProps {
  groups: FilterGroup[];
  selectedFilters: Record<string, string[]>;
  onFilterChange: (groupId: string, value: string) => void;
  onClearGroup: (groupId: string) => void;
  onClearAll: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  groups,
  selectedFilters,
  onFilterChange,
  onClearGroup,
  onClearAll
}) => {
  const activeCount = Object.values(selectedFilters).flat().length;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-10 border-dashed">
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-sm px-1 font-normal lg:hidden">
                {activeCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuLabel>Filter by</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {groups.map((group) => (
            <React.Fragment key={group.id}>
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground ml-2">
                {group.title}
              </DropdownMenuLabel>
              {group.options.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selectedFilters[group.id]?.includes(option.value)}
                  onCheckedChange={() => onFilterChange(group.id, option.value)}
                >
                  {option.label}
                </MenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
            </React.Fragment>
          ))}
          {activeCount > 0 && (
            <Button 
              variant="ghost" 
              className="w-full justify-center text-xs font-normal" 
              onClick={onClearAll}
            >
              Clear all filters
            </Button>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          selectedFilters[group.id]?.map((val) => (
            <Badge key={`${group.id}-${val}`} variant="secondary" className="h-7 px-2 flex items-center gap-1">
              <span className="text-muted-foreground">{group.title}:</span>
              {group.options.find(o => o.value === val)?.label || val}
              <button 
                onClick={() => onFilterChange(group.id, val)}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ))}
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearAll} className="h-7 px-2 text-xs">
            Reset
          </Button>
        )}
      </div>
    </div>
  );
};
