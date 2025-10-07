/**
 * SuperMail - Unified email client for Gmail and Microsoft Graph
 */

import { IEmailProvider } from './provider';
import {
  EmailProviderConfig,
  EmailMessage,
  SendEmailOptions,
  ListEmailsOptions,
  ListEmailsResponse,
  EmailFolder,
  EmailLabel,
  MoveEmailOptions,
  AddLabelsOptions,
  RemoveLabelsOptions,
  BatchOperationOptions,
} from './types';
import { GmailProvider } from './providers/gmail';
import { MicrosoftProvider } from './providers/microsoft';

export class SuperMail implements IEmailProvider {
  private provider: IEmailProvider;

  constructor(config: EmailProviderConfig) {
    this.provider = this.createProvider(config);
  }

  private createProvider(config: EmailProviderConfig): IEmailProvider {
    switch (config.type) {
      case 'gmail':
        return new GmailProvider(config);
      case 'microsoft':
        return new MicrosoftProvider(config);
      default:
        throw new Error(`Unsupported provider type: ${(config as any).type}`);
    }
  }

  /**
   * Send an email
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailMessage> {
    return this.provider.sendEmail(options);
  }

  /**
   * List emails with optional filters
   */
  async listEmails(options?: ListEmailsOptions): Promise<ListEmailsResponse> {
    return this.provider.listEmails(options);
  }

  /**
   * Get a specific email by ID
   */
  async getEmail(emailId: string): Promise<EmailMessage> {
    return this.provider.getEmail(emailId);
  }

  /**
   * Delete an email by ID
   */
  async deleteEmail(emailId: string): Promise<void> {
    return this.provider.deleteEmail(emailId);
  }

  /**
   * Mark an email as read
   */
  async markAsRead(emailId: string): Promise<void> {
    return this.provider.markAsRead(emailId);
  }

  /**
   * Mark an email as unread
   */
  async markAsUnread(emailId: string): Promise<void> {
    return this.provider.markAsUnread(emailId);
  }

  /**
   * Reply to an email
   */
  async replyToEmail(emailId: string, options: SendEmailOptions): Promise<EmailMessage> {
    return this.provider.replyToEmail(emailId, options);
  }

  // Folder Management
  /**
   * List all folders/mailboxes
   */
  async listFolders(): Promise<EmailFolder[]> {
    return this.provider.listFolders();
  }

  /**
   * Get a specific folder by ID
   */
  async getFolder(folderId: string): Promise<EmailFolder> {
    return this.provider.getFolder(folderId);
  }

  /**
   * Create a new folder
   */
  async createFolder(name: string, parentId?: string): Promise<EmailFolder> {
    return this.provider.createFolder(name, parentId);
  }

  /**
   * Move an email to a folder
   */
  async moveToFolder(options: MoveEmailOptions): Promise<void> {
    return this.provider.moveToFolder(options);
  }

  // Label Management
  /**
   * List all labels/categories
   */
  async listLabels(): Promise<EmailLabel[]> {
    return this.provider.listLabels();
  }

  /**
   * Add labels/categories to an email
   */
  async addLabels(options: AddLabelsOptions): Promise<void> {
    return this.provider.addLabels(options);
  }

  /**
   * Remove labels/categories from an email
   */
  async removeLabels(options: RemoveLabelsOptions): Promise<void> {
    return this.provider.removeLabels(options);
  }

  /**
   * Create a new label/category
   */
  async createLabel(name: string, color?: string): Promise<EmailLabel> {
    return this.provider.createLabel(name, color);
  }

  // Batch Operations
  /**
   * Perform batch operations on multiple emails
   */
  async batchOperation(options: BatchOperationOptions): Promise<void> {
    return this.provider.batchOperation(options);
  }

  /**
   * Archive an email
   */
  async archiveEmail(emailId: string): Promise<void> {
    return this.provider.archiveEmail(emailId);
  }

  /**
   * Move email to trash
   */
  async trashEmail(emailId: string): Promise<void> {
    return this.provider.trashEmail(emailId);
  }
}
