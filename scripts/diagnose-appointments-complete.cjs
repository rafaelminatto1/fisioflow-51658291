#!/usr/bin/env node

/**
 * Complete Appointments Diagnostic Script
 * 
 * This script performs a comprehensive check of:
 * 1. Firestore connection and data
 * 2. User profile and organization_id
 * 3. Appointments collection structure
 * 4. Data format validation
 * 5. Production vs Development environment
 */

const admin = require('firebase-admin');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

async function main() {
  try {
    section('🔍 FisioFlow Appointments Diagnostic');

    // Initialize Firebase Admin
    log('\n📦 Initializing Firebase Admin SDK...', 'cyan');
    
    const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    const db = admin.firestore();
    log('✅ Firebase Admin initialized', 'green');

    // Step 1: Check user profile
    section('👤 Step 1: Checking User Profile');
    
    const userEmail = 'rafael.minatto@yahoo.com.br';
    log(`Looking for user: ${userEmail}`, 'cyan');
    
    const profilesSnapshot = await db.collection('profiles')
      .where('email', '==', userEmail)
      .limit(1)
      .get();

    if (profilesSnapshot.empty) {
      log('❌ User profile not found!', 'red');
      log('Please check if the email is correct', 'yellow');
      process.exit(1);
    }

    const profileDoc = profilesSnapshot.docs[0];
    const profileData = profileDoc.data();
    
    log(`✅ User profile found: ${profileDoc.id}`, 'green');
    log(`   Name: ${profileData.name || 'N/A'}`, 'cyan');
    log(`   Email: ${profileData.email}`, 'cyan');
    log(`   Organization ID: ${profileData.organization_id || 'NOT SET'}`, profileData.organization_id ? 'green' : 'red');
    log(`   Role: ${profileData.role || 'N/A'}`, 'cyan');

    if (!profileData.organization_id) {
      log('\n❌ PROBLEM FOUND: User has no organization_id!', 'red');
      log('This is why appointments are not loading.', 'yellow');
      log('\nTo fix this, run:', 'cyan');
      log('  node scripts/fix-organization-id.js', 'bright');
      process.exit(1);
    }

    const organizationId = profileData.organization_id;

    // Step 2: Check appointments collection
    section('📅 Step 2: Checking Appointments Collection');
    
    log(`Querying appointments for organization: ${organizationId}`, 'cyan');
    
    const appointmentsSnapshot = await db.collection('appointments')
      .where('organization_id', '==', organizationId)
      .limit(10)
      .get();

    log(`\n📊 Found ${appointmentsSnapshot.size} appointments`, appointmentsSnapshot.size > 0 ? 'green' : 'yellow');

    if (appointmentsSnapshot.empty) {
      log('\n⚠️  No appointments found for this organization', 'yellow');
      log('This could mean:', 'cyan');
      log('  1. No appointments have been created yet', 'cyan');
      log('  2. Appointments exist but have a different organization_id', 'cyan');
      log('  3. The organization_id in the profile is incorrect', 'cyan');
      
      // Check if there are any appointments at all
      const allAppointmentsSnapshot = await db.collection('appointments').limit(5).get();
      log(`\n📊 Total appointments in database: ${allAppointmentsSnapshot.size}`, 'cyan');
      
      if (!allAppointmentsSnapshot.empty) {
        log('\nSample appointment organization_ids:', 'cyan');
        allAppointmentsSnapshot.forEach((doc, index) => {
          const data = doc.data();
          log(`  ${index + 1}. ${data.organization_id || 'NO ORG ID'}`, 'yellow');
        });
      }
      
      process.exit(0);
    }

    // Step 3: Validate appointment data structure
    section('🔍 Step 3: Validating Appointment Data Structure');
    
    let validCount = 0;
    let invalidCount = 0;
    const issues = [];

    appointmentsSnapshot.forEach((doc, index) => {
      const data = doc.data();
      const docIssues = [];

      log(`\n📄 Appointment ${index + 1}: ${doc.id}`, 'cyan');
      log(`   Patient: ${data.patient_name || 'NO NAME'}`, data.patient_name ? 'green' : 'red');
      
      // Check required fields
      if (!data.patient_id) docIssues.push('Missing patient_id');
      if (!data.patient_name) docIssues.push('Missing patient_name');
      if (!data.date) docIssues.push('Missing date');
      if (!data.start_time) docIssues.push('Missing start_time');
      if (!data.organization_id) docIssues.push('Missing organization_id');

      // Check date format
      if (data.date) {
        const dateType = data.date.constructor.name;
        log(`   Date type: ${dateType}`, 'cyan');
        
        if (dateType === 'Timestamp') {
          const dateObj = data.date.toDate();
          log(`   Date value: ${dateObj.toISOString()}`, 'green');
        } else if (typeof data.date === 'string') {
          log(`   Date value: ${data.date}`, 'yellow');
          // Validate format YYYY-MM-DD
          if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
            docIssues.push('Invalid date format (should be YYYY-MM-DD)');
          }
        } else {
          docIssues.push('Invalid date type');
        }
      }

      // Check time format
      if (data.start_time) {
        log(`   Time: ${data.start_time}`, 'cyan');
        if (!/^\d{2}:\d{2}$/.test(data.start_time)) {
          docIssues.push('Invalid time format (should be HH:MM)');
        }
      }

      // Check status
      const validStatuses = ['agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'faltou'];
      if (data.status && !validStatuses.includes(data.status)) {
        docIssues.push(`Invalid status: ${data.status}`);
      }
      log(`   Status: ${data.status || 'NO STATUS'}`, data.status ? 'green' : 'yellow');

      // Check duration
      log(`   Duration: ${data.duration || 'NO DURATION'} min`, data.duration ? 'green' : 'yellow');

      if (docIssues.length === 0) {
        validCount++;
        log(`   ✅ Valid`, 'green');
      } else {
        invalidCount++;
        log(`   ❌ Issues found:`, 'red');
        docIssues.forEach(issue => log(`      - ${issue}`, 'red'));
        issues.push({ id: doc.id, issues: docIssues });
      }
    });

    // Step 4: Summary
    section('📊 Summary');
    
    log(`\n✅ Valid appointments: ${validCount}`, 'green');
    if (invalidCount > 0) {
      log(`❌ Invalid appointments: ${invalidCount}`, 'red');
      log('\nIssues found:', 'yellow');
      issues.forEach(({ id, issues }) => {
        log(`  ${id}:`, 'cyan');
        issues.forEach(issue => log(`    - ${issue}`, 'red'));
      });
    }

    // Step 5: Environment check
    section('🌍 Step 5: Environment Check');
    
    log('\nLocal Development:', 'cyan');
    log('  URL: http://localhost:5173', 'cyan');
    log('  Expected behavior: Should show appointments if organization_id is correct', 'cyan');
    
    log('\nProduction:', 'cyan');
    log('  Check your production URL', 'cyan');
    log('  Ensure environment variables are set correctly', 'cyan');
    log('  Verify CORS settings if using Cloud Functions', 'cyan');

    // Step 6: Recommendations
    section('💡 Recommendations');
    
    if (validCount > 0) {
      log('\n✅ Data looks good!', 'green');
      log('\nIf appointments are still not showing:', 'cyan');
      log('  1. Clear browser cache and reload', 'cyan');
      log('  2. Check browser console for errors', 'cyan');
      log('  3. Verify the ScheduleDiagnostics component output', 'cyan');
      log('  4. Check if CORS is blocking requests (look for CORS errors in console)', 'cyan');
      log('  5. Try logging out and logging back in', 'cyan');
    } else {
      log('\n⚠️  Data issues found', 'yellow');
      log('Please fix the issues listed above before proceeding', 'cyan');
    }

    log('\n✅ Diagnostic complete!', 'green');
    process.exit(0);

  } catch (error) {
    log('\n❌ Error during diagnostic:', 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
