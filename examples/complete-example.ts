/**
 * Complete SuperMail Example
 *
 * This comprehensive example demonstrates all available features:
 * - Email operations (send, list, get, delete, reply)
 * - Folder management (list, create, move emails)
 * - Label/Category management (list, create, add/remove labels)
 * - Batch operations (bulk delete, mark read, archive)
 * - Advanced features (archive, trash, attachments)
 */

import 'dotenv/config';
import { AuthenticationError, RateLimitError, SuperMail } from '../src';

async function main() {
  // Choose provider: 'gmail' or 'microsoft'
  const providerType = process.env.PROVIDER || 'gmail';

  console.log(`\n🚀 SuperMail Complete Example - ${providerType.toUpperCase()}\n`);

  // Initialize client
  const client = new SuperMail(
    providerType === 'gmail'
      ? {
        type: 'gmail',
        credentials: {
          client_id: process.env.GMAIL_CLIENT_ID!,
          client_secret: process.env.GMAIL_CLIENT_SECRET!,
          redirect_uri: process.env.GMAIL_REDIRECT_URI!,
        },
        token: {
          access_token: process.env.GMAIL_ACCESS_TOKEN!,
          refresh_token: process.env.GMAIL_REFRESH_TOKEN,
        },
      }
      : {
        type: 'microsoft',
        clientId: process.env.MICROSOFT_CLIENT_ID!,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        tenantId: process.env.MICROSOFT_TENANT_ID!,
        accessToken: process.env.MICROSOFT_ACCESS_TOKEN!,
      }
  );

  try {
    // ========================================
    // 1. FOLDER MANAGEMENT
    // ========================================
    console.log('📁 FOLDER MANAGEMENT\n');

    console.log('Listing all folders...');
    const folders = await client.listFolders();
    console.log(`Found ${folders.length} folders:`);
    folders.slice(0, 5).forEach((folder) => {
      console.log(`  - ${folder.name} (ID: ${folder.id})`);
      console.log(`    Unread: ${folder.unreadCount || 0}, Total: ${folder.totalCount || 0}`);
    });
    console.log('');

    // Create a new folder with unique name
    const timestamp = Date.now();
    const folderName = `SuperMail_Test_${timestamp}`;
    console.log(`Creating a new folder "${folderName}"...`);
    const newFolder = await client.createFolder(folderName);
    console.log(`✓ Created folder: ${newFolder.name} (ID: ${newFolder.id})\n`);

    // ========================================
    // 2. LABEL/CATEGORY MANAGEMENT
    // ========================================
    console.log('🏷️  LABEL MANAGEMENT\n');

    console.log('Listing all labels/categories...');
    const labels = await client.listLabels();
    console.log(`Found ${labels.length} labels:`);
    labels.slice(0, 10).forEach((label) => {
      console.log(`  - ${label.name} (${label.type}) ${label.color ? `[${label.color}]` : ''}`);
    });
    console.log('');

    // Create a new label with unique name
    const labelName = `Important_${Date.now()}`;
    console.log(`Creating a new label "${labelName}"...`);
    let newLabel;
    try {
      newLabel = await client.createLabel(labelName, '#ff0000');
      console.log(`✓ Created label: ${newLabel.name} (ID: ${newLabel.id})\n`);
    } catch (labelError: any) {
      console.log(`⚠️  Could not create label (insufficient permissions or quota exceeded)`);
      console.log(`   Using existing user label for demonstration...\n`);
      // Use an existing user label instead (system labels like CHAT can't be added to messages)
      const userLabels = labels.filter(l => l.type === 'user');
      if (userLabels.length > 0) {
        newLabel = userLabels[0];
        console.log(`   Selected label: ${newLabel.name}\n`);
      } else {
        console.log(`   No user labels available, skipping label operations...\n`);
      }
    }

    // ========================================
    // 3. EMAIL OPERATIONS
    // ========================================
    console.log('📧 EMAIL OPERATIONS\n');

    // List recent emails
    console.log('Fetching recent emails...');
    const emails = await client.listEmails({
      maxResults: 10,
      unreadOnly: false,
    });

    console.log(`Found ${emails.messages.length} emails:\n`);
    emails.messages.forEach((email, index) => {
      console.log(`${index + 1}. ${email.subject}`);
      console.log(`   From: ${email.from?.name || email.from?.email}`);
      console.log(`   Date: ${email.date?.toLocaleString()}`);
      console.log(`   Read: ${email.isRead ? '✓' : '✗'}`);
      if (email.labels && email.labels.length > 0) {
        console.log(`   Labels: ${email.labels.join(', ')}`);
      }
      if (email.attachments && email.attachments.length > 0) {
        console.log(`   Attachments: ${email.attachments.length}`);
      }
      console.log('');
    });

    // Send email with attachment
    console.log('Sending test email with attachment...');
    const sentMessage = await client.sendEmail({
      subject: 'SuperMail Complete Test',
      to: [{ email: process.env.TEST_EMAIL! }],
      body: 'This is a comprehensive test of SuperMail library.',
      htmlBody: '<h1>SuperMail Test</h1><p>This email was sent using <strong>SuperMail</strong> library.</p>',
      attachments: [
        {
          filename: 'test.txt',
          content: 'This is a test attachment',
          contentType: 'text/plain',
        },
      ],
    });
    console.log('✓ Email sent successfully!\n');

    if (emails.messages.length > 0) {
      const firstEmail = emails.messages[0];
      const emailId = firstEmail.id!;

      // Get email details
      console.log('Fetching email details...');
      const emailDetails = await client.getEmail(emailId);
      console.log(`Subject: ${emailDetails.subject}`);
      console.log(`From: ${emailDetails.from?.name || emailDetails.from?.email}`);
      console.log(`Body preview: ${emailDetails.body.substring(0, 100)}...\n`);

      // ========================================
      // 4. LABEL OPERATIONS ON EMAILS
      // ========================================
      if (newLabel) {
        console.log('🏷️  APPLYING LABELS\n');

        console.log('Adding label to email...');
        await client.addLabels({
          emailId,
          labelIds: [newLabel.id],
        });
        console.log('✓ Label added successfully\n');
      }

      // ========================================
      // 5. MARK AS READ/UNREAD
      // ========================================
      console.log('📖 MARKING EMAIL STATUS\n');

      if (!firstEmail.isRead) {
        console.log('Marking email as read...');
        await client.markAsRead(emailId);
        console.log('✓ Email marked as read\n');
      } else {
        console.log('Marking email as unread...');
        await client.markAsUnread(emailId);
        console.log('✓ Email marked as unread\n');
      }

      // ========================================
      // 6. REPLY TO EMAIL
      // ========================================
      // Find a suitable email for reply (skip system messages like "Undeliverable")
      const replyableEmail = emails.messages.find(
        email => !email.subject.toLowerCase().includes('undeliverable') &&
          email.from?.email &&
          !email.from.email.includes('postmaster')
      );

      if (replyableEmail) {
        console.log('↩️  REPLYING TO EMAIL\n');

        console.log(`Sending reply to "${replyableEmail.subject}"...`);
        await client.replyToEmail(replyableEmail.id!, {
          subject: `Re: ${replyableEmail.subject}`,
          to: replyableEmail.from ? [replyableEmail.from] : [],
          body: 'This is an automated reply from SuperMail.',
        });
        console.log('✓ Reply sent successfully\n');
      }

      // ========================================
      // 7. FOLDER OPERATIONS ON EMAILS
      // ========================================
      // Note: We use a different email for folder operations because
      // moving an email can invalidate its ID in some providers
      if (emails.messages.length > 1) {
        const secondEmail = emails.messages[1];
        console.log('📁 MOVING EMAIL TO FOLDER\n');

        console.log(`Moving email "${secondEmail.subject}" to new folder...`);
        await client.moveToFolder({
          emailId: secondEmail.id!,
          folderId: newFolder.id,
        });
        console.log('✓ Email moved successfully\n');
      }

      // ========================================
      // 8. ARCHIVE EMAIL
      // ========================================
      if (emails.messages.length > 2) {
        const thirdEmail = emails.messages[2];
        console.log('📦 ARCHIVING EMAIL\n');

        console.log(`Archiving email "${thirdEmail.subject}"...`);
        await client.archiveEmail(thirdEmail.id!);
        console.log('✓ Email archived successfully\n');
      }
    }

    // ========================================
    // 9. BATCH OPERATIONS
    // ========================================
    // Use fresh email list to avoid operating on moved/archived emails
    let freshEmails;
    try {
      freshEmails = await client.listEmails({
        maxResults: 10,
        unreadOnly: false,
      });

      if (freshEmails.messages.length >= 3) {
        console.log('⚡ BATCH OPERATIONS\n');

        // Use the last 3 emails which are less likely to have been modified
        const batchEmailIds = freshEmails.messages.slice(-3).map(e => e.id!);

        console.log(`Marking ${batchEmailIds.length} emails as read...`);
        await client.batchOperation({
          emailIds: batchEmailIds,
          operation: 'markRead',
        });
        console.log('✓ Batch operation completed\n');
      }
    } catch (error: any) {
      console.log('⚠️  Could not perform batch operations (API error)\n');
      // Use original email list as fallback
      freshEmails = emails;
    }

    // ========================================
    // 10. TRASH EMAIL
    // ========================================
    if (freshEmails.messages.length > 6) {
      console.log('🗑️  MOVING TO TRASH\n');

      // Use an email that wasn't part of batch operations
      const batchEmailIdsSet = new Set(freshEmails.messages.slice(-3).map(e => e.id));
      const trashEmail = freshEmails.messages.find(
        e => !batchEmailIdsSet.has(e.id) && e.id
      );

      if (trashEmail) {
        try {
          console.log(`Moving email "${trashEmail.subject}" to trash...`);
          await client.trashEmail(trashEmail.id!);
          console.log('✓ Email moved to trash\n');
        } catch (error: any) {
          console.log(`⚠️  Could not trash email (already moved or deleted)\n`);
        }
      }
    }

    console.log('✅ All operations completed successfully!');
    console.log('\n🎉 SuperMail supports all major email operations across Gmail and Microsoft!\n');

  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error('❌ Authentication failed:', error.message);
      console.error('   Please check your credentials and access token.');
    } else if (error instanceof RateLimitError) {
      console.error('❌ Rate limit exceeded:', error.message);
      if (error.retryAfter) {
        console.error(`   Retry after: ${error.retryAfter} seconds`);
      }
    } else {
      console.error('❌ Error:', error);
    }
    process.exit(1);
  }
}

main();
