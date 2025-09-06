import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ixevreqkdliucbsrqviy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4ZXZyZXFrZGxpdWNic3Jxdml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODIzNzEsImV4cCI6MjA3MjM1ODM3MX0.GXN1qovqdFAjD9c4AJIhrsKBRl7pJb67CE2-6In48IA'
);

async function testUsers() {
  try {
    console.log('Verificando usuários na tabela profiles...');
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);
    
    if (error) {
      console.log('Erro ao consultar profiles:', error.message);
      return;
    }
    
    console.log(`Encontrados ${profiles?.length || 0} perfis:`);
    profiles?.forEach(profile => {
      console.log(`- ${profile.full_name || 'Sem nome'} (${profile.role || 'Sem role'})`);
    });
    
  } catch (err) {
    console.log('Erro:', err.