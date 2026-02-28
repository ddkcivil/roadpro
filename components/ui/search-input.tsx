import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { useDebounce } from '~/hooks/useDebounce';

interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value = '',
  onChange,
  placeholder = "Search...",
  delay = 500,
  className = ""
}) => {
  const [innerValue, setInnerValue] = useState(value);
  const debouncedValue = useDebounce(innerValue, delay);

  useEffect(() => {
    setInnerValue(value);
  }, [value]);

  useEffect(() => {
    onChange(debouncedValue);
  }, [debouncedValue, onChange]);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={innerValue}
        onChange={(e) => setInnerValue(e.target.value)}
        className="pl-10 pr-10 h-10 shadow-sm transition-all focus:ring-2 focus:ring-primary/20"
        placeholder={placeholder}
      />
      {innerValue && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent text-muted-foreground hover:text-foreground"
          onClick={() => {
            setInnerValue('');
            onChange('');
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
