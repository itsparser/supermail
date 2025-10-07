/**
 * Common email types and interfaces for SuperMail
 */

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType: string;
  size?: number;
}

export interface EmailMessage {
  id?: string;
  subject: string;
  from?: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  body: string;
  htmlBody?: string;
  attachments?: EmailAttachment[];
  date?: Date;
  isRead?: boolean;
  labels?: string[];
  threadId?: string;
}

export interface SendEmailOptions {
  subject: string;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  body: string;
  htmlBody?: string;
  attachments?: EmailAttachment[];
  replyTo?: EmailAddress;
}

export interface ListEmailsOptions {
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
  query?: string;
  unreadOnly?: boolean;
}

export interface ListEmailsResponse {
  messages: EmailMessage[];
  nextPageToken?: string;
  totalCount?: number;
}

export interface ProviderConfig {
  type: 'gmail' | 'microsoft' | 'imap';
}

export interface GmailConfig extends ProviderConfig {
  type: 'gmail';
  credentials: Record<string, unknown>;
  token?: Record<string, unknown>;
}

export interface MicrosoftConfig extends ProviderConfig {
  type: 'microsoft';
  clientId: string;
  clientSecret: string;
  tenantId: string;
  accessToken?: string;
}

export interface ImapConfig extends ProviderConfig {
  type: 'imap';
  imap: {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
  };
  smtp: {
    host: string;
    port: number;
    secure?: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
}

export type EmailProviderConfig = GmailConfig | MicrosoftConfig | ImapConfig;

export interface EmailFolder {
  id: string;
  name: string;
  parentId?: string;
  unreadCount?: number;
  totalCount?: number;
}

export interface EmailLabel {
  id: string;
  name: string;
  color?: string;
  type?: 'system' | 'user';
}

export interface EmailCategory {
  id: string;
  name: string;
  color?: string;
}

export interface MoveEmailOptions {
  emailId: string;
  folderId: string;
}

export interface AddLabelsOptions {
  emailId: string;
  labelIds: string[];
}

export interface RemoveLabelsOptions {
  emailId: string;
  labelIds: string[];
}

export interface BatchOperationOptions {
  emailIds: string[];
  operation: 'delete' | 'markRead' | 'markUnread' | 'archive';
  folderId?: string;
  labelIds?: string[];
}
