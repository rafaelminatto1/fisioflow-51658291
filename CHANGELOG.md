# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Security documentation (SECURITY.md)
- Contributing guidelines (CONTRIBUTING.md)
- Enhanced caching strategies in CI/CD workflows
- Patient advanced filters component
- Patient analytics dashboard
- Patient CRUD hooks and components

### Changed
- Upgraded @testing-library/react to v16 for better React 18 compatibility
- Improved Vercel deployment configuration with security headers
- Enhanced test configuration with threads pool
- Optimized build process with 4GB heap allocation

### Fixed
- Removed exposed Supabase credentials from vercel.json
- Fixed AIAssistantPanel test imports
- Resolved import issues with useDebounce hook consolidation

### Security
- **CRITICAL**: Removed hardcoded Supabase credentials from vercel.json
- Added Referrer-Policy and Permissions-Policy headers
- Added cache-control headers for static assets

## [1.0.0] - 2025-01-15

### Added
- Complete patient management system
- Advanced SOAP notes system
- Exercise library with prescription capabilities
- Real-time scheduling with conflict detection
- Analytics dashboard with patient metrics
- LGPD-compliant data handling
- Row Level Security (RLS) on all tables
- PWA support with offline capabilities
- Multi-role authentication system

### Changed
- Migrated to TypeScript strict mode
- Upgraded to React 18
- Improved database query optimization
- Enhanced performance with lazy loading

### Security
- Implemented RLS policies for all tables
- Added JWT token rotation
- Encrypted sensitive data at rest
- TLS 1.3 for all communications
- Audit logging for all critical operations

## [0.9.0] - 2024-12-01

### Added
- Initial patient CRUD operations
- Basic SOAP notes
- Exercise library
- Simple scheduling system
- Authentication with Supabase

---

For versioning, we use:
- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality additions
- **PATCH**: Backwards-compatible bug fixes
