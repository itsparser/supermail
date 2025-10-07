# SuperMail Examples

This directory contains working examples demonstrating how to use SuperMail with different email providers.

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

3. **Add your credentials to `.env`:**

   ### Gmail Setup

   **Step 1: Create OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Enable Gmail API
   - Create OAuth 2.0 credentials (Desktop app or Web app)
   - Add `http://localhost:3000/oauth2callback` as a redirect URI
   - Copy the Client ID and Client Secret

   **Step 2: Add to .env**

   ```env
   GMAIL_CLIENT_ID=your_client_id_here
   GMAIL_CLIENT_SECRET=your_client_secret_here
   ```

   **Step 3: Generate Tokens**

   ```bash
   npm run generate:google-token
   ```

   This will:
   - Open your browser for authorization
   - Start a local server to receive the OAuth callback
   - Display your access and refresh tokens
   - Simply copy the tokens to your `.env` file

   The script generates:
   - `GMAIL_ACCESS_TOKEN` - Valid for 1 hour
   - `GMAIL_REFRESH_TOKEN` - Used to automatically get new access tokens
   - `GMAIL_REDIRECT_URI` - Set to `http://localhost:3000/oauth2callback`
   
   **Scopes Requested:**
   - Full Gmail access (`https://mail.google.com/`)
   - This includes: reading, sending, modifying emails, and **creating/managing labels**
   - Note: Creating labels requires full Gmail scope, not just the read-only scopes

   ### Microsoft Graph Setup

   - Go to [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
   - Register an application
   - Add Mail.ReadWrite and Mail.Send permissions
   - Add your credentials to `.env`
   - Run OAuth flow to get access token

## Token Generation

### Google OAuth Token Generator

Generate OAuth tokens for Gmail integration:

```bash
npm run generate:google-token
```

**Prerequisites:**

- `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` in your `.env` file

**How it works:**

1. The script starts a local server on port 3000
2. Opens an authorization URL in your browser (you may need to copy/paste it)
3. You authorize the application
4. Google redirects to the local server with an authorization code
5. The script exchanges the code for access and refresh tokens
6. Tokens are displayed in the terminal - copy them to your `.env` file

**Output:**

```env
GMAIL_ACCESS_TOKEN=ya29.a0AfH6SMB...
GMAIL_REFRESH_TOKEN=1//0gX...
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback
```

## Running Examples

### Basic Examples

#### Gmail Example

```bash
npm run gmail
```

Simple example demonstrating:

- Listing recent emails
- Sending an email
- Getting email details
- Marking emails as read

#### Microsoft Graph Example

```bash
npm run microsoft
```

Simple example demonstrating:

- Listing recent emails
- Sending an email
- Getting email details
- Marking emails as read/unread

### Complete Feature Example

#### Run with Gmail

```bash
npm run complete:gmail
```

#### Run with Microsoft

```bash
npm run complete:microsoft
```

The complete example demonstrates **ALL SuperMail features**:

#### 📧 Email Operations

- ✅ List emails with filters
- ✅ Send emails (plain text, HTML, attachments)
- ✅ Get specific email by ID
- ✅ Reply to emails
- ✅ Delete emails
- ✅ Mark as read/unread

#### 📁 Folder Management

- ✅ List all folders/mailboxes
- ✅ Get folder details
- ✅ Create new folders
- ✅ Move emails to folders

#### 🏷️ Label/Category Management

- ✅ List all labels (Gmail) / categories (Microsoft)
- ✅ Create new labels/categories
- ✅ Add labels to emails
- ✅ Remove labels from emails

#### ⚡ Batch Operations

- ✅ Batch delete multiple emails
- ✅ Batch mark as read/unread
- ✅ Batch archive emails

#### 🗂️ Advanced Operations

- ✅ Archive emails
- ✅ Move to trash
- ✅ Attachment support

### Error Handling

All examples show how to handle:

- `AuthenticationError` - Invalid or expired tokens
- `RateLimitError` - API rate limits exceeded
- Generic errors

## Notes

- Both providers use the same unified interface
- Only access tokens are required at runtime
- Errors are normalized across providers
- All operations work identically regardless of provider
