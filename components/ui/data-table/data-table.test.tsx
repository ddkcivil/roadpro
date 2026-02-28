import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTable } from './data-table';
import React from 'react';
import { ColumnDef } from '@tanstack/react-table';

interface TestData {
  id: string;
  name: string;
  status: string;
}

const columns: ColumnDef<TestData>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
];

const data: TestData[] = [
  { id: '1', name: 'Project Alpha', status: 'Active' },
  { id: '2', name: 'Project Beta', status: 'Pending' },
  { id: '3', name: 'Project Gamma', status: 'Completed' },
];

describe('DataTable', () => {
  it('renders table headers and data correctly', () => {
    render(<DataTable columns={columns} data={data} />);
    
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });

  it('filters data when search input is used', () => {
    render(<DataTable columns={columns} data={data} searchKey="name" />);
    
    const searchInput = screen.getByPlaceholderText('Filter...');
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });
    
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Project Beta')).not.toBeInTheDocument();
  });

  it('shows "No results" when no data matches filter', () => {
    render(<DataTable columns={columns} data={data} searchKey="name" />);
    
    const searchInput = screen.getByPlaceholderText('Filter...');
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } });
    
    expect(screen.getByText('No results.')).toBeInTheDocument();
  });

  it('renders correct number of rows selected', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText(/0 of 3 row\(s\) selected/i)).toBeInTheDocument();
  });
});
