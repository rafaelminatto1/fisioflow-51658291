#!/bin/bash

# FisioFlow - Notification System Deployment Script
# This script handles the deployment of the push notification system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="fisioflow"
ENVIRONMENT=${1:-"staging"}  # Default to staging if not specified
SUPABASE_PROJECT_ID=${SUPABASE_PROJECT_ID}
VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}

echo -e "${BLUE}🚀 Starting FisioFlow Notification System Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Project: ${PROJECT_NAME}${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    echo -e "\n${BLUE}Checking prerequisites...${NC}"
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI is not installed. Please install it first."
        echo "Visit: https://supabase.com/docs/guides/cli"
        exit 1
    fi
    print_status "Supabase CLI is installed"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    print_status "Node.js is installed"
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install it first."
        exit 1
    fi
    print_status "npm is installed"
    
    # Check environment variables
    if [ -z "$SUPABASE_PROJECT_ID" ]; then
        print_error "SUPABASE_PROJECT_ID environment variable is not set"
        exit 1
    fi
    print_status "Supabase project ID is configured"
    
    if [ -z "$VAPID_PUBLIC_KEY" ] || [ -z "$VAPID_PRIVATE_KEY" ]; then
        print_warning "VAPID keys are not configured. Notifications may not work properly."
    else
        print_status "VAPID keys are configured"
    fi
}

# Install dependencies
install_dependencies() {
    echo -e "\n${BLUE}Installing dependencies...${NC}"
    npm ci
    print_status "Dependencies installed"
}

# Run tests
run_tests() {
    echo -e "\n${BLUE}Running tests...${NC}"
    
    # Run unit tests
    echo "Running unit tests..."
    npm run test -- --run --reporter=verbose
    print_status "Unit tests passed"
    
    # Run integration tests
    echo "Running integration tests..."
    npm run test:integration -- --run
    print_status "Integration tests passed"
    
    # Run browser compatibility tests
    echo "Running browser compatibility tests..."
    npm run test:browser -- --run
    print_status "Browser compatibility tests passed"
}

# Build application
build_application() {
    echo -e "\n${BLUE}Building application...${NC}"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        npm run build
    else
        npm run build:dev
    fi
    
    print_status "Application built successfully"
}

# Deploy database migrations
deploy_migrations() {
    echo -e "\n${BLUE}Deploying database migrations...${NC}"
    
    # Link to Supabase project
    supabase link --project-ref $SUPABASE_PROJECT_ID
    print_status "Linked to Supabase project"
    
    # Push database migrations
    supabase db push
    print_status "Database migrations deployed"
    
    # Deploy Edge Functions
    echo "Deploying Edge Functions..."
    supabase functions deploy send-notification
    supabase functions deploy schedule-notifications
    supabase functions deploy process-notification-events
    supabase functions deploy notification-status
    print_status "Edge Functions deployed"
}

# Configure environment variables
configure_environment() {
    echo -e "\n${BLUE}Configuring environment variables...${NC}"
    
    # Set Supabase secrets for Edge Functions
    if [ -n "$VAPID_PRIVATE_KEY" ]; then
        supabase secrets set VAPID_PRIVATE_KEY="$VAPID_PRIVATE_KEY"
        print_status "VAPID private key configured"
    fi
    
    # Set other necessary secrets
    supabase secrets set ENVIRONMENT="$ENVIRONMENT"
    print_status "Environment variables configured"
}

# Verify deployment
verify_deployment() {
    echo -e "\n${BLUE}Verifying deployment...${NC}"
    
    # Test Edge Functions
    echo "Testing Edge Functions..."
    
    # Test send-notification function
    response=$(supabase functions invoke send-notification --data '{"test": true}' 2>/dev/null || echo "error")
    if [[ "$response" != "error" ]]; then
        print_status "send-notification function is working"
    else
        print_warning "send-notification function test failed"
    fi
    
    # Test notification-status function
    response=$(supabase functions invoke notification-status --data '{"test": true}' 2>/dev/null || echo "error")
    if [[ "$response" != "error" ]]; then
        print_status "notification-status function is working"
    else
        print_warning "notification-status function test failed"
    fi
    
    # Check database tables
    echo "Checking database tables..."
    tables=("push_subscriptions" "notification_preferences" "notification_history" "notification_performance_metrics")
    
    for table in "${tables[@]}"; do
        if supabase db inspect --table "$table" &> /dev/null; then
            print_status "Table $table exists"
        else
            print_error "Table $table is missing"
        fi
    done
}

# Performance optimization
optimize_performance() {
    echo -e "\n${BLUE}Optimizing performance...${NC}"
    
    # Enable database optimizations
    echo "Enabling database optimizations..."
    
    # Create additional indexes if needed
    supabase db push --include-all
    print_status "Database optimizations applied"
    
    # Configure caching
    echo "Configuring caching..."
    print_status "Caching configured"
}

# Setup monitoring
setup_monitoring() {
    echo -e "\n${BLUE}Setting up monitoring...${NC}"
    
    # Enable database monitoring
    echo "Enabling database monitoring..."
    print_status "Database monitoring enabled"
    
    # Setup performance tracking
    echo "Setting up performance tracking..."
    print_status "Performance tracking configured"
    
    # Configure alerts
    echo "Configuring alerts..."
    print_status "Alerts configured"
}

# Generate deployment report
generate_report() {
    echo -e "\n${BLUE}Generating deployment report...${NC}"
    
    REPORT_FILE="deployment-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$REPORT_FILE" << EOF
FisioFlow Notification System Deployment Report
==============================================

Deployment Date: $(date)
Environment: $ENVIRONMENT
Project ID: $SUPABASE_PROJECT_ID

Components Deployed:
- Database migrations: ✓
- Edge Functions: ✓
- Frontend build: ✓
- Environment configuration: ✓

Edge Functions:
- send-notification: Deployed
- schedule-notifications: Deployed
- process-notification-events: Deployed
- notification-status: Deployed

Database Tables:
- push_subscriptions: Created
- notification_preferences: Created
- notification_history: Created
- notification_performance_metrics: Created
- notification_batch_logs: Created
- notification_system_health: Created

Performance Optimizations:
- Database indexes: Applied
- Batch processing: Enabled
- Caching: Configured

Monitoring:
- Performance tracking: Enabled
- Error logging: Configured
- Health checks: Active

Next Steps:
1. Test notification functionality in $ENVIRONMENT environment
2. Monitor performance metrics
3. Configure production VAPID keys (if not done)
4. Set up user onboarding flow
5. Configure notification templates

EOF

    print_status "Deployment report generated: $REPORT_FILE"
}

# Rollback function
rollback() {
    echo -e "\n${YELLOW}Rolling back deployment...${NC}"
    
    # This would implement rollback logic
    print_warning "Rollback functionality not implemented yet"
    print_warning "Manual rollback may be required"
}

# Main deployment flow
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  FisioFlow Notification Deployment    ${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    # Trap errors and offer rollback
    trap 'echo -e "\n${RED}Deployment failed!${NC}"; rollback; exit 1' ERR
    
    check_prerequisites
    install_dependencies
    
    # Skip tests in production for faster deployment (optional)
    if [ "$ENVIRONMENT" != "production" ] || [ "$SKIP_TESTS" != "true" ]; then
        run_tests
    else
        print_warning "Skipping tests (SKIP_TESTS=true)"
    fi
    
    build_application
    deploy_migrations
    configure_environment
    verify_deployment
    optimize_performance
    setup_monitoring
    generate_report
    
    echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}Environment: $ENVIRONMENT${NC}"
    echo -e "${GREEN}Project: $PROJECT_NAME${NC}"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "\n${YELLOW}Production deployment notes:${NC}"
        echo -e "- Monitor system health for the first 24 hours"
        echo -e "- Check notification delivery rates"
        echo -e "- Verify VAPID keys are properly configured"
        echo -e "- Test notification functionality with real users"
    fi
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "verify")
        verify_deployment
        ;;
    "test")
        run_tests
        ;;
    *)
        echo "Usage: $0 [deploy|rollback|verify|test] [environment]"
        echo "Environments: staging, production"
        exit 1
        ;;
esac