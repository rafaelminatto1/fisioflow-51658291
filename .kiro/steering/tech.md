# FisioFlow - Technology Stack

## Frontend Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.x with SWC for fast compilation
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context + TanStack Query for server state
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form with Zod validation

## Backend & Database

- **Backend**: Supabase (PostgreSQL + Auth + Real-time + Storage)
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **Database**: PostgreSQL with real-time subscriptions
- **File Storage**: Supabase Storage with 50MB file limit

## Key Libraries

- **Data Fetching**: @tanstack/react-query for caching and synchronization
- **Date Handling**: date-fns for date manipulation
- **Charts**: Recharts for analytics dashboards
- **PDF Generation**: jsPDF for reports
- **File Handling**: react-dropzone for uploads
- **Notifications**: Sonner for toast notifications
- **Icons**: Lucide React

## Development Tools

- **TypeScript**: Strict configuration with path aliases (@/*)
- **ESLint**: Code linting with React-specific rules
- **Testing**: Vitest + Testing Library for unit/integration tests
- **Performance**: Lazy loading, code splitting, and optimized builds

## Common Commands

```bash
# Development
npm run dev              # Start dev server on port 8080
npm run build           # Production build
npm run build:dev       # Development build
npm run preview         # Preview production build

# Testing & Quality
npm run test            # Run tests with Vitest
npm run test:ui         # Run tests with UI
npm run test:coverage   # Run tests with coverage
npm run lint            # ESLint code checking

# Supabase (if using local development)
supabase start          # Start local Supabase
supabase stop           # Stop local Supabase
supabase db reset       # Reset local database
```

## Build Configuration

- **Target**: ESNext with modern browser support
- **Code Splitting**: Vendor, UI, and Supabase chunks
- **Optimization**: Tree shaking, minification, console removal in production
- **Assets**: Optimized with 1MB chunk size warning limit

## Environment Variables

Required environment variables (see .env.example):
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- Optional: Analytics, feature flags, and API configuration