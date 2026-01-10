# Vercel Preview Deployments for FisioFlow

## Overview

Vercel Preview Deployments are automatically enabled for your project. Every Pull Request creates a unique preview URL with its own infrastructure.

## Features

- **Automatic Deployment**: Each PR gets its own deployment
- **Unique URLs**: Shareable URLs for testing and review
- **Isolated Environment**: Each preview has its own resources
- **Auto-Expiration**: Deployments expire after branch deletion
- **Zero Configuration**: Works out of the box with GitHub integration

## How It Works

### Creating a Preview Deployment

1. Create a new Git branch:
```bash
git checkout -b feature/new-dashboard
```

2. Make changes and commit:
```bash
git add .
git commit -m "Add new dashboard"
git push origin feature/new-dashboard
```

3. Create Pull Request in GitHub:
```bash
# Via GitHub UI or CLI
gh pr create --title "New Dashboard" --body "Implementing new dashboard UI"
```

4. Vercel automatically creates a preview deployment at:
```
https://fisioflow-lovable-git-username-feature-new-dashboard.rafael-minattos-projects.vercel.app
```

### Preview Deployment URL Format

```
https://<project-name>-git-<username>-<branch-name>.<vercel-domain>.vercel.app
```

Example:
```
https://fisioflow-lovable-git-rafael-feature-new-dashboard.rafael-minattos-projects.vercel.app
```

## Environment Variables

Preview deployments inherit environment variables from your production configuration.

### Preview-Specific Variables

You can override variables for preview deployments:

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add variable with scope: **Preview**
3. Example: Set `VITE_APP_ENV=preview` for preview deployments only

### Branch-Specific Variables

For specific branches:

1. Go to Environment Variables
2. Select **Specific Branch**
3. Enter branch name: `feature/new-dashboard`
4. Add variable

## Integration with Supabase Branching

Preview deployments work seamlessly with Supabase Branching:

```bash
# Create feature branch
git checkout -b feature/new-dashboard

# Create corresponding Supabase branch
supabase branches create feature-new-dashboard

# Push code and create PR
git push origin feature/new-dashboard
gh pr create
```

Vercel preview will automatically use the Supabase branch database if configured.

## Best Practices

### 1. Naming Conventions

Use clear, descriptive branch names:
- `feature/new-dashboard` ✅
- `bugfix/fix-login-issue` ✅
- `feature/newDashboard2` ❌ (avoid numbers)
- `fix/login-12345` ✅ (include issue number)

### 2. PR Descriptions

Include in your PR description:
```
## Preview URL
https://fisioflow-lovable-git-rafael-feature-new-dashboard.rafael-minattos-projects.vercel.app

## Changes
- Added new dashboard UI
- Improved performance
- Fixed navigation bug

## Testing Checklist
- [ ] Dashboard loads correctly
- [ ] All buttons work
- [ ] Responsive on mobile
```

### 3. Testing Workflow

1. **Developer Testing**
   - Deploy preview
   - Test all new features
   - Test edge cases
   - Verify no regressions

2. **Team Review**
   - Share preview URL with team
   - Collect feedback
   - Make fixes

3. **Stakeholder Demo**
   - Use preview URL for demos
   - Get product feedback
   - Iterate before merge

### 4. Commenting on Preview Deployments

Vercel bot comments on PRs with:
- Deployment status
- Preview URL
- Build logs
- Deployment duration

## Advanced Features

### Deployment Protection

Protect preview deployments with password:

1. Vercel Dashboard → Settings → Protection
2. Enable **Preview Deployment Protection**
3. Set password

### Automatic Comments

Configure Vercel to comment deployment status:

1. Settings → Git → Integration
2. Enable **Automatic Preview Comments**
3. Customize comment template

### Deployment Notifications

Get notified on deployment:

1. Settings → Notifications
2. Add Slack, Discord, or email
3. Configure events (success, failure)

### Speed Insights

Preview deployments include Vercel Speed Insights:
- Core Web Vitals
- Performance metrics
- Bundle analysis

### Analytics

Preview deployments use separate analytics:
- Track preview-specific traffic
- Test analytics events
- Verify tracking setup

## Troubleshooting

### Preview Deployment Fails

1. Check build logs in Vercel Dashboard
2. Verify all environment variables are set
3. Check for TypeScript errors
4. Ensure build passes locally

### Preview Shows Old Code

1. Check recent commits in PR
2. Verify cache is cleared
3. Hard refresh browser
4. Check deployment timestamp

### Environment Variables Missing

1. Go to Environment Variables in Vercel Dashboard
2. Ensure variables include **Preview** scope
3. Redeploy if needed

### Preview URL Not Accessible

1. Check deployment status in PR comments
2. Verify branch exists
3. Check Vercel Dashboard for errors
4. Ensure deployment completed successfully

## CI/CD Integration

### GitHub Actions

```yaml
name: Preview Deployment Test

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Get preview URL
        id: preview
        run: |
          URL="https://fisioflow-lovable-${{ github.head_ref }}.vercel.app"
          echo "url=$URL" >> $GITHUB_OUTPUT

      - name: Run tests on preview
        run: |
          npm test
          # Run E2E tests against preview URL
          npm run test:e2e -- --baseUrl ${{ steps.preview.outputs.url }}
```

### Automated Testing

Test preview deployments automatically:

```typescript
// tests/preview.spec.ts
import { test, expect } from '@playwright/test';

const PREVIEW_URL = process.env.PREVIEW_URL || 'http://localhost:5173';

test('Preview deployment loads', async ({ page }) => {
  await page.goto(PREVIEW_URL);
  await expect(page).toHaveTitle(/FisioFlow/);
});

test('New feature works on preview', async ({ page }) => {
  await page.goto(`${PREVIEW_URL}/new-feature`);
  await expect(page.locator('h1')).toContainText('New Feature');
});
```

## Monitoring

### Dashboard

View all preview deployments:
```
Vercel Dashboard → Deployments → Filter by Preview
```

### Metrics

Track preview deployments:
- Number of deployments
- Average build time
- Success rate
- Resource usage

## Cost

Preview deployments are **included** in your Vercel Pro plan:
- Unlimited preview deployments
- No additional cost
- Automatic cleanup after branch deletion

## Best Practice Checklist

For each preview deployment:

- [ ] Branch name is clear and descriptive
- [ ] PR description includes preview URL
- [ ] All environment variables configured
- [ ] Testing checklist included
- [ ] Team members notified
- [ ] Performance reviewed
- [ ] Analytics verified
- [ ] Mobile tested
- [ ] Accessibility checked
- [ ] Security reviewed

## Example Workflow

```bash
# 1. Create branch
git checkout -b feature/patient-portal

# 2. Make changes
# ... edit files ...

# 3. Commit and push
git add .
git commit -m "Add patient portal feature"
git push origin feature/patient-portal

# 4. Create PR
gh pr create --title "Patient Portal" --body "Implements patient self-service portal"

# 5. Wait for preview deployment
# Vercel bot comments with URL

# 6. Test on preview
# https://fisioflow-lovable-git-rafael-feature-patient-portal.rafael-minattos-projects.vercel.app

# 7. Share with team
# "Preview ready for review: [URL]"

# 8. Address feedback
# ... make changes ...

# 9. Final approval and merge
gh pr merge

# 10. Preview automatically expires after branch deletion
```

## Resources

- [Vercel Preview Deployments Docs](https://vercel.com/docs/deployments/preview-deployments)
- [Vercel Git Integration](https://vercel.com/docs/git-integration)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
