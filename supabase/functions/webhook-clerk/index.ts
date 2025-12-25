import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Webhook } from 'https://esm.sh/svix@1.17.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

const CLERK_WEBHOOK_SECRET = Deno.env.get('CLERK_WEBHOOK_SECRET') || '';

serve(async (req: Request) => {
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const body = await req.text();

  try {
    const wh = new Webhook(CLERK_WEBHOOK_SECRET);
    const evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as { type: string; data: any };

    console.log(`Processing Clerk webhook: ${evt.type}`);

    switch (evt.type) {
      case 'user.created':
        await handleUserCreated(evt.data);
        break;

      case 'user.updated':
        await handleUserUpdated(evt.data);
        break;

      case 'user.deleted':
        await handleUserDeleted(evt.data);
        break;

      case 'session.created':
        await handleSessionCreated(evt.data);
        break;

      case 'organization.created':
        await handleOrganizationCreated(evt.data);
        break;

      case 'organization.updated':
        await handleOrganizationUpdated(evt.data);
        break;

      case 'organizationMembership.created':
        await handleMembershipCreated(evt.data);
        break;

      case 'organizationMembership.deleted':
        await handleMembershipDeleted(evt.data);
        break;

      default:
        console.log(`Unhandled Clerk event: ${evt.type}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Clerk webhook error:', err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});

// ========== USER HANDLERS ==========

async function handleUserCreated(data: any) {
  const {
    id,
    email_addresses,
    first_name,
    last_name,
    image_url,
    phone_numbers,
    public_metadata,
    private_metadata,
  } = data;

  const primaryEmail = email_addresses?.find((e: any) => e.id === data.primary_email_address_id);
  const primaryPhone = phone_numbers?.find((p: any) => p.id === data.primary_phone_number_id);

  // Criar perfil no Supabase
  const { error } = await supabase.from('profiles').upsert({
    id,
    email: primaryEmail?.email_address,
    name: `${first_name || ''} ${last_name || ''}`.trim() || 'Usuário',
    photo_url: image_url,
    phone: primaryPhone?.phone_number,
    role: public_metadata?.role || 'therapist',
    organization_id: private_metadata?.organization_id,
    clerk_id: id,
    is_active: true,
    created_at: new Date().toISOString(),
  }, {
    onConflict: 'id',
  });

  if (error) {
    console.error('Error creating profile:', error);
  } else {
    console.log(`User created: ${id}`);
  }
}

async function handleUserUpdated(data: any) {
  const {
    id,
    email_addresses,
    first_name,
    last_name,
    image_url,
    phone_numbers,
    public_metadata,
    private_metadata,
  } = data;

  const primaryEmail = email_addresses?.find((e: any) => e.id === data.primary_email_address_id);
  const primaryPhone = phone_numbers?.find((p: any) => p.id === data.primary_phone_number_id);

  const updateData: Record<string, any> = {
    email: primaryEmail?.email_address,
    name: `${first_name || ''} ${last_name || ''}`.trim(),
    photo_url: image_url,
    phone: primaryPhone?.phone_number,
    updated_at: new Date().toISOString(),
  };

  // Atualizar role se definido
  if (public_metadata?.role) {
    updateData.role = public_metadata.role;
  }

  // Atualizar organization_id se definido
  if (private_metadata?.organization_id) {
    updateData.organization_id = private_metadata.organization_id;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating profile:', error);
  } else {
    console.log(`User updated: ${id}`);
  }
}

async function handleUserDeleted(data: any) {
  const { id } = data;

  // Soft delete do perfil
  const { error } = await supabase
    .from('profiles')
    .update({
      is_active: false,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error deleting profile:', error);
  } else {
    console.log(`User deleted: ${id}`);
  }
}

// ========== SESSION HANDLERS ==========

async function handleSessionCreated(data: any) {
  const { user_id, client_id, created_at } = data;

  // Atualizar último login
  await supabase
    .from('profiles')
    .update({
      last_login_at: new Date(created_at).toISOString(),
    })
    .eq('id', user_id);

  // Registrar log de sessão (opcional)
  await supabase.from('login_logs').insert({
    user_id,
    client_id,
    logged_in_at: new Date(created_at).toISOString(),
  });

  console.log(`Session created for user: ${user_id}`);
}

// ========== ORGANIZATION HANDLERS ==========

async function handleOrganizationCreated(data: any) {
  const {
    id,
    name,
    slug,
    image_url,
    public_metadata,
    private_metadata,
    created_by,
  } = data;

  const { error } = await supabase.from('organizations').upsert({
    id,
    name,
    slug,
    logo_url: image_url,
    plan: public_metadata?.plan || 'free',
    settings: private_metadata?.settings || {},
    owner_id: created_by,
    is_active: true,
    created_at: new Date().toISOString(),
  }, {
    onConflict: 'id',
  });

  if (error) {
    console.error('Error creating organization:', error);
  } else {
    console.log(`Organization created: ${id}`);
  }
}

async function handleOrganizationUpdated(data: any) {
  const {
    id,
    name,
    slug,
    image_url,
    public_metadata,
    private_metadata,
  } = data;

  const updateData: Record<string, any> = {
    name,
    slug,
    logo_url: image_url,
    updated_at: new Date().toISOString(),
  };

  if (public_metadata?.plan) {
    updateData.plan = public_metadata.plan;
  }

  if (private_metadata?.settings) {
    updateData.settings = private_metadata.settings;
  }

  const { error } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating organization:', error);
  } else {
    console.log(`Organization updated: ${id}`);
  }
}

// ========== MEMBERSHIP HANDLERS ==========

async function handleMembershipCreated(data: any) {
  const {
    id,
    organization,
    public_user_data,
    role,
  } = data;

  // Atualizar organization_id do usuário
  await supabase
    .from('profiles')
    .update({
      organization_id: organization.id,
      role: mapClerkRoleToAppRole(role),
    })
    .eq('id', public_user_data.user_id);

  // Criar registro de membership
  await supabase.from('organization_members').upsert({
    id,
    organization_id: organization.id,
    user_id: public_user_data.user_id,
    role: mapClerkRoleToAppRole(role),
    joined_at: new Date().toISOString(),
  }, {
    onConflict: 'id',
  });

  console.log(`Membership created: ${public_user_data.user_id} joined ${organization.id}`);
}

async function handleMembershipDeleted(data: any) {
  const {
    id,
    organization,
    public_user_data,
  } = data;

  // Remover organization_id do usuário
  await supabase
    .from('profiles')
    .update({
      organization_id: null,
    })
    .eq('id', public_user_data.user_id)
    .eq('organization_id', organization.id);

  // Remover registro de membership
  await supabase
    .from('organization_members')
    .delete()
    .eq('id', id);

  console.log(`Membership deleted: ${public_user_data.user_id} left ${organization.id}`);
}

// ========== HELPERS ==========

function mapClerkRoleToAppRole(clerkRole: string): string {
  const roleMap: Record<string, string> = {
    'org:admin': 'admin',
    'org:member': 'therapist',
    'org:billing': 'admin',
    'admin': 'admin',
    'basic_member': 'therapist',
  };
  return roleMap[clerkRole] || 'therapist';
}

