# RoadMaster Pro - Component Documentation

This document describes the reusable components and patterns used in the RoadMaster Pro application.

## UI Components (`components/ui`)

### `DataTable`
A high-performance table component powered by `@tanstack/react-table`.
- **Features**: Sorting, filtering (global search), pagination, column visibility.
- **Usage**:
  ```tsx
  import { DataTable } from '~/components/ui/data-table';
  
  <DataTable 
    columns={columns} 
    data={data} 
    searchKey="name" 
    placeholder="Filter items..." 
  />
  ```

### `EmptyState`
A consistent way to display empty collections or no search results.
- **Usage**:
  ```tsx
  import { EmptyState } from '~/components/ui/empty-state';
  import { Database } from 'lucide-react';
  
  <EmptyState
    icon={Database}
    title="No projects found"
    description="Get started by creating your first project."
    actionLabel="Create Project"
    onAction={handleCreate}
  />
  ```

### `SearchInput`
A debounced search input component.
- **Usage**:
  ```tsx
  import { SearchInput } from '~/components/ui/search-input';
  
  <SearchInput 
    value={searchTerm} 
    onChange={setSearchTerm} 
    delay={500} 
  />
  ```

### `Shimmer`
A sophisticated loading placeholder with a sliding highlight animation.
- **Usage**:
  ```tsx
  import { Shimmer } from '~/components/ui/shimmer';
  
  <Shimmer className="h-8 w-full" />
  ```

### `ErrorSummary`
A component to display multiple validation errors, typically used at the top of forms.
- **Usage**:
  ```tsx
  import { ErrorSummary } from '~/components/ui/error-summary';
  
  <ErrorSummary errors={errors} onClear={() => setErrors({})} />
  ```

## Core Layout Components (`components/core`)

### `AppHeader`
The top navigation bar containing project identity, global search, sync status, theme toggle, and user profile.
- **Features**: Responsive design, offline indicator, sync status tracking.

### `AppSidebar`
The collapsible navigation sidebar.
- **Features**: RBAC-aware navigation groups, active state tracking, smooth transitions.

### `ProjectSelector`
The initial view for selecting an infrastructure project.
- **Features**: Memoized for performance, handles loading and error states for project fetching.

## RBAC Components (`components/common`)

### `HasPermission`
Conditionally renders content based on user permissions.
- **Usage**:
  ```tsx
  import { HasPermission } from '~/components/common/HasPermission';
  import { Permission } from '~/types';
  
  <HasPermission permission={Permission.PROJECT_CREATE}>
    <Button>New Project</Button>
  </HasPermission>
  ```

### `ProtectedTab`
A wrapper for main application views that require specific permissions.
- **Usage**:
  ```tsx
  <ProtectedTab permission={Permission.USER_READ}>
    <UserManagement />
  </ProtectedTab>
  ```

## Navigation Patterns

### `PageTransition`
Provides smooth fade-and-slide transitions between views using `framer-motion`.
- **Usage**: Wrapped around the main content area in `App.tsx`.
