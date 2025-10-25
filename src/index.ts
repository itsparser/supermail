/**
 * SuperMail - Unified email interface for Gmail and Microsoft Graph API
 *
 * @example
 * ```typescript
 * import { SuperMail } from 'supermail';
 *
 * // Gmail configuration
 * const gmailClient = new SuperMail({
 *   type: 'gmail',
 *   credentials: {
 *     client_id: 'your-client-id',
 *     client_secret: 'your-client-secret',
 *     redirect_uri: 'your-redirect-uri'
 *   },
 *   token: yourOAuthToken
 * });
 *
 * // Microsoft Graph configuration
 * const msClient = new SuperMail({
 *   type: 'microsoft',
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   tenantId: 'your-tenant-id',
 *   accessToken: 'your-access-token'
 * });
 *
 * // Send an email (works with both providers)
 * await gmailClient.sendEmail({
 *   subject: 'Hello World',
 *   to: [{ email: 'recipient@example.com', name: 'John Doe' }],
 *   body: 'This is a test email'
 * });
 *
 * // List emails
 * const emails = await gmailClient.listEmails({
 *   maxResults: 10,
 *   unreadOnly: true
 * });
 * ```
 */

export * from './errors';
export { IEmailProvider } from './provider';
export { GmailProvider } from './providers/gmail';
export { MicrosoftProvider } from './providers/microsoft';
export { SuperMail } from './SuperMail';
export * from './types';
