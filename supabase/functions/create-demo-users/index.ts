import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DemoUser {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'fisioterapeuta' | 'estagiario';
}

const DEMO_USERS: DemoUser[] = [
  {
    email: 'admin@fisioflow.com',
    password: 'Admin@2025',
    full_name: 'Administrador Demo',
    role: 'admin',
  },
  {
    email: 'fisio@fisioflow.com',
    password: 'Fisio@2025',
    full_name: 'Fisioterapeuta Demo',
    role: 'fisioterapeuta',
  },
  {
    email: 'estagiario@fisioflow.com',
    password: 'Estag@2025',
    full_name: 'Estagiário Demo',
    role: 'estagiario',
  },
];

// Generic error response for security
function safeErrorResponse(requestId: string) {
  return new Response(
    JSON.stringify({ 
      error: 'Erro ao processar requisição. Tente novamente mais tarde.',
      requestId 
    }),
    { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID()

  // Block in production environment for security
  const environment = Deno.env.get('ENVIRONMENT') || Deno.env.get('NODE_ENV');
  if (environment === 'production') {
    console.warn(`[create-demo-users] Blocked in production environment: ${requestId}`);
    return new Response(
      JSON.stringify({ 
        error: 'Esta função não está disponível em ambiente de produção.',
        requestId 
      }),
      { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[create-demo-users] Missing credentials:', {
        requestId,
        timestamp: new Date().toISOString()
      })
      return safeErrorResponse(requestId)
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results = [];

    for (const demoUser of DEMO_USERS) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUser?.users?.some((u) => u.email === demoUser.email);

        let userId: string;

        if (userExists) {
          console.log(`[create-demo-users] User exists: ${demoUser.email}`);
          const user = existingUser?.users?.find((u) => u.email === demoUser.email);
          userId = user!.id;
          results.push({ email: demoUser.email, status: 'already_exists', userId });
        } else {
          // Create new user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: demoUser.email,
            password: demoUser.password,
            email_confirm: true,
            user_metadata: {
              full_name: demoUser.full_name,
            },
          });

          if (createError) {
            console.error(`[create-demo-users] Create error for ${demoUser.email}:`, {
              requestId,
              timestamp: new Date().toISOString()
            });
            results.push({ email: demoUser.email, status: 'error' });
            continue;
          }

          userId = newUser.user!.id;
          console.log(`[create-demo-users] Created: ${demoUser.email}`);
          results.push({ email: demoUser.email, status: 'created', userId });
        }

        // Setup profile and role using the database function
        const { error: setupError } = await supabaseAdmin.rpc('setup_demo_user', {
          _email: demoUser.email,
          _full_name: demoUser.full_name,
          _role: demoUser.role,
        });

        if (setupError) {
          console.error(`[create-demo-users] Setup error for ${demoUser.email}:`, {
            requestId,
            timestamp: new Date().toISOString()
          });
          results.push({
            email: demoUser.email,
            status: 'setup_error',
          });
        }
      } catch (error) {
        console.error(`[create-demo-users] Unexpected error for ${demoUser.email}:`, {
          requestId,
          error,
          timestamp: new Date().toISOString()
        });
        results.push({
          email: demoUser.email,
          status: 'unexpected_error',
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[create-demo-users] Function error:', {
      requestId,
      error,
      timestamp: new Date().toISOString()
    });
    return safeErrorResponse(requestId)
  }
});
