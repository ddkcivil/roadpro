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
    
    expect(screen.getByText('+12%')).toBeInTheDocument();
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('renders shimmer when loading', () => {
    render(
      <StatCard 
        title="Loading Card" 
        value="0" 
        icon={HardHat} 
        color="info" 
        isLoading={true} 
      />
    );
    
    // Check for shimmer elements using data-testid
    const shimmers = screen.getAllByTestId('shimmer');
    expect(shimmers.length).toBeGreaterThan(0);
  });
});
