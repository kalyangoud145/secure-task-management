# Architecture Overview

## NX Monorepo Layout and Rationale

This project uses the [NX](https://nx.dev/) monorepo approach to organize multiple applications and libraries in a single repository. The rationale for using NX includes:

- **Code Sharing:** Easily share code between backend, frontend, and libraries.
- **Consistent Tooling:** Unified build, test, and linting processes.
- **Scalability:** Supports growing teams and projects with clear boundaries.
- **Dependency Graph:** NX tracks dependencies for efficient builds and testing.

## Project Structure

```
apps/
  api/         # NestJS backend application
  dashboard/   # Angular frontend application
libs/
  data/        # Shared TypeScript interfaces & DTOs
  auth/        # Reusable RBAC logic and decorators
```

### apps/

- **api/**: Contains the NestJS backend, responsible for business logic, data access, and API endpoints.
- **dashboard/**: Contains the Angular frontend, responsible for user interface and client-side logic.

### libs/

- **data/**: Houses shared TypeScript interfaces and Data Transfer Objects (DTOs) used by both backend and frontend for type safety and consistency.
- **auth/**: Contains reusable authentication and Role-Based Access Control (RBAC) logic, including custom decorators and guards, to be used across applications.

## Shared Libraries/Modules Explanation

- **data**: Ensures both backend and frontend use the same data models, reducing duplication and errors.
- **auth**: Centralizes authentication and authorization logic, making it easy to apply consistent security policies across the monorepo.

## Access Control Implementation

### Roles, Permissions, and Organization Hierarchy

- **Roles** (Owner, Admin, Viewer) define the level of access a user has within an organization.
- **Permissions** (e.g., `create_task`, `edit_task`, `delete_task`, `view_task`) are assigned to roles, controlling what actions users can perform.
- **Organization Hierarchy**: Organizations can have parent-child relationships. Roles and permissions are scoped to organizations, allowing granular access control across organizational boundaries.

### JWT Authentication and Access Control Integration

- **JWT Auth**: Users authenticate via JWT tokens. The token payload includes user identity and role information.
- **Guards**: The backend uses guards (`JwtGuard`, `RolesGuard`) to enforce authentication and authorization:
  - `JwtGuard` verifies the JWT and attaches the user to the request.
  - `RolesGuard` checks if the user's role meets the required permissions for an endpoint, considering role hierarchy.
- **RBAC Logic**: Decorators (e.g., `@Roles('Admin')`) specify required roles for routes. The guard compares the user's role (from JWT) against these requirements.

---

## Data Model Explanation

The data model is designed to support secure, role-based task management across organizations with hierarchical relationships.

### Schema Overview

- **User**: Represents an individual with credentials, belongs to an organization, and is assigned a role.
- **Organization**: Supports parent-child hierarchy, grouping users and tasks.
- **Role**: Defines access level (Owner, Admin, Viewer) and is linked to permissions.
- **Permission**: Represents allowed actions (e.g., create_task, edit_task).
- **Task**: Assigned to a user and organization, includes fields for title, description, category, status, and order.
- **Role-Permission Mapping**: Roles are associated with multiple permissions via a join table.

### Entity Relationships

- A **User** belongs to one **Organization** and one **Role**.
- An **Organization** can have a parent and multiple children (hierarchy).
- A **Role** can have multiple **Permissions** (many-to-many).
- A **Task** is assigned to a **User** and an **Organization**.
- The **role_permissions_permission** join table links roles and permissions.

### ERD

![alt text](image-1.png)

---

## API Documentation

### Authentication

#### `POST /auth/login`
**Request:**
```json
{
  "email": "owner@org.com",
  "password": "pass"
}
```
**Response:**
```json
{
  "access_token": "JWT_TOKEN"
}
```

---

### Tasks

#### `POST /task`
Create a new task (Owner/Admin only).
**Request:**
```json
{
  "title": "New Task",
  "description": "Details...",
  "category": "Work",
  "status": "Todo",
  "order": 1
}
```
**Response:**
```json
{
  "id": 1,
  "title": "New Task",
  "status": "Todo",
  // ...other fields...
}
```

#### `GET /tasks`
List tasks (role-based).
**Response:**
```json
[
  {
    "id": 1,
    "title": "Sample Task",
    "status": "Todo"
    // ...other fields...
  }
]
```

#### `GET /tasks-by-categories`
List categories for user's tasks.
**Response:**
```json
["Work", "Personal"]
```

#### `PUT /task/:id/order`
Update task order (Owner/Admin only).
**Request:**
```json
{ "order": 2 }
```
**Response:**
```json
{ "success": true }
```

#### `PUT /task/:id/status`
Update task status (Owner/Admin only).
**Request:**
```json
{ "status": "Done" }
```
**Response:**
```json
{ "success": true }
```

#### `PUT /editTask/:id`
Edit a task (Owner/Admin only).
**Request:**
```json
{
  "title": "Updated Task",
  "description": "Updated details"
}
```
**Response:**
```json
{ "success": true }
```

#### `DELETE /deleteTask/:id`
Delete a task (Owner/Admin only).
**Response:**
```json
{ "success": true }
```

---

### Audit Log

#### `GET /audit-log`
Get audit log (Owner/Admin only).
**Response:**
```json
[
  {
    "action": "create_task",
    "user": "owner@org.com",
    "timestamp": "2024-06-01T12:00:00Z"
    // ...other fields...
  }
]
```

---

## Future Considerations

### Advanced Role Delegation

- Support for custom roles and dynamic permission assignment.
- Delegation of specific permissions to users for granular access control.
- Organization-level role inheritance and temporary role elevation.

### Production-Ready Security: JWT Refresh Tokens

- Implement JWT refresh tokens for secure, long-lived sessions.
- Store refresh tokens securely (e.g., HTTP-only cookies).
- Add endpoints for token renewal and revocation.
- Monitor token usage and implement rotation strategies.

### Scaling Permission Checks Efficiently

- Cache role-permission mappings in memory or use distributed caching (e.g., Redis) to reduce database lookups.
- Batch permission checks for bulk operations.
- Use indexed queries and denormalized tables for fast lookups in large organizations.
- Consider policy engines  for complex, dynamic access rules.

---
