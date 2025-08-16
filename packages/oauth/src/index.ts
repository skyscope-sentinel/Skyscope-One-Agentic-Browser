import { IpcMain } from 'electron';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';

/**
 * OAuth provider configuration
 */
export interface OAuthProvider {
  id: string;
  name: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  responseType: 'code';
  pkceRequired: boolean;
}

/**
 * OAuth request parameters
 */
export interface OAuthRequest {
  provider: string;
  scopes?: string[];
  redirectUri?: string;
}

/**
 * OAuth response with tokens
 */
export interface OAuthResponse {
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
  idToken?: string;
}

/**
 * PKCE code verifier and challenge
 */
export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

// Zod schemas for validation
const OAuthRequestSchema = z.object({
  provider: z.string().min(1),
  scopes: z.array(z.string()).optional(),
  redirectUri: z.string().url().optional(),
});

// Mock provider configurations
const PROVIDERS: Record<string, OAuthProvider> = {
  'github': {
    id: 'github',
    name: 'GitHub',
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    clientId: 'mock-github-client-id',
    redirectUri: 'skyscope://oauth/callback',
    scope: 'repo user',
    responseType: 'code',
    pkceRequired: true
  },
  'google': {
    id: 'google',
    name: 'Google',
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    clientId: 'mock-google-client-id',
    redirectUri: 'skyscope://oauth/callback',
    scope: 'email profile',
    responseType: 'code',
    pkceRequired: true
  }
};

// Store for active OAuth requests
const activeRequests = new Map<string, {
  provider: OAuthProvider;
  pkce: PKCEPair;
  resolve: (value: OAuthResponse) => void;
  reject: (reason: Error) => void;
}>();

/**
 * Generate a random code verifier for PKCE
 * @returns Random code verifier string
 */
function generateCodeVerifier(): string {
  return randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate code challenge from verifier using S256 method
 * @param verifier Code verifier
 * @returns Code challenge
 */
function generateCodeChallenge(verifier: string): string {
  return createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate PKCE code verifier and challenge pair
 * @returns PKCE pair
 */
function generatePKCEPair(): PKCEPair {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256'
  };
}

/**
 * Build OAuth authorization URL with PKCE
 * @param provider OAuth provider
 * @param pkce PKCE pair
 * @returns Authorization URL
 */
function buildAuthorizationUrl(provider: OAuthProvider, pkce: PKCEPair): string {
  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: provider.redirectUri,
    response_type: provider.responseType,
    scope: provider.scope,
    state: uuidv4()
  });
  
  if (provider.pkceRequired) {
    params.append('code_challenge', pkce.codeChallenge);
    params.append('code_challenge_method', pkce.codeChallengeMethod);
  }
  
  return `${provider.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Create mock OAuth response for testing
 * @param provider Provider ID
 * @returns Mock OAuth response
 */
function createMockResponse(provider: string): OAuthResponse {
  return {
    provider,
    accessToken: `mock-${provider}-access-token-${uuidv4()}`,
    refreshToken: `mock-${provider}-refresh-token-${uuidv4()}`,
    expiresIn: 3600,
    tokenType: 'Bearer',
    scope: PROVIDERS[provider]?.scope || '',
    idToken: provider === 'google' ? `mock-google-id-token-${uuidv4()}` : undefined
  };
}

/**
 * Set up OAuth handlers for IPC communication
 * @param ipcMain Electron IpcMain instance
 */
export function setupOAuthHandlers(ipcMain: IpcMain): void {
  // Handle OAuth open request
  ipcMain.handle('oauth:open', async (_event, request: unknown) => {
    try {
      // Validate request
      const validatedRequest = OAuthRequestSchema.parse(request);
      const { provider: providerId } = validatedRequest;
      
      // Check if provider exists
      const provider = PROVIDERS[providerId];
      if (!provider) {
        throw new Error(`OAuth provider not supported: ${providerId}`);
      }
      
      // Generate PKCE pair
      const pkce = generatePKCEPair();
      
      // Build authorization URL
      const authUrl = buildAuthorizationUrl(provider, pkce);
      
      console.log(`[OAuth] Opening authorization URL for ${providerId}`);
      console.log(`[OAuth] This is a mock implementation, not actually opening browser`);
      
      // In a real implementation, we would open a browser window here
      // and handle the redirect, but for now we'll just return a mock response
      
      // Return mock response after a short delay to simulate the flow
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return createMockResponse(providerId);
    } catch (error) {
      console.error('[OAuth] Error handling oauth:open', error);
      throw error;
    }
  });
  
  // Handle OAuth callback (will be implemented later with real browser window)
  ipcMain.handle('oauth:callback', async (_event, { code, state, error }: { code?: string, state?: string, error?: string }) => {
    // This will be implemented later with real OAuth flow
    console.log('[OAuth] Received callback', { code, state, error });
    
    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }
    
    if (!code || !state) {
      throw new Error('Invalid OAuth callback: missing code or state');
    }
    
    // In a real implementation, we would exchange the code for tokens here
    return { success: true };
  });
  
  // Revoke tokens
  ipcMain.handle('oauth:revoke', async (_event, { provider, token }: { provider: string, token: string }) => {
    console.log(`[OAuth] Revoking token for ${provider}`);
    // In a real implementation, we would call the provider's revocation endpoint
    return { success: true };
  });
}

// Export types and functions
export type { OAuthRequest, OAuthResponse };
export { PROVIDERS };
