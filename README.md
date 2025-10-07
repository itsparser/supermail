# SuperMail 📧

> A unified, provider-agnostic email library for Node.js that works seamlessly with Gmail and Microsoft Graph APIs.

SuperMail provides a single, consistent interface for email operations across multiple providers. Write your email logic once, and switch providers with just a configuration change.

## ✨ Features

- 🔄 **Unified Interface** - Same API for Gmail and Microsoft Graph
- 📧 **Complete Email Operations** - Send, receive, reply, delete, and more
- 📁 **Folder Management** - Create, list, and organize folders/mailboxes
- 🏷️ **Label/Category Support** - Tag and categorize emails
- ⚡ **Batch Operations** - Efficiently process multiple emails at once
- 📎 **Attachment Support** - Send and receive file attachments
- 🛡️ **Error Handling** - Normalized error handling across providers
- 🔐 **OAuth2 Ready** - Simple token-based authentication
- 📦 **TypeScript First** - Full type safety and IntelliSense support

## 📦 Installation

```bash
npm install supermail
```

## 🚀 Quick Start

### Gmail

```typescript
import { SuperMail } from 'supermail';

const client = new SuperMail({
  type: 'gmail',
  credentials: {
    client_id: 'your-client-id',
    client_secret: 'your-client-secret',
    redirect_uri: 'your-redirect-uri'
  },
  token: {
    access_token: 'your-access-token',
    refresh_token: 'your-refresh-token'
  }
});

// List emails
const emails = await client.listEmails({ maxResults: 10 });

// Send email
await client.sendEmail({
  subject: 'Hello World',
  to: [{ email: 'recipient@example.com' }],
  body: 'This is a test email'
});
```

### Microsoft Graph

```typescript
import { SuperMail } from 'supermail';

const client = new SuperMail({
  type: 'microsoft',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  tenantId: 'your-tenant-id',
  accessToken: 'your-access-token'
});

// Same API as Gmail!
const emails = await client.listEmails({ maxResults: 10 });
```

## 📖 API Reference

### Email Operations

#### Send Email

```typescript
await client.sendEmail({
  subject: 'Project Update',
  to: [
    { email: 'alice@example.com', name: 'Alice' },
    { email: 'bob@example.com', name: 'Bob' }
  ],
  cc: [{ email: 'manager@example.com' }],
  body: 'Plain text body',
  htmlBody: '<h1>HTML body</h1>',
  attachments: [{
    filename: 'report.pdf',
    content: fileBuffer,
    contentType: 'application/pdf'
  }]
});
```

#### List Emails

```typescript
const result = await client.listEmails({
  maxResults: 50,
  unreadOnly: true,
  query: 'subject:important',
  pageToken: 'next-page-token' // for pagination
});

console.log(result.messages);
console.log(result.nextPageToken);
console.log(result.totalCount);
```

#### Get Email

```typescript
const email = await client.getEmail('email-id');

console.log(email.subject);
console.log(email.from);
console.log(email.body);
console.log(email.attachments);
```

#### Reply to Email

```typescript
await client.replyToEmail('email-id', {
  subject: 'Re: Original Subject',
  to: [{ email: 'sender@example.com' }],
  body: 'Thank you for your email...'
});
```

#### Delete Email

```typescript
await client.deleteEmail('email-id');
```

#### Mark as Read/Unread

```typescript
await client.markAsRead('email-id');
await client.markAsUnread('email-id');
```

### Folder Management

#### List Folders

```typescript
const folders = await client.listFolders();

folders.forEach(folder => {
  console.log(folder.name);
  console.log(`Unread: ${folder.unreadCount}`);
  console.log(`Total: ${folder.totalCount}`);
});
```

#### Create Folder

```typescript
const folder = await client.createFolder('Projects');

// Create nested folder
const subFolder = await client.createFolder('2024', folder.id);
```

#### Move Email to Folder

```typescript
await client.moveToFolder({
  emailId: 'email-id',
  folderId: 'folder-id'
});
```

#### Get Folder Details

```typescript
const folder = await client.getFolder('folder-id');
console.log(folder.name, folder.unreadCount);
```

### Label/Category Management

#### List Labels

```typescript
const labels = await client.listLabels();

labels.forEach(label => {
  console.log(label.name);
  console.log(label.type); // 'system' or 'user'
  console.log(label.color);
});
```

#### Create Label

```typescript
const label = await client.createLabel('Important', '#ff0000');
```

#### Add Labels to Email

```typescript
await client.addLabels({
  emailId: 'email-id',
  labelIds: ['label-1', 'label-2']
});
```

#### Remove Labels from Email

```typescript
await client.removeLabels({
  emailId: 'email-id',
  labelIds: ['label-1']
});
```

### Batch Operations

#### Batch Process Emails

```typescript
await client.batchOperation({
  emailIds: ['id-1', 'id-2', 'id-3'],
  operation: 'markRead' // 'delete', 'markRead', 'markUnread', 'archive'
});
```

### Advanced Operations

#### Archive Email

```typescript
await client.archiveEmail('email-id');
```

#### Move to Trash

```typescript
await client.trashEmail('email-id');
```

## 🛡️ Error Handling

SuperMail provides normalized error handling across all providers:

```typescript
import {
  SuperMail,
  AuthenticationError,
  RateLimitError,
  NotFoundError
} from 'supermail';

try {
  await client.sendEmail(options);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Token expired or invalid');
    // Refresh token
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded');
    console.log(`Retry after: ${error.retryAfter} seconds`);
  } else if (error instanceof NotFoundError) {
    console.error('Email not found');
  }
}
```

### Available Error Classes

- `SuperMailError` - Base error class
- `AuthenticationError` - Authentication failures
- `RateLimitError` - Rate limit exceeded
- `NotFoundError` - Resource not found
- `ValidationError` - Invalid input

## 🔐 Authentication

### Gmail OAuth2

1. Create credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Enable Gmail API
3. Get OAuth2 credentials
4. Implement OAuth flow to get access/refresh tokens
5. Pass tokens to SuperMail

```typescript
const client = new SuperMail({
  type: 'gmail',
  credentials: {
    client_id: process.env.GMAIL_CLIENT_ID,
    client_secret: process.env.GMAIL_CLIENT_SECRET,
    redirect_uri: process.env.GMAIL_REDIRECT_URI
  },
  token: {
    access_token: process.env.GMAIL_ACCESS_TOKEN,
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  }
});
```

### Microsoft Graph OAuth2

1. Register app in [Azure Portal](https://portal.azure.com)
2. Add Mail.ReadWrite and Mail.Send permissions
3. Get client credentials
4. Implement OAuth flow to get access token
5. Pass token to SuperMail

```typescript
const client = new SuperMail({
  type: 'microsoft',
  clientId: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  tenantId: process.env.MICROSOFT_TENANT_ID,
  accessToken: process.env.MICROSOFT_ACCESS_TOKEN
});
```

## 📊 TypeScript Support

SuperMail is written in TypeScript and provides full type definitions:

```typescript
import {
  SuperMail,
  EmailMessage,
  SendEmailOptions,
  EmailFolder,
  EmailLabel
} from 'supermail';

const options: SendEmailOptions = {
  subject: 'Typed Email',
  to: [{ email: 'user@example.com' }],
  body: 'Fully typed!'
};

const message: EmailMessage = await client.sendEmail(options);
```

## 🎯 Use Cases

### Multi-Tenant Email Platform

```typescript
function getEmailClient(tenant: Tenant) {
  if (tenant.provider === 'gmail') {
    return new SuperMail({
      type: 'gmail',
      credentials: tenant.gmailCredentials,
      token: tenant.gmailToken
    });
  } else {
    return new SuperMail({
      type: 'microsoft',
      clientId: tenant.microsoftClientId,
      clientSecret: tenant.microsoftClientSecret,
      tenantId: tenant.microsoftTenantId,
      accessToken: tenant.microsoftToken
    });
  }
}

// Same code works for all tenants
const client = getEmailClient(tenant);
await client.sendEmail(emailOptions);
```

### Email Automation

```typescript
// Archive old emails
const emails = await client.listEmails({ maxResults: 100 });
const oldEmails = emails.messages
  .filter(e => isOlderThanDays(e.date, 30))
  .map(e => e.id!);

await client.batchOperation({
  emailIds: oldEmails,
  operation: 'archive'
});
```

### Email Organization

```typescript
// Auto-label emails from specific sender
const emails = await client.listEmails({
  query: 'from:boss@company.com'
});

const importantLabel = await client.createLabel('From Boss', '#ff0000');

for (const email of emails.messages) {
  await client.addLabels({
    emailId: email.id!,
    labelIds: [importantLabel.id]
  });
}
```

## 🧪 Examples

Check out the [examples](./examples) directory for complete working examples:

- **Basic Examples**
  - `gmail-example.ts` - Gmail-specific example
  - `microsoft-example.ts` - Microsoft-specific example

- **Complete Example**
  - `complete-example.ts` - Demonstrates ALL features

Run examples:

```bash
cd examples
npm install
cp .env.example .env
# Add your credentials to .env

npm run gmail              # Run Gmail example
npm run microsoft          # Run Microsoft example
npm run complete:gmail     # Run complete example with Gmail
npm run complete:microsoft # Run complete example with Microsoft
```

## 📝 Provider Differences

SuperMail abstracts provider differences, but it's helpful to understand how features map:

| Feature | Gmail | Microsoft Graph |
|---------|-------|-----------------|
| Folders | Labels (system) | Native folders |
| Labels/Tags | Labels (user) | Categories |
| Archive | Remove INBOX label | Move to Archive folder |
| Trash | Move to TRASH | Move to Deleted Items |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT

## 🔗 Links

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Microsoft Graph Mail API](https://docs.microsoft.com/en-us/graph/api/resources/mail-api-overview)
- [Examples](./examples)

## 🙏 Acknowledgments

Built with:
- [googleapis](https://www.npmjs.com/package/googleapis) - Google APIs client
- [@microsoft/microsoft-graph-client](https://www.npmjs.com/package/@microsoft/microsoft-graph-client) - Microsoft Graph client

---

Made with ❤️ for developers who want to build email applications without vendor lock-in.
