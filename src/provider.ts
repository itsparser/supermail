/**
 * Base email provider interface
 */

import {
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

export interface IEmailProvider {
  /**
   * Send an email
   */
  sendEmail(options: SendEmailOptions): Promise<EmailMessage>;

  /**
   * List emails with optional filters
   */
  listEmails(options?: ListEmailsOptions): Promise<ListEmailsResponse>;

  /**
   * Get a specific email by ID
   */
  getEmail(emailId: string): Promise<EmailMessage>;

  /**
   * Delete an email by ID
   */
  deleteEmail(emailId: string): Promise<void>;

  /**
   * Mark an email as read
   */
  markAsRead(emailId: string): Promise<void>;

  /**
   * Mark an email as unread
   */
  markAsUnread(emailId: string): Promise<void>;

  /**
   * Reply to an email
   */
  replyToEmail(emailId: string, options: SendEmailOptions): Promise<EmailMessage>;

  // Folder Management
  /**
   * List all folders/mailboxes
   */
  listFolders(): Promise<EmailFolder[]>;

  /**
   * Get a specific folder by ID
   */
  getFolder(folderId: string): Promise<EmailFolder>;

  /**
   * Create a new folder
   */
  createFolder(name: string, parentId?: string): Promise<EmailFolder>;

  /**
   * Move an email to a folder
   */
  moveToFolder(options: MoveEmailOptions): Promise<void>;

  // Label Management (Gmail) / Categories (Microsoft)
  /**
   * List all labels/categories
   */
  listLabels(): Promise<EmailLabel[]>;

  /**
   * Add labels/categories to an email
   */
  addLabels(options: AddLabelsOptions): Promise<void>;

  /**
   * Remove labels/categories from an email
   */
  removeLabels(options: RemoveLabelsOptions): Promise<void>;

  /**
   * Create a new label (Gmail only)
   */
  createLabel(name: string, color?: string): Promise<EmailLabel>;

  // Batch Operations
  /**
   * Perform batch operations on multiple emails
   */
  batchOperation(options: BatchOperationOptions): Promise<void>;

  /**
   * Archive an email (move to archive folder)
   */
  archiveEmail(emailId: string): Promise<void>;

  /**
   * Move email to trash
   */
  trashEmail(emailId: string): Promise<void>;
}
