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

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
          console.log(`User ${demoUser.email} already exists, skipping creation`);
          const user = existingUser?.users?.find((u) => u.email === demoUser.email);
          userId = user!.id;
          results.push({ email: demoUser.email, status: 'already_exists', userId });
        } else {
          // Create new user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: demoUser.email,
            password: demoUser.password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
              full_name: demoUser.full_name,
            },
          });

          if (createError) {
            console.error(`Error creating user ${demoUser.email}:`, createError);
            results.push({ email: demoUser.email, status: 'error', error: createError.message });
            continue;
          }

          userId = newUser.user!.id;
          console.log(`Created user ${demoUser.email} with ID ${userId}`);
          results.push({ email: demoUser.email, status: 'created', userId });
        }

        // Setup profile and role using the database function
        const { error: setupError } = await supabaseAdmin.rpc('setup_demo_user', {
          _email: demoUser.email,
          _full_name: demoUser.full_name,
          _role: demoUser.role,
        });

        if (setupError) {
          console.error(`Error setting up user ${demoUser.email}:`, setupError);
          results.push({
            email: demoUser.email,
            status: 'setup_error',
            error: setupError.message,
          });
        }
      } catch (error) {
        console.error(`Unexpected error for ${demoUser.email}:`, error);
        results.push({
          email: demoUser.email,
          status: 'unexpected_error',
          error: error.message,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});