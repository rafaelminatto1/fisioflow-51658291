/**
 * Browser Diagnostic Script
 * 
 * Execute este script no console do navegador (F12) na página /agenda
 * para diagnosticar problemas com os cards de agendamento.
 * 
 * COMO USAR:
 * 1. Abra http://localhost:5173/agenda
 * 2. Pressione F12 para abrir o DevTools
 * 3. Vá para a aba Console
 * 4. Copie e cole este script completo
 * 5. Pressione Enter
 */

(async function diagnosticAppointments() {
  console.log('%c🔍 FisioFlow Appointments Diagnostic', 'font-size: 20px; font-weight: bold; color: #3b82f6;');
  console.log('%c═══════════════════════════════════════════════════════════', 'color: #3b82f6;');
  
  const results = {
    timestamp: new Date().toISOString(),
    checks: [],
    errors: [],
    warnings: [],
    recommendations: []
  };

  function addCheck(name, status, details) {
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`\n${icon} ${name}`);
    if (details) {
      console.log(details);
    }
    results.checks.push({ name, status, details });
  }

  function addError(message) {
    console.error(`❌ ${message}`);
    results.errors.push(message);
  }

  function addWarning(message) {
    console.warn(`⚠️  ${message}`);
    results.warnings.push(message);
  }

  function addRecommendation(message) {
    console.info(`💡 ${message}`);
    results.recommendations.push(message);
  }

  try {
    // Check 1: React Query DevTools
    console.log('\n%c📊 Check 1: React Query State', 'font-size: 16px; font-weight: bold; color: #10b981;');
    
    try {
      // Try to access React Query cache
      const queryClient = window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__?.queryClient;
      
      if (queryClient) {
        const cache = queryClient.getQueryCache();
        const queries = cache.getAll();
        
        console.log(`Found ${queries.length} queries in cache`);
        
        // Find appointment queries
        const appointmentQueries = queries.filter(q => 
          q.queryKey.some(k => typeof k === 'string' && k.includes('appointment'))
        );
        
        console.log(`Found ${appointmentQueries.length} appointment-related queries`);
        
        appointmentQueries.forEach(q => {
          console.log('Query:', q.queryKey);
          console.log('State:', q.state.status);
          console.log('Data:', q.state.data);
          console.log('Error:', q.state.error);
          console.log('---');
        });
        
        addCheck('React Query Cache', 'pass', {
          totalQueries: queries.length,
          appointmentQueries: appointmentQueries.length
        });
      } else {
        addWarning('React Query DevTools not available');
      }
    } catch (error) {
      addWarning('Could not access React Query cache: ' + error.message);
    }

    // Check 2: Local Storage
    console.log('\n%c💾 Check 2: Local Storage', 'font-size: 16px; font-weight: bold; color: #10b981;');
    
    try {
      const authData = localStorage.getItem('auth');
      const userData = localStorage.getItem('user');
      
      if (authData) {
        const auth = JSON.parse(authData);
        console.log('Auth data found:', {
          hasToken: !!auth.token,
          hasUser: !!auth.user
        });
        
        if (auth.user) {
          console.log('User:', {
            email: auth.user.email,
            organizationId: auth.user.organizationId || 'NOT SET',
            role: auth.user.role
          });
          
          if (!auth.user.organizationId) {
            addError('User has no organizationId in localStorage');
            addRecommendation('Logout and login again to refresh user data');
          } else {
            addCheck('Organization ID in localStorage', 'pass', {
              organizationId: auth.user.organizationId
            });
          }
        }
      } else {
        addWarning('No auth data in localStorage');
      }
    } catch (error) {
      addError('Error reading localStorage: ' + error.message);
    }

    // Check 3: Firebase Connection
    console.log('\n%c🔥 Check 3: Firebase Connection', 'font-size: 16px; font-weight: bold; color: #10b981;');
    
    try {
      // Try to import Firebase modules
      const { db } = await import('/src/integrations/firebase/app.js');
      const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
      
      console.log('Firebase modules loaded successfully');
      
      // Get organization ID from localStorage
      const authData = localStorage.getItem('auth');
      if (!authData) {
        addError('Cannot test Firebase: No auth data');
      } else {
        const auth = JSON.parse(authData);
        const organizationId = auth.user?.organizationId;
        
        if (!organizationId) {
          addError('Cannot test Firebase: No organizationId');
        } else {
          console.log(`Testing Firestore query for organization: ${organizationId}`);
          
          const appointmentsRef = collection(db, 'appointments');
          const q = query(
            appointmentsRef,
            where('organization_id', '==', organizationId),
            limit(10)
          );
          
          const snapshot = await getDocs(q);
          
          console.log(`✅ Firestore query successful: ${snapshot.size} appointments found`);
          
          if (snapshot.size > 0) {
            addCheck('Firestore Query', 'pass', {
              appointmentsFound: snapshot.size
            });
            
            // Show sample data
            console.log('\n📄 Sample appointments:');
            snapshot.forEach((doc, index) => {
              const data = doc.data();
              console.log(`${index + 1}. ${doc.id}`, {
                patient: data.patient_name,
                date: data.date,
                time: data.start_time,
                status: data.status,
                organizationId: data.organization_id
              });
            });
          } else {
            addWarning('No appointments found in Firestore for this organization');
            addRecommendation('Create test appointments or verify organization_id');
          }
        }
      }
    } catch (error) {
      addError('Firebase connection error: ' + error.message);
      console.error(error);
    }

    // Check 4: Network Requests
    console.log('\n%c🌐 Check 4: Recent Network Requests', 'font-size: 16px; font-weight: bold; color: #10b981;');
    
    try {
      // Check if there are any failed network requests
      const performanceEntries = performance.getEntriesByType('resource');
      const recentRequests = performanceEntries.slice(-20);
      
      const failedRequests = recentRequests.filter(entry => {
        return entry.name.includes('firestore') || 
               entry.name.includes('appointment') ||
               entry.name.includes('cloudfunctions');
      });
      
      if (failedRequests.length > 0) {
        console.log('Recent Firebase/API requests:', failedRequests.map(r => ({
          url: r.name,
          duration: r.duration,
          size: r.transferSize
        })));
      } else {
        console.log('No recent Firebase/API requests found in performance entries');
      }
    } catch (error) {
      addWarning('Could not check network requests: ' + error.message);
    }

    // Check 5: DOM Elements
    console.log('\n%c🎨 Check 5: DOM Elements', 'font-size: 16px; font-weight: bold; color: #10b981;');
    
    try {
      const diagnosticPanel = document.querySelector('[class*="diagnostic"]');
      const appointmentCards = document.querySelectorAll('[class*="appointment"]');
      const calendarGrid = document.querySelector('[id*="calendar"]');
      
      console.log('DOM elements found:', {
        diagnosticPanel: !!diagnosticPanel,
        appointmentCards: appointmentCards.length,
        calendarGrid: !!calendarGrid
      });
      
      if (appointmentCards.length === 0) {
        addWarning('No appointment cards found in DOM');
        addRecommendation('Check if data is loading or if there are rendering errors');
      } else {
        addCheck('Appointment Cards in DOM', 'pass', {
          count: appointmentCards.length
        });
      }
    } catch (error) {
      addWarning('Could not check DOM elements: ' + error.message);
    }

    // Summary
    console.log('\n%c📊 DIAGNOSTIC SUMMARY', 'font-size: 18px; font-weight: bold; color: #3b82f6;');
    console.log('%c═══════════════════════════════════════════════════════════', 'color: #3b82f6;');
    
    const passedChecks = results.checks.filter(c => c.status === 'pass').length;
    const failedChecks = results.checks.filter(c => c.status === 'fail').length;
    const warningChecks = results.checks.filter(c => c.status === 'warn').length;
    
    console.log(`\n✅ Passed: ${passedChecks}`);
    console.log(`❌ Failed: ${failedChecks}`);
    console.log(`⚠️  Warnings: ${warningChecks}`);
    
    if (results.errors.length > 0) {
      console.log('\n%c❌ ERRORS:', 'font-weight: bold; color: #ef4444;');
      results.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    if (results.warnings.length > 0) {
      console.log('\n%c⚠️  WARNINGS:', 'font-weight: bold; color: #f59e0b;');
      results.warnings.forEach(warn => console.log(`  - ${warn}`));
    }
    
    if (results.recommendations.length > 0) {
      console.log('\n%c💡 RECOMMENDATIONS:', 'font-weight: bold; color: #10b981;');
      results.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
    console.log('\n%c✅ Diagnostic Complete!', 'font-size: 16px; font-weight: bold; color: #10b981;');
    console.log('\nFull results object:');
    console.log(results);
    
    // Copy results to clipboard
    try {
      const resultsText = JSON.stringify(results, null, 2);
      await navigator.clipboard.writeText(resultsText);
      console.log('\n📋 Results copied to clipboard!');
    } catch (error) {
      console.log('\n⚠️  Could not copy to clipboard. Copy the results object above manually.');
    }
    
    return results;
    
  } catch (error) {
    console.error('%c❌ DIAGNOSTIC FAILED', 'font-size: 18px; font-weight: bold; color: #ef4444;');
    console.error(error);
    return { error: error.message, stack: error.stack };
  }
})();
