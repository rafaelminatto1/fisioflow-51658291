/**
 * Script de diagnóstico para verificar por que os agendamentos não aparecem
 * 
 * Cole este script no console do navegador (F12) na página /agenda
 */

console.log('🔍 Diagnóstico de Agendamentos - Início');
console.log('==========================================\n');

// 1. Verificar dados no React Query Cache
console.log('1️⃣ Verificando React Query Cache...');
try {
  const queryClient = window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__?.queryClient;
  if (queryClient) {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    console.log(`   Total de queries no cache: ${queries.length}`);
    
    // Filtrar queries de appointments
    const appointmentQueries = queries.filter(q => 
      q.queryKey.some(k => typeof k === 'string' && k.includes('appointment'))
    );
    
    console.log(`   Queries de appointments: ${appointmentQueries.length}`);
    
    appointmentQueries.forEach((query, index) => {
      console.log(`\n   Query ${index + 1}:`);
      console.log(`   - Key:`, query.queryKey);
      console.log(`   - State:`, query.state.status);
      console.log(`   - Data length:`, query.state.data?.length || 0);
      console.log(`   - Error:`, query.state.error);
      
      if (query.state.data && query.state.data.length > 0) {
        console.log(`   - Sample data:`, query.state.data[0]);
      }
    });
  } else {
    console.log('   ⚠️ React Query não encontrado');
  }
} catch (error) {
  console.error('   ❌ Erro ao verificar cache:', error);
}

console.log('\n2️⃣ Verificando DOM...');
try {
  // Verificar se o calendário está renderizado
  const calendarGrid = document.querySelector('[id="calendar-grid"]');
  console.log(`   Calendar grid encontrado: ${!!calendarGrid}`);
  
  // Verificar se há slots de tempo
  const timeSlots = document.querySelectorAll('[data-time-slot]');
  console.log(`   Time slots encontrados: ${timeSlots.length}`);
  
  // Verificar se há cards de agendamento
  const appointmentCards = document.querySelectorAll('[data-appointment-id]');
  console.log(`   Appointment cards encontrados: ${appointmentCards.length}`);
  
  if (appointmentCards.length > 0) {
    console.log(`   - IDs dos cards:`, Array.from(appointmentCards).map(c => c.dataset.appointmentId));
  }
} catch (error) {
  console.error('   ❌ Erro ao verificar DOM:', error);
}

console.log('\n3️⃣ Verificando props do CalendarView...');
try {
  // Tentar acessar o componente React
  const calendarElement = document.querySelector('[class*="calendar"]');
  if (calendarElement) {
    const reactKey = Object.keys(calendarElement).find(key => 
      key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')
    );
    
    if (reactKey) {
      let fiber = calendarElement[reactKey];
      
      // Subir na árvore até encontrar CalendarView
      while (fiber) {
        if (fiber.type?.name === 'CalendarView' || fiber.elementType?.name === 'CalendarView') {
          console.log(`   CalendarView encontrado!`);
          console.log(`   - Props:`, fiber.memoizedProps);
          console.log(`   - Appointments length:`, fiber.memoizedProps?.appointments?.length || 0);
          
          if (fiber.memoizedProps?.appointments?.length > 0) {
            console.log(`   - Sample appointment:`, fiber.memoizedProps.appointments[0]);
          }
          break;
        }
        fiber = fiber.return;
      }
    }
  }
} catch (error) {
  console.error('   ❌ Erro ao verificar props:', error);
}

console.log('\n4️⃣ Verificando filtros...');
try {
  // Verificar se há filtros ativos que podem estar escondendo os agendamentos
  const filterButtons = document.querySelectorAll('[role="checkbox"]');
  console.log(`   Filtros encontrados: ${filterButtons.length}`);
  
  const activeFilters = Array.from(filterButtons).filter(btn => 
    btn.getAttribute('aria-checked') === 'true'
  );
  console.log(`   Filtros ativos: ${activeFilters.length}`);
  
  if (activeFilters.length > 0) {
    console.log(`   ⚠️ Há filtros ativos que podem estar escondendo agendamentos!`);
    activeFilters.forEach(filter => {
      console.log(`   - ${filter.textContent}`);
    });
  }
} catch (error) {
  console.error('   ❌ Erro ao verificar filtros:', error);
}

console.log('\n5️⃣ Verificando console logs...');
console.log('   Procure por logs com prefixos:');
console.log('   - [INFO] useFilteredAppointments');
console.log('   - [INFO] [Direct] Fetching appointments');
console.log('   - [INFO] Schedule page');
console.log('   - [ERROR] ou [WARN]');

console.log('\n==========================================');
console.log('🔍 Diagnóstico de Agendamentos - Fim\n');
console.log('📋 Próximos passos:');
console.log('   1. Copie TODA a saída acima');
console.log('   2. Procure por erros ou warnings no console');
console.log('   3. Verifique se há filtros ativos');
console.log('   4. Compartilhe os resultados');
