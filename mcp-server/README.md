# Fisioflow MCP Server

A Model Context Protocol (MCP) server for Fisioflow integration with Sentry monitoring.

## Features

### Patient Management
- **get_patient** - Retrieve patient information by ID
- **list_patients** - List all patients with pagination, search, and status filters
- **create_patient** - Create a new patient
- **update_patient** - Update existing patient information
- **search_patients** - Search patients by name, email, or other criteria

### Appointment Management
- **create_appointment** - Create a new appointment
- **get_appointment** - Get appointment information by ID
- **get_agenda** - Get agenda for date ranges
- **cancel_appointment** - Cancel an existing appointment

### Evolution Notes
- **get_evolution** - Get evolution notes for a patient
- **create_evolution** - Create a new evolution note

### Server Status
- **status** - Health check endpoint with server information

## Sentry Integration

The server includes Sentry monitoring for error tracking and performance monitoring.

### Configuration

Set environment variables to configure the server:

```bash
export API_BASE_URL="https://api.fisioflow.com/v2"
export SENTRY_DSN="https://49e42dcf09c352e2576de850a6806676@o4510069182955520.ingest.us.sentry.io/4510796159451136"
export ORGANIZATION_ID="your-organization-id"
```

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `API_BASE_URL` | Base URL for Fisioflow API | `https://api.fisioflow.com/v2` | No |
| `SENTRY_DSN` | Sentry DSN for error tracking | - | No |
| `ORGANIZATION_ID` | Default organization ID for queries | - | No |

## Installation

```bash
cd mcp-server
pnpm install
pnpm build
```

## Usage

### Direct Execution

```bash
# With Sentry monitoring
export API_BASE_URL="https://api.fisioflow.com/v2"
export SENTRY_DSN="https://49e42dcf09c352e2576de850a6806676@o4510069182955520.ingest.us.sentry.io/4510796159451136"
node dist/index.js
```

### With MCP Client Configuration

Add to your `mcp.json`:

```json
{
  "mcpServers": {
    "fisioflow": {
      "command": "node",
      "args": [
        "./mcp-server/dist/index.js"
      ],
      "env": {
        "API_BASE_URL": "https://api.fisioflow.com/v2",
        "SENTRY_DSN": "https://49e42dcf09c352e2576de850a6806676@o4510069182955520.ingest.us.sentry.io/4510796159451136"
      },
      "disabled": false,
      "autoApprove": [
        "get_patient",
        "list_patients",
        "create_patient",
        "update_patient",
        "create_appointment",
        "get_appointment",
        "cancel_appointment",
        "get_agenda",
        "get_evolution",
        "create_evolution",
        "search_patients",
        "status"
      ]
    }
  }
}
```

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_patient` | Retrieve patient information | `patientId` (string, required) |
| `list_patients` | List all patients | `limit` (number, optional), `offset` (number, optional), `search` (string, optional), `status` (string, optional) |
| `create_patient` | Create a new patient | `name` (string, required), `email` (string, optional), `phone` (string, optional), `cpf` (string, optional), `birth_date` (string, optional), `gender` (string, optional), `observations` (string, optional), `status` (string, optional) |
| `update_patient` | Update patient information | `patientId` (string, required), plus optional fields: `name`, `email`, `phone`, `status`, `progress`, `observations` |
| `create_appointment` | Create a new appointment | `patientId` (string, required), `date` (string, required), `startTime` (string, required), `duration` (number, optional, default 60), `type` (string, optional), `room` (string, optional), `notes` (string, optional) |
| `get_appointment` | Get appointment information | `appointmentId` (string, required) |
| `cancel_appointment` | Cancel an appointment | `appointmentId` (string, required), `reason` (string, optional) |
| `get_agenda` | Get agenda for date range | `startDate` (string, required), `endDate` (string, required), `limit` (number, optional) |
| `get_evolution` | Get evolution notes | `patientId` (string, required), `limit` (number, optional) |
| `create_evolution` | Create evolution note | `patientId` (string, required), `content` (string, required), `type` (string, optional), `tags` (array of strings, optional) |
| `search_patients` | Search patients | `query` (string, required), `limit` (number, optional) |
| `status` | Server health check | - |

## API Endpoints Used

The server connects to the following Fisioflow API endpoints:

- `GET /patients` - List patients
- `GET /patients/{id}` - Get patient by ID
- `POST /patients` - Create patient
- `PUT /patients/{id}` - Update patient
- `POST /appointments` - Create appointment
- `GET /appointments` - List appointments (agenda)
- `GET /appointments/{id}` - Get appointment by ID
- `POST /appointments/{id}/cancel` - Cancel appointment
- `GET /clinical/records` - List clinical/evolution records
- `POST /clinical/records` - Create clinical/evolution record

## Development

```bash
# Watch mode for development
pnpm run dev

# Build the project
pnpm run build

# Start the server
pnpm run start
```

## Error Handling

All errors are:
1. Logged to console with context
2. Automatically captured and sent to Sentry (if configured)
3. Returned as tool responses with `isError: true` flag

## License

MIT
