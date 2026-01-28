# CODEBASE.md - System Map & Dependencies

## 🗺️ System Overview
FisioFlow is a hybrid ecosystem leveraging Firebase and Google Cloud SQL. It is organized as a monorepo with high emphasis on end-to-end type safety.

## 📁 Repository Structure

### Apps
- **Professional Web (Root)**: Core Vite + React application for physical therapists.
- **[patient-ios](file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/apps/patient-ios)**: Expo App for patients to track exercises and appointments.
- **[professional-ios](file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/apps/professional-ios)**: Expo App for therapists for mobile management.

### Packages
- **[shared-types](file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/packages/shared-types)**: Source of truth for all Typescript interfaces.
- **[shared-api](file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/packages/shared-api)**: Unified API clients for Firestore and Cloud Functions.
- **[shared-ui](file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/packages/shared-ui)**: Design system components (Liquid Surgical).
- **[shared-utils](file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/packages/shared-utils)**: Common validation and formatting logic.

### Infrastructure
- **[functions](file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/functions)**: Firebase Cloud Functions (Typescript).
- **[drizzle](file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/drizzle)**: Database migrations and schema generation.

## 🔗 Key Dependencies & Flow
1. **Auth**: Firebase Authentication (all apps).
2. **Database**: 
   - Relational: [Cloud SQL (Postgres)](file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/scripts/migration/cloudsql-schema.sql)
   - Real-time/NoSQL: [Firestore](file:///home/rafael/antigravity/fisioflow/fisioflow-51658291/firestore.rules)
3. **Real-time**: [Ably](https://ably.com) for event publishing from Functions to Client.
4. **AI**: Google Vertex AI (Gemini Pro) for clinical intelligence.

## ⚠️ Critical Files
- `firebase.json`: Infrastructure and environment variables.
- `drizzle.config.ts`: Database connection and schema path.
- `package.json` (Root): Monorepo and workspace management.
- `src/server/db/schema/`: Source of truth for relational models.
