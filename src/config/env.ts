/**
 * Environment configuration
 *
 * IMPORTANT: For Next.js client-side access, NEXT_PUBLIC_* variables must be
 * accessed directly (not through a function) so they get inlined at build time.
 */

export const ENV_CONFIG = {
  // Membrane API
  MEMBRANE_API_URI: process.env.NEXT_PUBLIC_INTEGRATION_APP_API_URL,
  MEMBRANE_UI_URI: process.env.NEXT_PUBLIC_INTEGRATION_APP_UI_URL,

  // Auth0
  AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
  AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,

  // OpenCode (server-side only)
  OPENCODE_SERVER_URL: process.env.OPENCODE_SERVER_URL,
};
