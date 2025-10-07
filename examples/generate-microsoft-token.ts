/**
 * Microsoft Graph OAuth Token Generator
 *
 * This script helps you generate OAuth tokens for Microsoft Graph (Outlook) integration.
 *
 * Prerequisites (IMPORTANT - Follow in order):
 *
 * 1. Register an application in Azure Portal
 *    https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
 *    Click "New registration"
 *
 * 2. Configure the application:
 *    - Name: Your app name (e.g., "SuperMail Integration")
 *    - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
 *    - Redirect URI:
 *      * Platform: Web
 *      * URI: http://localhost:3000/oauth2callback
 *
 * 3. Add API Permissions:
 *    Go to "API permissions" > "Add a permission" > "Microsoft Graph" > "Delegated permissions"
 *    Required permissions:
 *    - Mail.Read
 *    - Mail.ReadWrite
 *    - Mail.Send
 *    - MailboxSettings.Read
 *    Click "Add permissions"
 *
 * 4. Create a Client Secret:
 *    Go to "Certificates & secrets" > "New client secret"
 *    - Description: SuperMail Token
 *    - Expires: Choose duration (recommended: 24 months)
 *    - Copy the secret VALUE (not ID) immediately - it won't be shown again!
 *
 * 5. Copy Application (client) ID and Directory (tenant) ID
 *    From the "Overview" page, copy:
 *    - Application (client) ID
 *    - Directory (tenant) ID
 *
 * Usage:
 *   1. Set these in .env file:
 *      MICROSOFT_CLIENT_ID=your_client_id
 *      MICROSOFT_CLIENT_SECRET=your_client_secret
 *      MICROSOFT_TENANT_ID=your_tenant_id (or use "common" for multi-tenant)
 *   2. Run: npm run generate:microsoft-token
 *   3. Follow the URL and sign in with your Microsoft account
 *   4. The access token will be displayed - add it to your .env file
 */

import 'dotenv/config';
import * as http from 'http';
import { URL } from 'url';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

const SCOPES = [
  'https://graph.microsoft.com/User.Read',
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Mail.Send',
  'https://graph.microsoft.com/Mail.ReadWrite',
  'https://graph.microsoft.com/MailboxSettings.Read',
  'offline_access'
];

const REDIRECT_URI = 'http://localhost:3000/callback';
const PORT = 3000;

async function generateToken() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

  if (!clientId || !clientSecret) {
    console.error('❌ Error: Required environment variables not set');
    console.error('\nPlease add these to your .env file:');
    console.error('MICROSOFT_CLIENT_ID=your_client_id_here');
    console.error('MICROSOFT_CLIENT_SECRET=your_client_secret_here');
    console.error('MICROSOFT_TENANT_ID=common  # or your specific tenant ID');
    process.exit(1);
  }

  console.log('\n🔐 Microsoft Graph OAuth Token Generator\n');
  console.log(
    'This will help you generate OAuth tokens for Microsoft Graph (Outlook) integration.\n'
  );
  console.log('📋 Tenant ID:', tenantId);
  console.log('📋 Client ID:', clientId.substring(0, 8) + '...\n');
  console.log('📋 Requested Scopes:');
  SCOPES.forEach(scope => {
    console.log(`   - ${scope}`);
  });
  console.log();

  // Build the authorization URL
  const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('scope', SCOPES.join(' '));
  authUrl.searchParams.append('response_mode', 'query');
  authUrl.searchParams.append('prompt', 'consent'); // Force consent to get refresh token

  console.log('📋 Step 1: Authorize the application');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('\n👉 Open this URL in your browser:\n');
  console.log('\x1b[36m%s\x1b[0m\n', authUrl.toString());
  console.log('─────────────────────────────────────────────────────────────\n');
  console.log('🌐 Starting local server on port', PORT, '...');
  console.log('⏳ Waiting for authorization...\n');

  // Create a server to receive the callback
  return new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, `http://localhost:${PORT}`);

        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');
          const errorDescription = url.searchParams.get('error_description');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: Arial; padding: 50px; text-align: center;">
                  <h1 style="color: #d32f2f;">❌ Authorization Failed</h1>
                  <p><strong>Error:</strong> ${error}</p>
                  <p>${errorDescription || ''}</p>
                  <p>You can close this window.</p>
                </body>
              </html>
            `);
            server.close();
            reject(new Error(`Authorization failed: ${error} - ${errorDescription}`));
            return;
          }

          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>Missing authorization code</h1></body></html>');
            server.close();
            reject(new Error('Missing authorization code'));
            return;
          }

          console.log('✓ Authorization code received!\n');
          console.log('📋 Step 2: Exchanging code for tokens...\n');

          // Exchange the code for tokens
          try {
            const tokenResponse = await exchangeCodeForTokens(
              code,
              clientId,
              clientSecret,
              tenantId
            );

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: Arial; padding: 50px; text-align: center;">
                  <h1 style="color: #4caf50;">✅ Success!</h1>
                  <p>Your OAuth tokens have been generated successfully.</p>
                  <p>Check your terminal for the tokens.</p>
                  <p style="margin-top: 30px; color: #666;">You can close this window now.</p>
                </body>
              </html>
            `);

            console.log('✅ Tokens generated successfully!\n');
            console.log('─────────────────────────────────────────────────────────────');
            console.log('📝 Add these to your .env file:\n');
            console.log(
              '\x1b[32m%s\x1b[0m',
              'MICROSOFT_ACCESS_TOKEN=' + tokenResponse.access_token
            );
            if (tokenResponse.refresh_token) {
              console.log(
                '\x1b[32m%s\x1b[0m',
                'MICROSOFT_REFRESH_TOKEN=' + tokenResponse.refresh_token
              );
            }
            console.log('─────────────────────────────────────────────────────────────\n');
            console.log('💡 Token Details:');
            console.log(
              `   - Expires in: ${tokenResponse.expires_in} seconds (~${Math.floor(tokenResponse.expires_in / 60)} minutes)`
            );
            console.log(`   - Token type: ${tokenResponse.token_type}`);
            console.log(`   - Scopes: ${tokenResponse.scope}`);
            if (tokenResponse.refresh_token) {
              console.log(
                '\n   ✓ Refresh token received - you can use this to get new access tokens'
              );
            } else {
              console.log(
                '\n   ⚠️  No refresh token received - you may need to re-authorize when the token expires'
              );
            }
            console.log();

            server.close();
            resolve();
          } catch (error) {
            const err = error as Error;
            console.error('❌ Error exchanging code for tokens:', err.message);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: Arial; padding: 50px; text-align: center;">
                  <h1 style="color: #d32f2f;">❌ Token Exchange Failed</h1>
                  <p>${err.message}</p>
                  <p>Check your terminal for more details.</p>
                </body>
              </html>
            `);
            server.close();
            reject(error);
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        }
      } catch (error) {
        console.error('❌ Server error:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
        server.close();
        reject(error);
      }
    });

    server.listen(PORT, () => {
      console.log('✓ Server is listening on port', PORT);
    });

    server.on('error', error => {
      console.error('❌ Server error:', error);
      reject(error);
    });
  });
}

async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  tenantId: string
): Promise<TokenResponse> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    scope: SCOPES.join(' '),
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${errorData}`);
  }

  const data = (await response.json()) as TokenResponse;
  return data;
}

// Run the generator
generateToken()
  .then(() => {
    console.log('🎉 Token generation complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed to generate tokens:', (error as Error).message);
    process.exit(1);
  });
