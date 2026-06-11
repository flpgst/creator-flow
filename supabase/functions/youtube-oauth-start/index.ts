import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.107.0';

const GOOGLE_OAUTH_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];
const STATE_TTL_MINUTES = 10;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type JsonBody = {
  error?: string;
  authorizationUrl?: string;
};

function jsonResponse(body: JsonBody, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function getSupabaseServiceRoleKey(): string {
  return Deno.env.get('CREATOR_FLOW_SUPABASE_SERVICE_ROLE_KEY') ?? requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function generateState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function buildAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
}): string {
  const authorizationUrl = new URL(GOOGLE_OAUTH_AUTHORIZE_URL);
  authorizationUrl.searchParams.set('client_id', params.clientId);
  authorizationUrl.searchParams.set('redirect_uri', params.redirectUri);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('scope', params.scopes.join(' '));
  authorizationUrl.searchParams.set('state', params.state);
  authorizationUrl.searchParams.set('access_type', 'offline');
  authorizationUrl.searchParams.set('include_granted_scopes', 'true');
  authorizationUrl.searchParams.set('prompt', 'consent');

  return authorizationUrl.toString();
}

function getGoogleScopes(): string[] {
  const configuredScopes = Deno.env.get('GOOGLE_OAUTH_SCOPES')?.split(/\s+/).filter(Boolean) ?? [];
  return configuredScopes.length > 0 ? configuredScopes : DEFAULT_SCOPES;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const supabaseAnonKey = requiredEnv('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = getSupabaseServiceRoleKey();
    const googleClientId = requiredEnv('GOOGLE_CLIENT_ID');
    const googleRedirectUri = requiredEnv('GOOGLE_OAUTH_REDIRECT_URI');
    const scopes = getGoogleScopes();
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return jsonResponse({ error: 'Authentication required.' }, 401);
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      return jsonResponse({ error: 'Invalid authentication token.' }, 401);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const state = generateState();
    const stateHash = await sha256Hex(state);
    const expiresAt = new Date(Date.now() + STATE_TTL_MINUTES * 60 * 1000).toISOString();
    const { error: insertError } = await adminClient.from('youtube_oauth_states').insert({
      user_id: user.id,
      state_hash: stateHash,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('Failed to persist YouTube OAuth state.', insertError);
      return jsonResponse({ error: 'Unable to start YouTube OAuth.' }, 500);
    }

    return jsonResponse({
      authorizationUrl: buildAuthorizationUrl({
        clientId: googleClientId,
        redirectUri: googleRedirectUri,
        scopes,
        state,
      }),
    });
  } catch (error) {
    console.error('youtube-oauth-start failed.', error);
    return jsonResponse({ error: 'Unable to start YouTube OAuth.' }, 500);
  }
});
