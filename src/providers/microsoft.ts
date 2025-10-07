/**
 * Microsoft Graph provider implementation
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { normalizeError } from '../errors';
import { IEmailProvider } from '../provider';
import {
  AddLabelsOptions,
  BatchOperationOptions,
  EmailAddress,
  EmailFolder,
  EmailLabel,
  EmailMessage,
  ListEmailsOptions,
  ListEmailsResponse,
  MicrosoftConfig,
  MoveEmailOptions,
  RemoveLabelsOptions,
  SendEmailOptions,
} from '../types';

export class MicrosoftProvider implements IEmailProvider {
  private client: Client;

  constructor(private config: MicrosoftConfig) {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, config.accessToken || '');
      },
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailMessage> {
    try {
      const message = this.convertToGraphMessage(options);

      await this.client
        .api('/me/sendMail')
        .post({
          message,
          saveToSentItems: true,
        });

      // Graph API doesn't return the sent message, so we create a representation
      return {
        subject: options.subject,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        body: options.body,
        htmlBody: options.htmlBody,
        date: new Date(),
      };
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  async listEmails(options: ListEmailsOptions = {}): Promise<ListEmailsResponse> {
    try {
      let endpoint = '/me/messages';
      const queryParams: string[] = [];

      if (options.maxResults) {
        queryParams.push(`$top=${options.maxResults}`);
      }

      if (options.query) {
        queryParams.push(`$search="${options.query}"`);
      }

      if (options.unreadOnly) {
        queryParams.push(`$filter=isRead eq false`);
      }

      queryParams.push('$orderby=receivedDateTime desc');

      if (queryParams.length > 0) {
        endpoint += `?${queryParams.join('&')}`;
      }

      const response = await this.client.api(endpoint).get();

      const messages = response.value.map((msg: any) => this.convertGraphMessage(msg));

      return {
        messages,
        nextPageToken: response['@odata.nextLink'],
        totalCount: response['@odata.count'],
      };
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  async getEmail(emailId: string): Promise<EmailMessage> {
    try {
      const response = await this.client
        .api(`/me/messages/${emailId}`)
        .get();

      return this.convertGraphMessage(response);
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  async deleteEmail(emailId: string): Promise<void> {
    try {
      await this.client
        .api(`/me/messages/${emailId}`)
        .delete();
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  async markAsRead(emailId: string): Promise<void> {
    try {
      await this.client
        .api(`/me/messages/${emailId}`)
        .patch({
          isRead: true,
        });
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  async markAsUnread(emailId: string): Promise<void> {
    try {
      await this.client
        .api(`/me/messages/${emailId}`)
        .patch({
          isRead: false,
        });
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  async replyToEmail(emailId: string, options: SendEmailOptions): Promise<EmailMessage> {
    try {
      // Microsoft Graph API expects either 'comment' OR 'message', not both
      // Use 'comment' for simple text replies, or 'message' for complex replies with attachments
      const hasAttachments = options.attachments && options.attachments.length > 0;

      if (hasAttachments || options.htmlBody) {
        // Use full message object for complex replies
        await this.client
          .api(`/me/messages/${emailId}/reply`)
          .post({
            message: this.convertToGraphMessage(options),
          });
      } else {
        // Use simple comment for text-only replies
        await this.client
          .api(`/me/messages/${emailId}/reply`)
          .post({
            comment: options.body,
          });
      }

      return {
        subject: options.subject,
        to: options.to,
        cc: options.cc,
        body: options.body,
        htmlBody: options.htmlBody,
        date: new Date(),
      };
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  private convertToGraphMessage(options: SendEmailOptions): any {
    return {
      subject: options.subject,
      body: {
        contentType: options.htmlBody ? 'HTML' : 'Text',
        content: options.htmlBody || options.body,
      },
      toRecipients: options.to.map(this.convertToGraphRecipient),
      ccRecipients: options.cc?.map(this.convertToGraphRecipient) || [],
      bccRecipients: options.bcc?.map(this.convertToGraphRecipient) || [],
      attachments: options.attachments?.map(att => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.filename,
        contentType: att.contentType,
        contentBytes: Buffer.from(att.content).toString('base64'),
      })) || [],
    };
  }

  private convertToGraphRecipient(addr: EmailAddress): any {
    return {
      emailAddress: {
        address: addr.email,
        name: addr.name,
      },
    };
  }

  private convertGraphMessage(graphMsg: any): EmailMessage {
    return {
      id: graphMsg.id,
      subject: graphMsg.subject,
      from: this.convertFromGraphRecipient(graphMsg.from),
      to: graphMsg.toRecipients?.map(this.convertFromGraphRecipient) || [],
      cc: graphMsg.ccRecipients?.map(this.convertFromGraphRecipient) || [],
      body: graphMsg.body?.content || '',
      htmlBody: graphMsg.body?.contentType === 'html' ? graphMsg.body?.content : undefined,
      attachments: graphMsg.hasAttachments
        ? graphMsg.attachments?.map((att: any) => ({
          filename: att.name,
          contentType: att.contentType,
          size: att.size,
          attachmentId: att.id,
        }))
        : undefined,
      date: new Date(graphMsg.receivedDateTime),
      isRead: graphMsg.isRead,
      threadId: graphMsg.conversationId,
      labels: graphMsg.categories || [],
    };
  }

  private convertFromGraphRecipient(recipient: any): EmailAddress {
    if (!recipient) return { email: '' };

    return {
      email: recipient.emailAddress?.address || '',
      name: recipient.emailAddress?.name,
    };
  }

  // Folder Management
  async listFolders(): Promise<EmailFolder[]> {
    try {
      const response = await this.client.api('/me/mailFolders').get();

      return response.value.map((folder: any) => ({
        id: folder.id,
        name: folder.displayName,
        parentId: folder.parentFolderId,
        unreadCount: folder.unreadItemCount,
        totalCount: folder.totalItemCount,
      }));
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  async getFolder(folderId: string): Promise<EmailFolder> {
    try {
      const response = await this.client.api(`/me/mailFolders/${folderId}`).get();

      return {
        id: response.id,
        name: response.displayName,
        parentId: response.parentFolderId,
        unreadCount: response.unreadItemCount,
        totalCount: response.totalItemCount,
      };
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  async createFolder(name: string, parentId?: string): Promise<EmailFolder> {
    try {
      const endpoint = parentId
        ? `/me/mailFolders/${parentId}/childFolders`
        : '/me/mailFolders';

      const response = await this.client.api(endpoint).post({
        displayName: name,
      });

      return {
        id: response.id,
        name: response.displayName,
        parentId: response.parentFolderId,
      };
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  async moveToFolder(options: MoveEmailOptions): Promise<void> {
    try {
      await this.client
        .api(`/me/messages/${options.emailId}/move`)
        .post({
          destinationId: options.folderId,
        });
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  // Category Management (Microsoft's equivalent to labels)
  async listLabels(): Promise<EmailLabel[]> {
    try {
      const response = await this.client.api('/me/outlook/masterCategories').get();

      return response.value.map((category: any) => ({
        id: category.id,
        name: category.displayName,
        color: category.color,
        type: category.preset ? 'system' : 'user',
      }));
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  async addLabels(options: AddLabelsOptions): Promise<void> {
    try {
      // Get category names from IDs
      const categories = await this.listLabels();
      const categoryNames = options.labelIds
        .map(id => categories.find(c => c.id === id)?.name)
        .filter(Boolean);

      await this.client
        .api(`/me/messages/${options.emailId}`)
        .patch({
          categories: categoryNames,
        });
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  async removeLabels(options: RemoveLabelsOptions): Promise<void> {
    try {
      // Get current message
      const message = await this.getEmail(options.emailId);
      const currentCategories = message.labels || [];

      // Get category names from IDs
      const categories = await this.listLabels();
      const categoriesToRemove = options.labelIds
        .map(id => categories.find(c => c.id === id)?.name)
        .filter(Boolean);

      // Filter out categories to remove
      const updatedCategories = currentCategories.filter(
        cat => !categoriesToRemove.includes(cat)
      );

      await this.client
        .api(`/me/messages/${options.emailId}`)
        .patch({
          categories: updatedCategories,
        });
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  async createLabel(name: string, color?: string): Promise<EmailLabel> {
    try {
      // Convert hex color to Microsoft preset if needed
      const presetColor = this.convertColorToPreset(color);

      const response = await this.client.api('/me/outlook/masterCategories').post({
        displayName: name,
        color: presetColor,
      });

      return {
        id: response.id,
        name: response.displayName,
        color: response.color,
        type: 'user',
      };
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  /**
   * Convert hex color to Microsoft preset color
   * Microsoft Graph API only accepts preset color values, not hex codes
   */
  private convertColorToPreset(color?: string): string {
    if (!color) return 'preset0'; // Default to red

    // If already a preset, return as-is
    if (color.startsWith('preset')) return color;

    // Map hex colors to closest Microsoft preset
    const colorMap: { [key: string]: string } = {
      '#ff0000': 'preset0',  // Red
      '#ff4500': 'preset1',  // Orange
      '#8b4513': 'preset2',  // Brown
      '#ffff00': 'preset3',  // Yellow
      '#008000': 'preset4',  // Green
      '#008080': 'preset5',  // Teal
      '#808000': 'preset6',  // Olive
      '#0000ff': 'preset7',  // Blue
      '#800080': 'preset8',  // Purple
      '#9b2d30': 'preset9',  // Cranberry
      '#5a7e9f': 'preset10', // Steel
      '#485c69': 'preset11', // DarkSteel
      '#808080': 'preset12', // Gray
      '#696969': 'preset13', // DarkGray
      '#000000': 'preset14', // Black
      '#8b0000': 'preset15', // DarkRed
      '#ff8c00': 'preset16', // DarkOrange
      '#654321': 'preset17', // DarkBrown
      '#9b870c': 'preset18', // DarkYellow
      '#006400': 'preset19', // DarkGreen
      '#00555a': 'preset20', // DarkTeal
      '#5b5e0a': 'preset21', // DarkOlive
      '#00008b': 'preset22', // DarkBlue
      '#4b0082': 'preset23', // DarkPurple
      '#6f2633': 'preset24', // DarkCranberry
    };

    const normalizedColor = color.toLowerCase();

    // Check for exact match
    if (colorMap[normalizedColor]) {
      return colorMap[normalizedColor];
    }

    // If no exact match, try to find the closest color based on RGB distance
    if (normalizedColor.startsWith('#') && normalizedColor.length === 7) {
      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
      };

      const colorDistance = (c1: { r: number, g: number, b: number }, c2: { r: number, g: number, b: number }) => {
        return Math.sqrt(
          Math.pow(c1.r - c2.r, 2) +
          Math.pow(c1.g - c2.g, 2) +
          Math.pow(c1.b - c2.b, 2)
        );
      };

      const targetRgb = hexToRgb(normalizedColor);
      let closestPreset = 'preset0';
      let minDistance = Infinity;

      for (const [hex, preset] of Object.entries(colorMap)) {
        const distance = colorDistance(targetRgb, hexToRgb(hex));
        if (distance < minDistance) {
          minDistance = distance;
          closestPreset = preset;
        }
      }

      return closestPreset;
    }

    // Default fallback
    return 'preset0';
  }

  // Batch Operations
  async batchOperation(options: BatchOperationOptions): Promise<void> {
    try {
      const batchRequests = options.emailIds.map((emailId) => {
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
      throw normalizeError(error, 'microsoft');
    }
  }

  async archiveEmail(emailId: string): Promise<void> {
    try {
      // Get Archive folder
      const folders = await this.listFolders();
      const archiveFolder = folders.find(f => f.name === 'Archive');

      if (archiveFolder) {
        await this.moveToFolder({
          emailId,
          folderId: archiveFolder.id,
        });
      } else {
        throw new Error('Archive folder not found');
      }
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }

  async trashEmail(emailId: string): Promise<void> {
    try {
      // Move to Deleted Items folder
      const folders = await this.listFolders();
      const trashFolder = folders.find(f => f.name === 'Deleted Items');

      if (trashFolder) {
        await this.moveToFolder({
          emailId,
          folderId: trashFolder.id,
        });
      } else {
        // Fallback to delete
        await this.deleteEmail(emailId);
      }
    } catch (error) {
      throw normalizeError(error, 'microsoft');
    }
  }
}
