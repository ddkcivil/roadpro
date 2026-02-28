# RoadMaster Pro - Developer Documentation

This document outlines the technical architecture, patterns, and standards used in the RoadMaster Pro project.

## Architecture Overview

RoadMaster Pro is a modern React application built with TypeScript, Vite, and Tailwind CSS. It follows a modular architecture designed for scalability and maintainability.

### Key Technologies
- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons.
- **UI Components**: Radix UI (via Shadcn UI), Framer Motion (animations).
- **State Management**: Custom hooks using `useReducer` and `usePersistedReducer` for persistence.
- **API Layer**: Custom `RealApiService` with caching, retries, and offline fallback.
- **Offline Support**: PWA with Service Workers and IndexedDB (`idb-keyval`).
- **Testing**: Vitest (Unit/Integration), React Testing Library (Components), Playwright (E2E).

## State Management

We avoid heavy global state libraries in favor of scoped custom hooks:

- **`useAuth`**: Manages authentication state, JWT tokens (encrypted in localStorage), and user permissions.
- **`useProjects`**: Handles the project portfolio, selection, and CRUD operations with optimistic updates.
- **`useSettings`**: Manages system-wide configuration and user preferences.
- **`usePersistedReducer`**: A custom hook that wraps `useReducer` to automatically sync state with `localStorage`.

## Service Layer

Services are located in `src/services/` and are organized by concern:

- **`api/realApiService.ts`**: The primary data gateway. Implements:
  - Resource-specific caching (TTL).
  - Automatic token refresh on 401 errors.
  - X-CSRF-Token injection for mutating requests.
  - Offline fallback to IndexedDB.
- **`api/syncService.ts`**: Manages a queue of pending mutations made while offline.
- **`analytics/reportingService.ts`**: Handles complex calculations like EVM, resource forecasting, and geospatial clustering.
- **`error/errorReportingService.ts`**: Captures runtime errors and persists them for diagnostic review.

## Security Standards

1. **Authentication**: JWT-based. Tokens are stored in `httpOnly` cookies by the backend but also managed in frontend state for UI reactivity.
2. **CSRF**: Double-submit cookie pattern implemented for all POST/PUT/DELETE requests.
3. **Data Protection**: Sensitive data in `localStorage` (like JWTs) is encrypted using `crypto-js`.
4. **Input Sanitization**: All user-provided data is sanitized via `DOMPurify` before being processed or saved.
5. **RBAC**: Granular permission checks using the `HasPermission` and `ProtectedTab` components.

## UI & UX Patterns

- **Loading States**: Use `Skeleton` or `Shimmer` components for all data-fetching views.
- **Transitions**: Wrap main view switches in `PageTransition` (Framer Motion).
- **Forms**: 
  - Use `zod` for schema validation.
  - Display errors using the `ErrorSummary` component.
  - Ensure all forms support keyboard navigation (Tab flow and Enter to submit).
- **Icons**: Use the consolidated `icons/index.ts` barrel file or `LazyIcon` for dynamic/rarely-used icons.

## Development Workflow

### Adding a New Module
1. Define any new types in `types.ts`.
2. Create the module component in `components/modules/`.
3. Add the navigation item to `config/navigation.ts`.
4. Wrap the module in `App.tsx` within a `PageTransition` and `ErrorBoundary`.
5. Apply RBAC using `ProtectedTab` if necessary.

### Testing
- **Unit Tests**: Place `.test.ts` files alongside the implementation.
- **Component Tests**: Use RTL to verify UI behavior.
- **E2E Tests**: Add new scenarios to the `e2e/` directory.

Run tests: `npm test` or `npm run test:e2e`.
