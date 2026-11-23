import { createBrowserClient, createServerClient, isBrowser } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!isBrowser()) {
    throw new Error("getSupabaseBrowserClient called on server");
  }
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseKey);
  }
  return browserClient;
}

export async function getSupabaseServerClient() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored in Server Components
        }
      },
    },
  });
}

/**
 * Creates a Supabase client that carries the Clerk token.
 * The token is passed via the Authorization header so RLS policies
 * can read the organization claim from it.
 *
 * Falls back to anonymous client if no token or template not configured.
 */
export async function getSupabaseClientWithToken() {
  const { auth } = await import("@clerk/nextjs/server");
  const { getToken } = await auth();

  let token: string | null = null;

  try {
    token = await getToken({ template: "supabase" });
  } catch (error) {
    // Template might not be configured, or user not in org
    console.warn("Failed to get Supabase token:", error);
  }

  if (!token) {
    // No Clerk session or template not configured — return anonymous client (RLS will handle access)
    return getSupabaseServerClient();
  }

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored in Server Components
        }
      },
    },
  });
}