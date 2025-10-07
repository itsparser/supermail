/**
 * IMAP/SMTP provider implementation
 */

import * as Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import * as nodemailer from 'nodemailer';
import { IEmailProvider } from '../provider';
import {
  EmailMessage,
  SendEmailOptions,
  ListEmailsOptions,
  ListEmailsResponse,
  EmailAddress,
  ImapConfig,
  EmailFolder,
  EmailLabel,
  MoveEmailOptions,
  AddLabelsOptions,
  RemoveLabelsOptions,
  BatchOperationOptions,
} from '../types';
import { normalizeError, SuperMailError, ErrorCode } from '../errors';

export class ImapProvider implements IEmailProvider {
  private imap: Imap;
  private smtp: nodemailer.Transporter;
  private connected: boolean = false;

  constructor(private config: ImapConfig) {
    this.imap = new Imap(config.imap);
    this.smtp = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure !== false,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    });
  }

  private async connect(): Promise<void> {
    if (this.connected) return;

    return new Promise((resolve, reject) => {
      this.imap.once('ready', () => {
        this.connected = true;
        resolve();
      });

      this.imap.once('error', (err: Error) => {
        reject(normalizeError(err, 'imap'));
      });

      this.imap.connect();
    });
  }

  private async disconnect(): Promise<void> {
    if (!this.connected) return;

    return new Promise((resolve) => {
      this.imap.end();
      this.connected = false;
      resolve();
    });
  }

  private async openBox(boxName: string = 'INBOX'): Promise<Imap.Box> {
    return new Promise((resolve, reject) => {
      this.imap.openBox(boxName, false, (err: Error, box: Imap.Box) => {
        if (err) reject(normalizeError(err, 'imap'));
        else resolve(box);
      });
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailMessage> {
    try {
      const mailOptions = {
        from: `${this.config.smtp.user}`,
        to: options.to.map(this.formatEmailAddress).join(', '),
        cc: options.cc?.map(this.formatEmailAddress).join(', '),
        bcc: options.bcc?.map(this.formatEmailAddress).join(', '),
        subject: options.subject,
        text: options.body,
        html: options.htmlBody,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      };

      const info = await this.smtp.sendMail(mailOptions);

      return {
        id: info.messageId,
        subject: options.subject,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        body: options.body,
        htmlBody: options.htmlBody,
        date: new Date(),
      };
    } catch (error) {
      throw normalizeError(error, 'imap');
    }
  }

  async listEmails(options: ListEmailsOptions = {}): Promise<ListEmailsResponse> {
    try {
      await this.connect();
      await this.openBox('INBOX');

      const searchCriteria = this.buildSearchCriteria(options);
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT'],
        struct: true,
      };

      return new Promise((resolve, reject) => {
        this.imap.search(searchCriteria, (err: Error, uids: number[]) => {
          if (err) {
            reject(normalizeError(err, 'imap'));
            return;
          }

          if (!uids || uids.length === 0) {
            resolve({
              messages: [],
              totalCount: 0,
            });
            return;
          }

          // Apply pagination
          const maxResults = options.maxResults || 100;
          const paginatedUids = uids.slice(0, maxResults);

          const messages: EmailMessage[] = [];
          const fetch = this.imap.fetch(paginatedUids, fetchOptions);

          fetch.on('message', (msg: Imap.ImapMessage, seqno: number) => {
            let buffer = '';

            msg.on('body', (stream: NodeJS.ReadableStream) => {
              stream.on('data', (chunk: Buffer) => {
                buffer += chunk.toString('utf8');
              });
            });

            msg.once('end', () => {
              simpleParser(buffer, (parseErr: Error | null, parsed: ParsedMail) => {
                if (!parseErr && parsed) {
                  messages.push(this.convertParsedMail(parsed, seqno.toString()));
                }
              });
            });
          });

          fetch.once('error', (fetchErr: Error) => {
            reject(normalizeError(fetchErr, 'imap'));
          });

          fetch.once('end', () => {
            resolve({
              messages,
              totalCount: uids.length,
            });
          });
        });
      });
    } catch (error) {
      throw normalizeError(error, 'imap');
    }
  }

  async getEmail(emailId: string): Promise<EmailMessage> {
    try {
      await this.connect();
      await this.openBox('INBOX');

      return new Promise((resolve, reject) => {
        const fetch = this.imap.fetch([parseInt(emailId)], {
          bodies: ['HEADER', 'TEXT'],
          struct: true,
        });

        let buffer = '';

        fetch.on('message', (msg: Imap.ImapMessage) => {
          msg.on('body', (stream: NodeJS.ReadableStream) => {
            stream.on('data', (chunk: Buffer) => {
              buffer += chunk.toString('utf8');
            });
          });

          msg.once('end', () => {
            simpleParser(buffer, (parseErr: Error | null, parsed: ParsedMail) => {
              if (parseErr) {
                reject(normalizeError(parseErr, 'imap'));
              } else if (parsed) {
                resolve(this.convertParsedMail(parsed, emailId));
              }
            });
          });
        });

        fetch.once('error', (err: Error) => {
          reject(normalizeError(err, 'imap'));
        });
      });
    } catch (error) {
      throw normalizeError(error, 'imap');
    }
  }

  async deleteEmail(emailId: string): Promise<void> {
    try {
      await this.connect();
      await this.openBox('INBOX');

      return new Promise((resolve, reject) => {
        this.imap.addFlags([parseInt(emailId)], ['\\Deleted'], (err: Error) => {
          if (err) {
            reject(normalizeError(err, 'imap'));
          } else {
            this.imap.expunge((expungeErr: Error) => {
              if (expungeErr) reject(normalizeError(expungeErr, 'imap'));
              else resolve();
            });
          }
        });
      });
    } catch (error) {
      throw normalizeError(error, 'imap');
    }
  }

  async markAsRead(emailId: string): Promise<void> {
    try {
      await this.connect();
      await this.openBox('INBOX');

      return new Promise((resolve, reject) => {
        this.imap.addFlags([parseInt(emailId)], ['\\Seen'], (err: Error) => {
          if (err) reject(normalizeError(err, 'imap'));
          else resolve();
        });
      });
    } catch (error) {
      throw normalizeError(error, 'imap');
    }
  }

  async markAsUnread(emailId: string): Promise<void> {
    try {
      await this.connect();
      await this.openBox('INBOX');

      return new Promise((resolve, reject) => {
        this.imap.delFlags([parseInt(emailId)], ['\\Seen'], (err: Error) => {
          if (err) reject(normalizeError(err, 'imap'));
          else resolve();
        });
      });
    } catch (error) {
      throw normalizeError(error, 'imap');
    }
  }

  async replyToEmail(emailId: string, options: SendEmailOptions): Promise<EmailMessage> {
    try {
      const originalEmail = await this.getEmail(emailId);

      const replyOptions: SendEmailOptions = {
        ...options,
        subject: `Re: ${originalEmail.subject}`,
        to: originalEmail.from ? [originalEmail.from] : options.to,
      };

      return this.sendEmail(replyOptions);
    } catch (error) {
      throw normalizeError(error, 'imap');
    }
  }

  // Folder Management
  async listFolders(): Promise<EmailFolder[]> {
    try {
      await this.connect();

      return new Promise((resolve, reject) => {
        this.imap.getBoxes((err: Error, boxes: Imap.MailBoxes) => {
          if (err) {
            reject(normalizeError(err, 'imap'));
          } else {
            const folders = this.flattenBoxes(boxes);
            resolve(folders);
          }
        });
      });
    } catch (error) {
      throw normalizeError(error, 'imap');
    }
  }

  async getFolder(folderId: string): Promise<EmailFolder> {
    try {
      await this.connect();
      const box = await this.openBox(folderId);

      return {
        id: folderId,
        name: folderId,
        unreadCount: box.messages.unseen,
        totalCount: box.messages.total,
      };
    } catch (error) {
      throw normalizeError(error, 'imap');
    }
  }

  async createFolder(name: string, _parentId?: string): Promise<EmailFolder> {
    try {
      await this.connect();

      return new Promise((resolve, reject) => {
        this.imap.addBox(name, (err: Error) => {
          if (err) {
            reject(normalizeError(err, 'imap'));
          } else {
            resolve({
              id: name,
              name: name,
            });
          }
        });
      });
    } catch (error) {
      throw normalizeError(error, 'imap');
    }
  }

  async moveToFolder(options: MoveEmailOptions): Promise<void> {
    try {
      await this.connect();
      await this.openBox('INBOX');

      return new Promise((resolve, reject) => {
        this.imap.move([parseInt(options.emailId)], options.folderId, (err: Error) => {
          if (err) reject(normalizeError(err, 'imap'));
          else resolve();
        });
      });
    } catch (error) {
      throw normalizeError(error, 'imap');
    }
  }

  // Label Management (IMAP uses flags, limited support)
  async listLabels(): Promise<EmailLabel[]> {
    // IMAP doesn't have labels like Gmail, return standard flags
    return [
      { id: '\\Seen', name: 'Read', type: 'system' },
      { id: '\\Flagged', name: 'Starred', type: 'system' },
      { id: '\\Draft', name: 'Draft', type: 'system' },
      { id: '\\Answered', name: 'Answered', type: 'system' },
    ];
  }

  async addLabels(options: AddLabelsOptions): Promise<void> {
    try {
      await this.connect();
      await this.openBox('INBOX');

      return new Promise((resolve, reject) => {
        this.imap.addFlags([parseInt(options.emailId)], options.labelIds, (err: Error) => {
          if (err) reject(normalizeError(err, 'imap'));
          else resolve();
        });
      });
    } catch (error) {
      throw normalizeError(error, 'imap');
    }
  }

  async removeLabels(options: RemoveLabelsOptions): Promise<void> {
    try {
      await this.connect();
      await this.openBox('INBOX');

      return new Promise((resolve, reject) => {
        this.imap.delFlags([parseInt(options.emailId)], options.labelIds, (err: Error) => {
          if (err) reject(normalizeError(err, 'imap'));
          else resolve();
        });
      });
    } catch (error) {
      throw normalizeError(error, 'imap');
    }
  }

  async createLabel(_name: string, _color?: string): Promise<EmailLabel> {
    // IMAP doesn't support custom labels
    throw new SuperMailError(
      ErrorCode.OPERATION_FAILED,
      'IMAP does not support creating custom labels. Use folders instead.',
      'imap'
    );
  }

  // Batch Operations
  async batchOperation(options: BatchOperationOptions): Promise<void> {
    try {
      const operations = options.emailIds.map((emailId) => {
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

      await Promise.all(operations);
    } catch (error) {
      throw normalizeError(error, 'imap');
    }
  }

  async archiveEmail(emailId: string): Promise<void> {
    try {
      // Move to Archive folder if it exists
      await this.moveToFolder({
        emailId,
        folderId: 'Archive',
      });
    } catch (error) {
      // If Archive folder doesn't exist, just remove from INBOX
      await this.connect();
      await this.openBox('INBOX');

      return new Promise((resolve, reject) => {
        this.imap.addFlags([parseInt(emailId)], ['\\Deleted'], (err: Error) => {
          if (err) reject(normalizeError(err, 'imap'));
          else resolve();
        });
      });
    }
  }

  async trashEmail(emailId: string): Promise<void> {
    try {
      await this.moveToFolder({
        emailId,
        folderId: 'Trash',
      });
    } catch (error) {
      // Fallback to delete
      await this.deleteEmail(emailId);
    }
  }

  // Helper methods
  private formatEmailAddress(addr: EmailAddress): string {
    return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
  }

  private buildSearchCriteria(options: ListEmailsOptions): any[] {
    const criteria: any[] = ['ALL'];

    if (options.unreadOnly) {
      return ['UNSEEN'];
    }

    if (options.query) {
      // Basic query support
      criteria.push(['SUBJECT', options.query]);
    }

    return criteria;
  }

  private convertParsedMail(parsed: ParsedMail, id: string): EmailMessage {
    return {
      id,
      subject: parsed.subject || '',
      from: parsed.from?.value[0]
        ? {
            email: parsed.from.value[0].address || '',
            name: parsed.from.value[0].name,
          }
        : undefined,
      to:
        parsed.to?.value.map((addr) => ({
          email: addr.address || '',
          name: addr.name,
        })) || [],
      cc:
        parsed.cc?.value.map((addr) => ({
          email: addr.address || '',
          name: addr.name,
        })) || [],
      body: parsed.text || '',
      htmlBody: parsed.html ? parsed.html.toString() : undefined,
      attachments: parsed.attachments?.map((att) => ({
        filename: att.filename || 'attachment',
        content: att.content,
        contentType: att.contentType,
        size: att.size,
      })),
      date: parsed.date || new Date(),
      isRead: false, // IMAP flags would need separate fetch
    };
  }

  private flattenBoxes(boxes: Imap.MailBoxes, parentPath: string = ''): EmailFolder[] {
    const folders: EmailFolder[] = [];

    for (const [name, box] of Object.entries(boxes)) {
      const fullPath = parentPath ? `${parentPath}/${name}` : name;

      folders.push({
        id: fullPath,
        name: name,
        parentId: parentPath || undefined,
      });

      if (box.children) {
        folders.push(...this.flattenBoxes(box.children, fullPath));
      }
    }

    return folders;
  }
}
