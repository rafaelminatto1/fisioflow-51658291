# Inngest Integration - FisioFlow

## Overview

Inngest is now integrated into FisioFlow for reliable background job processing, workflow orchestration, and scheduled tasks.

## Features

- **Automatic Retries**: Failed operations are retried with exponential backoff
- **Cron Scheduling**: Built-in scheduling for recurring tasks
- **Idempotent Operations**: Safe to run workflows multiple times
- **Real-time Monitoring**: Track workflow execution in the Inngest dashboard
- **Preview Environments**: Full support for Vercel preview deployments

## Workflows

### Cron Jobs (Scheduled)

| Workflow | Schedule | Description |
|----------|----------|-------------|
| `fisioflow-daily-cleanup` | 3:00 AM daily | Cleans up expired data (tokens, logs, sessions) |
| `fisioflow-birthday-messages` | 9:00 AM daily | Sends birthday wishes to patients |
| `fisioflow-daily-reports` | 8:00 AM daily | Generates daily reports for therapists |
| `fisioflow-weekly-summary` | 9:00 AM Monday | Sends weekly summary reports |
| `fisioflow-expiring-vouchers` | 10:00 AM daily | Reminds about vouchers expiring in 7 days |
| `fisioflow-data-integrity` | Every 6 hours | Checks for orphaned records |

### Event-Driven Workflows

| Workflow | Trigger Event | Description |
|----------|---------------|-------------|
| `fisioflow-send-notification` | `notification/send` | Sends single notification (email/WhatsApp/push) |
| `fisioflow-send-email` | `email/send` | Sends email via Resend |
| `fisioflow-send-whatsapp` | `whatsapp/send` | Sends WhatsApp message |
| `fisioflow-appointment-reminder` | `appointment/reminder` | Sends appointment reminders |
| `fisioflow-ai-patient-insights` | `ai/patient.insights` | Generates AI-powered patient insights |

## Usage

### Sending Events from Your Code

```typescript
import { InngestHelpers } from '@/lib/inngest/helpers';

// Send a notification
await InngestHelpers.sendNotification({
  userId: 'user-123',
  organizationId: 'org-456',
  type: 'email',
  to: 'patient@example.com',
  subject: 'Appointment Reminder',
  body: '<p>You have an appointment tomorrow at 10:00 AM</p>',
});

// Send WhatsApp message
await InngestHelpers.sendWhatsApp({
  to: '+5511999999999',
  message: 'Your appointment is confirmed!',
});

// Generate AI insights for a patient
await InngestHelpers.generatePatientInsights({
  patientId: 'patient-123',
  organizationId: 'org-456',
});
```

### Using the Inngest Client Directly

```typescript
import { inngest } from '@/lib/inngest/client';
import { Events } from '@/lib/inngest/types';

// Send a custom event
await inngest.send({
  name: Events.APPOINTMENT_CREATED,
  data: {
    appointmentId: 'apt-123',
    patientId: 'patient-123',
    organizationId: 'org-456',
  },
});
```

## Environment Variables

Add these to your `.env` file:

```bash
# Inngest Configuration (automatically set by Vercel integration)
INNGEST_KEY=your-inngest-key
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# Development mode - uses Inngest Dev Server locally
INNGEST_DEV=http://localhost:8288
```

## Local Development

### Option 1: Using Inngest Dev Server

1. Install the Inngest CLI:

```bash
npm install -g inngest-cli
```

2. Start the dev server:

```bash
inngest dev
```

3. Run your app as normal:

```bash
pnpm dev
```

### Option 2: Without Dev Server (Production Mode)

Inngest will connect directly to the cloud using `INNGEST_KEY`. No local setup needed.

## Vercel Integration

After installing the Inngest integration from the Vercel marketplace:

1. The `INNGEST_KEY` is automatically set in your environment
2. Your workflows are automatically deployed
3. The Inngest dashboard is available at `https://app.inngest.com`

## Monitoring

View your workflows at:
- Development: `http://localhost:8288` (when using dev server)
- Production: `https://app.inngest.com`

## Migration from Old Cron Routes

The old Vercel cron routes in `/api/crons/*` are still active but can be gradually migrated:

1. Remove the cron entry from `vercel.json`
2. Delete the old route file
3. The Inngest workflow will handle the scheduling

## File Structure

```
src/
├── lib/inngest/
│   ├── client.ts       # Inngest client configuration
│   ├── types.ts        # Event types and interfaces
│   ├── helpers.ts      # Convenience functions
│   ├── serve.ts        # API route handler
│   └── README.md       # This file
└── inngest/workflows/  # Workflow implementations
    ├── cleanup.ts
    ├── birthdays.ts
    ├── daily-reports.ts
    ├── weekly-summary.ts
    ├── expiring-vouchers.ts
    ├── data-integrity.ts
    ├── notifications.ts
    ├── email.ts
    ├── whatsapp.ts
    ├── appointments.ts
    └── ai-insights.ts
```

## Troubleshooting

### Workflows not running

1. Check the INNGEST_KEY is set correctly
2. Verify the Inngest serve route is accessible at `/api/inngest`
3. Check the Inngest dashboard for function registration

### Local development issues

1. Ensure the Inngest dev server is running: `inngest dev`
2. Check `INNGEST_DEV` environment variable is set
3. Verify your app is making requests to `http://localhost:8288`

### Timeouts

For long-running operations, increase the `maxDuration` in your function:

```typescript
inngest.createFunction(
  { maxDuration: '5m' }, // 5 minutes
  { event: 'my/event' },
  async ({ step }) => {
    // Your long-running code
  }
);
```
