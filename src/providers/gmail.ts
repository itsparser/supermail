/**
 * Gmail provider implementation
 */

import { google } from 'googleapis';
import { gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { normalizeError } from '../errors';
import { IEmailProvider } from '../provider';
import {
  AddLabelsOptions,
  BatchOperationOptions,
  EmailAddress,
  EmailAttachment,
  EmailFolder,
  EmailLabel,
  EmailMessage,
  GmailConfig,
  ListEmailsOptions,
  ListEmailsResponse,
  MoveEmailOptions,
  RemoveLabelsOptions,
  SendEmailOptions,
} from '../types';

// Gmail API type aliases from googleapis
type GmailMessage = gmail_v1.Schema$Message;
type GmailMessagePart = gmail_v1.Schema$MessagePart;
type GmailMessagePartHeader = gmail_v1.Schema$MessagePartHeader;
type GmailLabel = gmail_v1.Schema$Label;

interface GmailLabelCreateRequest {
  name: string;
  labelListVisibility: string;
  messageListVisibility: string;
  color?: {
    backgroundColor: string;
    textColor: string;
  };
}

export class GmailProvider implements IEmailProvider {
  private gmail: gmail_v1.Gmail;
  private auth: OAuth2Client;

  constructor(private config: GmailConfig) {
    const credentials = config.credentials as Record<string, unknown>;
    this.auth = new google.auth.OAuth2(
      credentials.client_id as string,
      credentials.client_secret as string,
      credentials.redirect_uri as string
    );

    if (config.token) {
      this.auth.setCredentials(config.token);
    }

    this.gmail = google.gmail({ version: 'v1', auth: this.auth });
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailMessage> {
    try {
      const message = this.createMimeMessage(options);
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      // Gmail API doesn't return the full message payload on send,
      // so we construct the response from what we sent
      return {
        id: response.data.id ?? undefined,
        threadId: response.data.threadId ?? undefined,
        subject: options.subject,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        body: options.body,
        htmlBody: options.htmlBody,
        date: new Date(),
        labels: response.data.labelIds || [],
      };
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  async listEmails(options: ListEmailsOptions = {}): Promise<ListEmailsResponse> {
    try {
      const query = this.buildQuery(options);

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: options.maxResults || 100,
        pageToken: options.pageToken,
        labelIds: options.labelIds,
        q: query,
      });

      const messages: EmailMessage[] = [];

      if (response.data.messages) {
        for (const msg of response.data.messages) {
          if (msg.id) {
            const fullMessage = await this.getEmail(msg.id);
            messages.push(fullMessage);
          }
        }
      }

      return {
        messages,
        nextPageToken: response.data.nextPageToken ?? undefined,
        totalCount: response.data.resultSizeEstimate ?? undefined,
      };
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  async getEmail(emailId: string): Promise<EmailMessage> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full',
      });

      return this.convertGmailMessage(response.data);
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  async deleteEmail(emailId: string): Promise<void> {
    try {
      await this.gmail.users.messages.delete({
        userId: 'me',
        id: emailId,
      });
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  async markAsRead(emailId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  async markAsUnread(emailId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          addLabelIds: ['UNREAD'],
        },
      });
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  async replyToEmail(emailId: string, options: SendEmailOptions): Promise<EmailMessage> {
    try {
      const originalMessage = await this.getEmail(emailId);

      const message = this.createMimeMessage(
        {
          ...options,
          subject: `Re: ${originalMessage.subject}`,
        },
        originalMessage.threadId
      );

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
          threadId: originalMessage.threadId,
        },
      });

      // Gmail API doesn't return the full message payload on send,
      // so we construct the response from what we sent
      return {
        id: response.data.id ?? undefined,
        threadId: response.data.threadId ?? undefined,
        subject: `Re: ${originalMessage.subject}`,
        to: options.to,
        cc: options.cc,
        body: options.body,
        htmlBody: options.htmlBody,
        date: new Date(),
        labels: response.data.labelIds || [],
      };
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  private createMimeMessage(options: SendEmailOptions, _threadId?: string): string {
    const boundary = '----=_Part_' + Date.now();
    const hasAttachments = options.attachments && options.attachments.length > 0;
    const contentType = hasAttachments
      ? `multipart/mixed; boundary="${boundary}"`
      : `multipart/alternative; boundary="${boundary}"`;

    const headers = [
      `To: ${options.to.map(this.formatEmailAddress).join(', ')}`,
      options.cc ? `Cc: ${options.cc.map(this.formatEmailAddress).join(', ')}` : '',
      options.bcc ? `Bcc: ${options.bcc.map(this.formatEmailAddress).join(', ')}` : '',
      `Subject: ${options.subject}`,
      'MIME-Version: 1.0',
      `Content-Type: ${contentType}`,
    ]
      .filter(Boolean)
      .join('\r\n');

    let body = `${headers}\r\n\r\n`;

    if (hasAttachments) {
      // Create nested boundary for text/html content
      const innerBoundary = '----=_Part_Inner_' + Date.now();
      body += `--${boundary}\r\n`;
      body += `Content-Type: multipart/alternative; boundary="${innerBoundary}"\r\n\r\n`;

      // Text part
      body += `--${innerBoundary}\r\n`;
      body += 'Content-Type: text/plain; charset=UTF-8\r\n\r\n';
      body += `${options.body}\r\n\r\n`;

      // HTML part
      if (options.htmlBody) {
        body += `--${innerBoundary}\r\n`;
        body += 'Content-Type: text/html; charset=UTF-8\r\n\r\n';
        body += `${options.htmlBody}\r\n\r\n`;
      }

      body += `--${innerBoundary}--\r\n\r\n`;

      // Attachments
      for (const attachment of options.attachments!) {
        body += `--${boundary}\r\n`;
        body += `Content-Type: ${attachment.contentType}; name="${attachment.filename}"\r\n`;
        body += 'Content-Transfer-Encoding: base64\r\n';
        body += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n\r\n`;

        const content =
          typeof attachment.content === 'string'
            ? Buffer.from(attachment.content).toString('base64')
            : attachment.content.toString('base64');

        body += `${content}\r\n\r\n`;
      }
    } else {
      // Text part
      body += `--${boundary}\r\n`;
      body += 'Content-Type: text/plain; charset=UTF-8\r\n\r\n';
      body += `${options.body}\r\n\r\n`;

      // HTML part
      if (options.htmlBody) {
        body += `--${boundary}\r\n`;
        body += 'Content-Type: text/html; charset=UTF-8\r\n\r\n';
        body += `${options.htmlBody}\r\n\r\n`;
      }
    }

    body += `--${boundary}--`;

    return body;
  }

  private formatEmailAddress(addr: EmailAddress): string {
    return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
  }

  private buildQuery(options: ListEmailsOptions): string {
    const parts: string[] = [];

    if (options.query) {
      parts.push(options.query);
    }

    if (options.unreadOnly) {
      parts.push('is:unread');
    }

    return parts.join(' ');
  }

  private convertGmailMessage(gmailMsg: GmailMessage): EmailMessage {
    const headers = gmailMsg.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h: GmailMessagePartHeader) => h.name?.toLowerCase() === name.toLowerCase())
        ?.value;

    return {
      id: gmailMsg.id ?? undefined,
      threadId: gmailMsg.threadId ?? undefined,
      subject: getHeader('subject') || '',
      from: this.parseEmailAddress(getHeader('from') ?? undefined),
      to: this.parseEmailAddresses(getHeader('to') ?? undefined),
      cc: this.parseEmailAddresses(getHeader('cc') ?? undefined),
      body: gmailMsg.payload ? this.extractBody(gmailMsg.payload) : '',
      attachments: gmailMsg.payload ? this.extractAttachments(gmailMsg.payload) : undefined,
      date: gmailMsg.internalDate ? new Date(parseInt(gmailMsg.internalDate)) : undefined,
      isRead: !gmailMsg.labelIds?.includes('UNREAD'),
      labels: gmailMsg.labelIds || [],
    };
  }

  private parseEmailAddress(addr?: string): EmailAddress | undefined {
    if (!addr) return undefined;

    const match = addr.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { email: addr.trim() };
  }

  private parseEmailAddresses(addrs?: string): EmailAddress[] {
    if (!addrs) return [];

    return addrs
      .split(',')
      .map(addr => {
        const parsed = this.parseEmailAddress(addr.trim());
        return parsed!;
      })
      .filter(Boolean);
  }

  private extractBody(payload: GmailMessagePart): string {
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }

      for (const part of payload.parts) {
        const body = this.extractBody(part);
        if (body) return body;
      }
    }

    return '';
  }

  private extractAttachments(payload: GmailMessagePart): EmailAttachment[] {
    const attachments: EmailAttachment[] = [];

    const processPayload = (part: GmailMessagePart) => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          contentType: part.mimeType || 'application/octet-stream',
          size: part.body.size ?? undefined,
          // Gmail requires a separate API call to fetch attachment content
          // We store the attachmentId as content for later retrieval
          content: part.body.attachmentId,
        });
      }

      if (part.parts) {
        for (const subPart of part.parts) {
          processPayload(subPart);
        }
      }
    };

    processPayload(payload);
    return attachments;
  }

  // Folder Management (Gmail uses labels, not folders)
  async listFolders(): Promise<EmailFolder[]> {
    try {
      const response = await this.gmail.users.labels.list({
        userId: 'me',
      });

      const labels = response.data.labels || [];
      return labels
        .filter((label: GmailLabel) => label.type === 'system')
        .map((label: GmailLabel) => ({
          id: label.id!,
          name: label.name!,
          unreadCount: label.messagesUnread ?? undefined,
          totalCount: label.messagesTotal ?? undefined,
        }));
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  async getFolder(folderId: string): Promise<EmailFolder> {
    try {
      const response = await this.gmail.users.labels.get({
        userId: 'me',
        id: folderId,
      });

      return {
        id: response.data.id!,
        name: response.data.name!,
        unreadCount: response.data.messagesUnread ?? undefined,
        totalCount: response.data.messagesTotal ?? undefined,
      };
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  async createFolder(name: string, _parentId?: string): Promise<EmailFolder> {
    try {
      const response = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });

      return {
        id: response.data.id!,
        name: response.data.name!,
      };
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  async moveToFolder(options: MoveEmailOptions): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: options.emailId,
        requestBody: {
          addLabelIds: [options.folderId],
        },
      });
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  // Label Management
  async listLabels(): Promise<EmailLabel[]> {
    try {
      const response = await this.gmail.users.labels.list({
        userId: 'me',
      });

      const labels = response.data.labels || [];
      return labels.map((label: GmailLabel) => ({
        id: label.id!,
        name: label.name!,
        color: label.color?.backgroundColor ?? undefined,
        type: label.type === 'system' ? 'system' : 'user',
      }));
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  async addLabels(options: AddLabelsOptions): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: options.emailId,
        requestBody: {
          addLabelIds: options.labelIds,
        },
      });
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  async removeLabels(options: RemoveLabelsOptions): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: options.emailId,
        requestBody: {
          removeLabelIds: options.labelIds,
        },
      });
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  async createLabel(name: string, color?: string): Promise<EmailLabel> {
    try {
      const requestBody: GmailLabelCreateRequest = {
        name,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      };

      if (color) {
        const gmailColor = this.convertToGmailColor(color);
        requestBody.color = gmailColor;
      }

      const response = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody,
      });

      return {
        id: response.data.id!,
        name: response.data.name!,
        color: response.data.color?.backgroundColor ?? undefined,
        type: 'user',
      };
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  /**
   * Convert hex color to Gmail's predefined color palette
   * Gmail only accepts specific colors from its palette
   */
  private convertToGmailColor(hexColor: string): { backgroundColor: string; textColor: string } {
    // Gmail predefined color palette
    const colorPalette: { [key: string]: { backgroundColor: string; textColor: string } } = {
      // Reds
      '#ff0000': { backgroundColor: '#fb4c2f', textColor: '#ffffff' },
      '#fb4c2f': { backgroundColor: '#fb4c2f', textColor: '#ffffff' },
      // Oranges
      '#ff8800': { backgroundColor: '#ffc8af', textColor: '#ffffff' },
      '#ffc8af': { backgroundColor: '#ffc8af', textColor: '#594c05' },
      // Yellows
      '#ffff00': { backgroundColor: '#fad165', textColor: '#594c05' },
      '#fad165': { backgroundColor: '#fad165', textColor: '#594c05' },
      // Greens
      '#00ff00': { backgroundColor: '#16a765', textColor: '#ffffff' },
      '#16a765': { backgroundColor: '#16a765', textColor: '#ffffff' },
      '#7bd148': { backgroundColor: '#7bd148', textColor: '#594c05' },
      // Blues
      '#0000ff': { backgroundColor: '#4986e7', textColor: '#ffffff' },
      '#4986e7': { backgroundColor: '#4986e7', textColor: '#ffffff' },
      '#a4bdfc': { backgroundColor: '#a4bdfc', textColor: '#594c05' },
      // Purples
      '#800080': { backgroundColor: '#b99aff', textColor: '#ffffff' },
      '#b99aff': { backgroundColor: '#b99aff', textColor: '#594c05' },
      // Pinks
      '#ff00ff': { backgroundColor: '#f691b3', textColor: '#ffffff' },
      '#f691b3': { backgroundColor: '#f691b3', textColor: '#ffffff' },
      // Grays
      '#808080': { backgroundColor: '#cabdbf', textColor: '#594c05' },
      '#cabdbf': { backgroundColor: '#cabdbf', textColor: '#594c05' },
    };

    const normalizedColor = hexColor.toLowerCase();

    // Check for exact match
    if (colorPalette[normalizedColor]) {
      return colorPalette[normalizedColor];
    }

    // If no exact match, find closest color by RGB distance
    if (normalizedColor.startsWith('#') && normalizedColor.length === 7) {
      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
      };

      const colorDistance = (
        c1: { r: number; g: number; b: number },
        c2: { r: number; g: number; b: number }
      ) => {
        return Math.sqrt(
          Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2)
        );
      };

      const targetRgb = hexToRgb(normalizedColor);
      let closestColor = { backgroundColor: '#fb4c2f', textColor: '#ffffff' };
      let minDistance = Infinity;

      for (const [paletteHex, colorObj] of Object.entries(colorPalette)) {
        if (paletteHex.startsWith('#')) {
          const distance = colorDistance(targetRgb, hexToRgb(paletteHex));
          if (distance < minDistance) {
            minDistance = distance;
            closestColor = colorObj;
          }
        }
      }

      return closestColor;
    }

    // Default fallback - red
    return { backgroundColor: '#fb4c2f', textColor: '#ffffff' };
  }

  // Batch Operations
  async batchOperation(options: BatchOperationOptions): Promise<void> {
    try {
      const batchRequests = options.emailIds.map(emailId => {
        switch (options.operation) {
          case 'delete':
            return this.deleteEmail(emailId);
          case 'markRead':
            return this.markAsRead(emailId);
          case 'markUnread':
            return this.markAsUnread(emailId);
          case 'archive':
            return this.archiveEmail(emailId);
          default:
            throw new Error(`Unknown operation: ${options.operation}`);
        }
      });

      await Promise.all(batchRequests);
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  async archiveEmail(emailId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          removeLabelIds: ['INBOX'],
        },
      });
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }

  async trashEmail(emailId: string): Promise<void> {
    try {
      await this.gmail.users.messages.trash({
        userId: 'me',
        id: emailId,
      });
    } catch (error) {
      throw normalizeError(error, 'gmail');
    }
  }
}
