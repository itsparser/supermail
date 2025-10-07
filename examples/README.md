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

   **Step 1: Register Application in Azure Portal**
   - Go to [Azure App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
   - Click "New registration"
   - Name: Your app name (e.g., "SuperMail Integration")
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI:
     - Platform: **Web**
     - URI: `http://localhost:3000/oauth2callback`

   **Step 2: Add API Permissions**
   - Go to "API permissions" → "Add a permission" → "Microsoft Graph" → "Delegated permissions"
   - Add these permissions:
     - `Mail.Read`
     - `Mail.ReadWrite`
     - `Mail.Send`
     - `MailboxSettings.Read`
   - Click "Add permissions"

   **Step 3: Create Client Secret**
   - Go to "Certificates & secrets" → "New client secret"
   - Description: SuperMail Token
   - Expires: Choose duration (recommended: 24 months)
   - **Copy the secret VALUE immediately** - it won't be shown again!

   **Step 4: Get Your IDs**
   - From the "Overview" page, copy:
     - **Application (client) ID**
     - **Directory (tenant) ID**

   **Step 5: Add to .env**

   ```env
   MICROSOFT_CLIENT_ID=your_application_client_id
   MICROSOFT_CLIENT_SECRET=your_client_secret_value
   MICROSOFT_TENANT_ID=common  # or your specific tenant ID
   ```

   **Step 6: Generate Access Token**

   ```bash
   npm run generate:microsoft-token
   ```

   This will:
   - Open your browser for Microsoft sign-in
   - Start a local server to receive the OAuth callback
   - Display your access token
   - Copy the token to your `.env` file

   The script generates:
   - `MICROSOFT_ACCESS_TOKEN` - Valid for ~60 minutes

   **Scopes Requested:**
   - `Mail.Read` - Read emails
   - `Mail.ReadWrite` - Modify emails
   - `Mail.Send` - Send emails
   - `MailboxSettings.Read` - Read mailbox settings
   - `offline_access` - Get refresh token for automatic renewal

## Token Generation

### Microsoft Graph Token Generator

Generate OAuth tokens for Microsoft Graph (Outlook) integration:

```bash
npm run generate:microsoft-token
```

**Prerequisites:**

- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and `MICROSOFT_TENANT_ID` in your `.env` file

**How it works:**

1. The script starts a local server on port 3000
2. Opens an authorization URL for Microsoft sign-in
3. You sign in with your Microsoft account and authorize the app
4. Microsoft redirects to the local server with an authorization code
5. The script exchanges the code for access tokens
6. Tokens are displayed in the terminal - copy them to your `.env` file

**Output:**

```env
MICROSOFT_ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJub...
MICROSOFT_REFRESH_TOKEN=0.AXoA...  # Optional, if offline_access was granted
```

**Notes:**
- Access tokens expire after ~60 minutes
- Refresh tokens can be used to get new access tokens automatically
- Use `tenant_id=common` for personal and work/school accounts
- Use your specific tenant ID for organization-only access

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
