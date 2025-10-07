/**
 * Google OAuth Token Generator
 * 
 * This script helps you generate OAuth tokens for Gmail integration.
 * 
 * Prerequisites (IMPORTANT - Follow in order):
 * 
 * 1. Create a project in Google Cloud Console
 *    https://console.cloud.google.com/projectcreate
 * 
 * 2. **ENABLE Gmail API** (THIS IS CRITICAL!)
 *    https://console.cloud.google.com/apis/library/gmail.googleapis.com
 *    Click "ENABLE" button
 * 
 * 3. Create OAuth 2.0 credentials
 *    Go to: https://console.cloud.google.com/apis/credentials
 *    Click "Create Credentials" > "OAuth client ID"
 *    Choose "Desktop app" or "Web application"
 * 
 * 4. Add redirect URI (for Web application type):
 *    http://localhost:3000/oauth2callback
 * 
 * 5. Copy Client ID and Client Secret to .env file
 * 
 * Usage:
 *   1. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env file
 *   2. Run: npm run generate:google-token
 *   3. Follow the URL that appears and authorize the app
 *   4. The tokens will be displayed - add them to your .env file
 */

import 'dotenv/config';
import * as http from 'http';
import { URL } from 'url';

interface TokenResponse {
    access_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    expiry_date: number;
}

const SCOPES = [
    // Full Gmail access - includes all operations
    // Note: This is required for creating labels, not just reading them
    'https://mail.google.com/',
];

const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const PORT = 3000;

async function generateToken() {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('❌ Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env file');
        console.error('\nPlease add these to your .env file:');
        console.error('GMAIL_CLIENT_ID=your_client_id_here');
        console.error('GMAIL_CLIENT_SECRET=your_client_secret_here');
        process.exit(1);
    }

    console.log('\n🔐 Google OAuth Token Generator\n');
    console.log('This will help you generate OAuth tokens for Gmail integration.\n');
    console.log('⚠️  IMPORTANT: Make sure you have enabled the Gmail API in Google Cloud Console!');
    console.log('   Enable it here: \x1b[36mhttps://console.cloud.google.com/apis/library/gmail.googleapis.com\x1b[0m\n');
    console.log('📋 Requested Scopes:');
    console.log('   - Full Gmail access (https://mail.google.com/)');
    console.log('   - This includes: read, send, modify, delete emails, and create/manage labels\n');

    // Build the authorization URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', SCOPES.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');

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

                if (url.pathname === '/oauth2callback') {
                    const code = url.searchParams.get('code');
                    const error = url.searchParams.get('error');

                    if (error) {
                        res.writeHead(400, { 'Content-Type': 'text/html' });
                        res.end(`
              <html>
                <body style="font-family: Arial; padding: 50px; text-align: center;">
                  <h1 style="color: #d32f2f;">❌ Authorization Failed</h1>
                  <p>Error: ${error}</p>
                  <p>You can close this window.</p>
                </body>
              </html>
            `);
                        server.close();
                        reject(new Error(`Authorization failed: ${error}`));
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
                        const tokenResponse = await exchangeCodeForTokens(code, clientId, clientSecret);

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
                        console.log('\x1b[32m%s\x1b[0m', 'GMAIL_ACCESS_TOKEN=' + tokenResponse.access_token);
                        console.log('\x1b[32m%s\x1b[0m', 'GMAIL_REFRESH_TOKEN=' + tokenResponse.refresh_token);
                        console.log('\x1b[32m%s\x1b[0m', 'GMAIL_REDIRECT_URI=' + REDIRECT_URI);
                        console.log('─────────────────────────────────────────────────────────────\n');
                        console.log('💡 Note: The access token expires after 1 hour, but the refresh');
                        console.log('   token can be used to get new access tokens automatically.\n');

                        server.close();
                        resolve();
                    } catch (error: any) {
                        console.error('❌ Error exchanging code for tokens:', error.message);
                        res.writeHead(500, { 'Content-Type': 'text/html' });
                        res.end(`
              <html>
                <body style="font-family: Arial; padding: 50px; text-align: center;">
                  <h1 style="color: #d32f2f;">❌ Token Exchange Failed</h1>
                  <p>${error.message}</p>
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
            } catch (error: any) {
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

        server.on('error', (error) => {
            console.error('❌ Server error:', error);
            reject(error);
        });
    });
}

async function exchangeCodeForTokens(
    code: string,
    clientId: string,
    clientSecret: string
): Promise<TokenResponse> {
    const tokenUrl = 'https://oauth2.googleapis.com/token';

    const params = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
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

    const data = await response.json();
    return data as TokenResponse;
}

// Run the generator
generateToken()
    .then(() => {
        console.log('🎉 Token generation complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Failed to generate tokens:', error.message);
        process.exit(1);
    });

