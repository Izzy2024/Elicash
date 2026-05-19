# AGENTS.md - EliCash Development Guidelines

## Overview
EliCash is a Progressive Web App (PWA) for informal loan management built with:
- **Frontend**: Astro 6 + React 18 + Tailwind CSS V4 + TypeScript
- **Backend**: Node.js + Express + TypeScript + Prisma ORM + SQLite
- **Architecture**: Full-stack with JWT authentication, multi-tenant support

## Build & Development Commands

### Frontend (Astro + React)
```bash
# Development server
cd frontend && npm run dev
# Build for production
cd frontend && npm run build
# Preview production build
cd frontend && npm run preview
```

### Backend (Node.js + Express + Prisma)
```bash
# Development server
cd backend && npx tsx src/index.ts
# Generate Prisma client
cd backend && npx prisma generate
# Run database migrations
cd backend && npx prisma migrate dev
# Reset database
cd backend && npx prisma migrate reset
# View database
cd backend && npx prisma studio
```

### Full Stack Development
```bash
# Terminal 1 - Backend
cd backend && npx tsx src/index.ts
# Terminal 2 - Frontend
cd frontend && npm run dev
# Terminal 3 - Database (optional)
cd backend && npx prisma studio
```

### Database Seeding
```bash
# Seed with test data
cd backend && npx tsx prisma/seed.ts
```

## Testing Commands

### Running Tests
```bash
# Frontend tests (when implemented)
cd frontend && npm run test
cd frontend && npm run test:watch
cd frontend && npm run test:coverage

# Backend tests (when implemented)
cd backend && npm run test
cd backend && npm run test:unit
cd backend && npm run test:integration

# Run single test file
npm run test -- path/to/test.spec.ts
npm run test -- --testNamePattern="specific test name"
```

### Test File Patterns
- Frontend: `*.test.tsx`, `*.spec.tsx`, `__tests__/*.tsx`
- Backend: `*.test.ts`, `*.spec.ts`, `__tests__/*.ts`
- E2E: `e2e/*.spec.ts`

## Code Quality & Linting

### TypeScript Configuration
- **Frontend**: Extends `astro/tsconfigs/strict` with React JSX
- **Backend**: Strict mode enabled with advanced type checking
- Use `type` imports for React types: `import type { FormEvent } from 'react'`

### Code Style Guidelines

#### Imports
```typescript
// Backend - Group imports by type
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

// Frontend - React imports first, then local components
import { useState, type FormEvent } from 'react';
import SwipeToEnter from './SwipeToEnter';
```

#### Naming Conventions
- **Files**: PascalCase for components (`LoginScreen.tsx`), camelCase for utilities (`loan.service.ts`)
- **Variables**: camelCase (`userId`, `fechaVencimiento`)
- **Constants**: UPPER_SNAKE_CASE (`JWT_SECRET`, `API_URL`)
- **Database**: Snake case in Prisma schema (`fecha_vencimiento`, `monto_cuota`)
- **Spanish variables**: Use Spanish for domain-specific terms (`cliente`, `prestamo`, `cobros`)

#### Components (React)
```tsx
// Function component with TypeScript
export default function ComponentName() {
  const [state, setState] = useState(initialValue);

  const handleEvent = async () => {
    // Implementation
  };

  return (
    <div className="tailwind-classes">
      {/* JSX content */}
    </div>
  );
}
```

#### Controllers (Backend)
```typescript
export const controllerFunction = async (req: Request, res: Response) => {
  try {
    // Business logic
    res.json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error message' });
  }
};
```

#### Error Handling
```typescript
// Frontend
try {
  const response = await fetch('/api/endpoint');
  if (!response.ok) throw new Error('Request failed');
  const data = await response.json();
} catch (error) {
  console.error('Error:', error);
  setError('User-friendly error message');
}

// Backend
try {
  // Operation
} catch (error) {
  console.error('Operation failed:', error);
  res.status(500).json({ message: 'Internal server error' });
}
```

### Tailwind CSS Guidelines
- Use utility-first approach
- Custom gradients and animations via inline styles when needed
- Responsive design: `md:`, `lg:` prefixes
- Dark mode ready (structure for future implementation)

### Database & Prisma
- Use transactions for multi-table operations
- Include relations in queries when needed
- Use UUID for primary keys
- Follow Prisma naming conventions
- SQLite for development, PostgreSQL for production

## Project Structure

```
EliCash/
├── frontend/                    # Astro + React PWA
│   ├── src/
│   │   ├── components/          # React components (.tsx)
│   │   ├── layouts/             # Astro layouts (.astro)
│   │   ├── pages/               # Astro pages (.astro)
│   │   └── styles/              # Global styles
│   └── public/                  # Static assets
│
└── backend/                     # Node.js + Express API
    ├── src/
    │   ├── controllers/         # Route handlers
    │   ├── middleware/          # Express middleware
    │   ├── routes/              # API routes
    │   ├── services/            # Business logic
    │   └── generated/           # Prisma client
    └── prisma/
        ├── schema.prisma        # Database schema
        ├── migrations/          # DB migrations
        └── seed.ts              # Test data
```

## API Patterns

### Authentication
- JWT tokens stored in httpOnly cookies
- User data cached in localStorage for UI state
- Automatic redirect to `/login` when unauthenticated

### Response Format
```json
// Success
{ "data": {...}, "message": "Success message" }

// Error
{ "message": "Error description" }
```

### Error Codes
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid credentials)
- `404`: Not Found
- `500`: Internal Server Error

## Development Workflow

### Feature Development
1. Create feature branch from `main`
2. Implement backend API endpoints first
3. Add frontend components and pages
4. Test integration between frontend/backend
5. Update database schema if needed
6. Run full application test

### Database Changes
1. Update `schema.prisma`
2. Generate migration: `npx prisma migrate dev`
3. Update seed data if needed
4. Test with seeded data

### Deployment Considerations
- Environment variables for production
- Database adapter switch (SQLite → PostgreSQL)
- PWA service worker configuration
- Build optimization for production

## Security Guidelines

### Backend
- Input validation on all endpoints
- SQL injection prevention via Prisma
- Password hashing with bcryptjs
- JWT token expiration (7 days)
- CORS configuration
- Rate limiting (future implementation)

### Frontend
- Input sanitization
- XSS prevention via React
- Secure cookie handling
- Offline-first architecture considerations

## Performance Considerations

### Frontend
- React.lazy for code splitting
- Image optimization
- PWA caching strategies
- Minimize bundle size

### Backend
- Database query optimization
- Connection pooling (future with PostgreSQL)
- Response compression
- API rate limiting

## Testing Strategy

### Unit Tests
- Service layer functions
- Utility functions
- Component logic (when implemented)

### Integration Tests
- API endpoints
- Database operations
- Authentication flow

### E2E Tests
- User workflows (login → dashboard)
- Form submissions
- Navigation flows

## Future Migrations

### Planned Changes
- PostgreSQL migration from SQLite
- Supabase integration
- WhatsApp API integration
- Excel export functionality
- PDF contract generation
- Offline queue synchronization

### Breaking Changes to Consider
- Database adapter switch requires environment reconfiguration
- API endpoints may change with PostgreSQL features
- PWA offline capabilities expansion

---

*This document serves as a comprehensive guide for AI agents working on the EliCash codebase. Follow these guidelines to maintain consistency and quality across the project.*</content>
<parameter name="filePath">AGENTS.md