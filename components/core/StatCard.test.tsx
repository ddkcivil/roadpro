import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatCard from './StatCard';
import { HardHat } from 'lucide-react';

describe('StatCard', () => {
  it('renders title and value correctly', () => {
    render(
      <StatCard 
        title="Total Projects" 
        value="12" 
        icon={HardHat} 
        color="primary" 
      />
    );
    
    expect(screen.getByText('Total Projects')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders trend when provided', () => {
    render(
      <StatCard 
        title="Revenue" 
        value="$50k" 
        icon={HardHat} 
        color="success" 
        trend="+12%" 
      />
    );
    
    // Use a function to match the text because of potential whitespace
    expect(screen.getByText((content, element) => {
        return content.includes('12%');
    })).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading', () => {
    render(
      <StatCard 
        title="Loading Card" 
        value="0" 
        icon={HardHat} 
        color="info" 
        isLoading={true} 
      />
    );
    
    // Check for animate-pulse elements which represent the loading skeleton
    const pulseElements = document.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });
});
