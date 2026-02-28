# RoadMaster Pro - API Documentation

This directory contains the Serverless Functions (Vercel) that power the RoadMaster Pro backend.

## Architecture

The API is built using Node.js and TypeScript, designed to run as serverless functions.

- **Framework**: Express-style handlers for Vercel Node.js runtime.
- **Database**: MongoDB (via Mongoose).
- **Authentication**: JWT (JSON Web Tokens) with a refresh mechanism.
- **Middleware**:
  - `withErrorHandler`: Unified error catching and formatting.
  - `withAuth`: JWT verification and user context injection.

## Authentication Flow

1. **Login** (`POST /api/auth/login`): Validates credentials and returns a JWT.
2. **Authorization**: Include the token in the header: `Authorization: Bearer <token>`.
3. **Refresh** (`POST /api/auth/refresh`): Exchange a valid (even if near expiry) token for a new one.

## Core Endpoints

### Projects
- `GET /api/projects`: List all projects.
- `GET /api/projects/[id]`: Get project details.
- `POST /api/projects`: Create a new project (Admin/PM only).
- `PUT /api/projects/[id]`: Update project (Admin/PM only).
- `DELETE /api/projects/[id]`: Delete project (Admin only).

### Users
- `GET /api/users`: List all users (Admin only).
- `POST /api/users`: Create user (Admin only).
- `PUT /api/users/[id]`: Update user.

### Pending Registrations
- `GET /api/pending-registrations`: List requests awaiting approval.
- `POST /api/pending-registrations`: Submit a new registration request.
- `POST /api/pending-registrations/[id]/approve`: Approve and create user.

## Security Features

- **RBAC**: Role-Based Access Control enforced at the API level.
- **JWT**: Stateless authentication with short-lived tokens.
- **Password Hashing**: Uses `bcrypt` for secure storage.
- **Conflict Resolution**: `updatedAt` timestamps are used to detect stale updates.

## Local Development

To run the API locally with hot-reloading:
```bash
vercel dev --listen 3000
```
Ensure your `.env` file contains the `MONGODB_URI` and `JWT_SECRET`.
