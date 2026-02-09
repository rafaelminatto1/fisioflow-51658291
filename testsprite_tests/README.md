# TestSprite Testing Guide for FisioFlow

## Setup

TestSprite MCP server is configured at: `~/.claude/plugins/external_plugins/testsprite/.mcp.json`

### API Key
Your TestSprite API key is configured in the MCP settings.

## Running Tests

### Option 1: Via Claude Code (Recommended)
Simply ask Claude to run TestSprite tests:
```
"Run TestSprite tests for the dashboard"
"Run all TestSprite tests"
"Run visual regression tests with TestSprite"
```

### Option 2: Via TestSprite Dashboard
Visit [https://dashboard.testsprite.com](https://dashboard.testsprite.com) to:
- View test results
- Manage test suites
- Configure visual regression baselines
- Review accessibility reports

## Test Files

| Test File | Description |
|-----------|-------------|
| `TC001_Patient_Registration_with_Valid_Data.py` | Patient registration flow |
| `TC004_Create_Appointment_Without_Conflict.py` | Appointment scheduling |
| `TC006_Reschedule_Appointment_using_Drag_and_Drop.py` | Drag & drop rescheduling |
| `TC007_Register_Clinical_Session.py` | Clinical session with SOAP notes |
| `TC011_Exercise_Library_Browsing.py` | Exercise library |
| `TC001_post_api_ai_chat_endpoint.py` | AI Chat API |
| `testsprite_frontend_test_plan.json` | Full frontend test plan |

## Environment

- **Base URL**: `http://localhost:8084`
- **Dev Server**: Start with `pnpm run dev`
- **Test Environment Variables**:
  - `VITE_DISABLE_ABLY=1` (Disable real-time features during testing)

## Test Categories

### 1. Functional Tests
- Patient registration and management
- Appointment scheduling and conflicts
- Clinical session documentation
- Exercise library management

### 2. Visual Regression Tests
- Dashboard layout
- Calendar views (day/week/month)
- Patient forms
- Financial reports

### 3. API Tests
- Authentication endpoints
- AI chat endpoint
- AI insights endpoint
- Patient listing

### 4. Accessibility Tests
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader compatibility
- Color contrast

## Creating New Tests

### JSON Test Plan Format
```json
{
  "id": "TC015",
  "title": "Test Name",
  "description": "What this test verifies",
  "category": "functional",
  "priority": "High",
  "steps": [
    {
      "type": "action",
      "description": "Navigate to page"
    },
    {
      "type": "assertion",
      "description": "Expected outcome"
    }
  ]
}
```

### Python Test Format
```python
import requests

def test_feature():
    base_url = "http://localhost:8084"
    # Your test code here
    assert condition, "Error message"
```

## CI/CD Integration

Add to your CI pipeline:
```bash
pnpm run dev &
sleep 10
# Run TestSprite tests via MCP or CLI
pnpm run test:e2e
```

## Troubleshooting

### Tests failing on localhost
- Ensure dev server is running: `pnpm run dev`
- Check port 8084 is available
- Verify `VITE_DISABLE_ABLY=1` is set

### Visual regression failures
- Review changes in TestSprite dashboard
- Accept or reject baseline updates
- Check for dynamic content (dates, timers)

### MCP not working
- Restart Claude Code
- Verify API key in `~/.claude/plugins/external_plugins/testsprite/.mcp.json`
- Check TestSprite service status
