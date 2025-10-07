/**
 * Microsoft Graph Provider Example - Complete Feature Demonstration
 *
 * This example demonstrates ALL available features in the Microsoft Graph provider:
 * - Email operations (send, list, get, delete, reply)
 * - Folder management (list, create, move emails)
 * - Category management (list, create, add/remove categories)
 * - Batch operations (bulk actions)
 * - Advanced operations (archive, trash)
 */

import 'dotenv/config';
import { AuthenticationError, RateLimitError, SuperMail } from '../src';

async function main() {
  // Initialize Microsoft Graph provider
  const client = new SuperMail({
    type: 'microsoft',
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    tenantId: process.env.MICROSOFT_TENANT_ID!,
    accessToken: process.env.MICROSOFT_ACCESS_TOKEN!,
  });

  try {
    console.log('🚀 Microsoft Graph Provider - Complete Feature Demo\n');
    console.log('=' .repeat(60) + '\n');

    // ========================================
    // 1. FOLDER MANAGEMENT
    // ========================================
    console.log('📁 FOLDER MANAGEMENT\n');

    console.log('Listing all mail folders...');
    const folders = await client.listFolders();
    console.log(`Found ${folders.length} folders:\n`);
    folders.slice(0, 8).forEach((folder) => {
      const indent = folder.parentId ? '  ' : '';
      console.log(`${indent}📂 ${folder.name}`);
      if (folder.unreadCount !== undefined) {
        console.log(`${indent}   Unread: ${folder.unreadCount}, Total: ${folder.totalCount}`);
      }
    });
    console.log('');

    // Create a new folder
    console.log('Creating a new folder "SuperMail Test"...');
    const newFolder = await client.createFolder('SuperMail Test');
    console.log(`✓ Created folder: ${newFolder.name} (ID: ${newFolder.id})\n`);

    // Get folder details
    console.log('Getting Inbox folder details...');
    const inboxFolders = folders.filter(f => f.name === 'Inbox');
    if (inboxFolders.length > 0) {
      const inbox = await client.getFolder(inboxFolders[0].id);
      console.log(`✓ Inbox: ${inbox.unreadCount} unread, ${inbox.totalCount} total\n`);
    }

    // ========================================
    // 2. CATEGORY MANAGEMENT
    // ========================================
    console.log('🏷️  CATEGORY MANAGEMENT\n');

    console.log('Listing all categories...');
    const categories = await client.listLabels();
    console.log(`Found ${categories.length} categories:\n`);
    categories.slice(0, 8).forEach((cat) => {
      console.log(`  🏷️  ${cat.name} [${cat.color || 'no color'}] (${cat.type})`);
    });
    console.log('');

    // Create a new category
    console.log('Creating a new category "Important Work"...');
    const newCategory = await client.createLabel('Important Work', 'preset1');
    console.log(`✓ Created category: ${newCategory.name}\n`);

    // ========================================
    // 3. EMAIL OPERATIONS
    // ========================================
    console.log('📧 EMAIL OPERATIONS\n');

    // List recent emails
    console.log('Fetching recent emails from Inbox...');
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
        console.log(`   Categories: ${email.labels.join(', ')}`);
      }
      if (email.attachments && email.attachments.length > 0) {
        console.log(`   📎 ${email.attachments.length} attachment(s)`);
      }
      console.log('');
    });

    // Send email with attachment
    console.log('📤 Sending test email with attachment...');
    const sentMessage = await client.sendEmail({
      subject: 'SuperMail Complete Test - Microsoft Graph',
      to: [{ email: process.env.TEST_EMAIL!, name: 'Test User' }],
      cc: [{ email: process.env.TEST_EMAIL! }],
      body: 'This is a comprehensive test of SuperMail with Microsoft Graph provider.',
      htmlBody: `
        <html>
          <body>
            <h1>SuperMail Test</h1>
            <p>This email demonstrates <strong>all features</strong> of the Microsoft Graph provider:</p>
            <ul>
              <li>✅ HTML Email Support</li>
              <li>✅ Attachments</li>
              <li>✅ CC Recipients</li>
              <li>✅ Rich Formatting</li>
            </ul>
            <p>Sent with ❤️ using <strong>SuperMail</strong></p>
          </body>
        </html>
      `,
      attachments: [
        {
          filename: 'test-document.txt',
          content: Buffer.from('This is a test attachment from SuperMail!\n\nAll features working perfectly.'),
          contentType: 'text/plain',
        },
      ],
    });

    console.log('✓ Email sent successfully!');
    console.log(`  Subject: ${sentMessage.subject}\n`);

    if (emails.messages.length > 0) {
      const firstEmail = emails.messages[0];
      const emailId = firstEmail.id!;

      // Get email details
      console.log('📬 Fetching email details...');
      const emailDetails = await client.getEmail(emailId);
      console.log(`\nEmail Details:`);
      console.log(`  Subject: ${emailDetails.subject}`);
      console.log(`  From: ${emailDetails.from?.name || emailDetails.from?.email}`);
      console.log(`  To: ${emailDetails.to.map(t => t.email).join(', ')}`);
      console.log(`  Date: ${emailDetails.date?.toLocaleString()}`);
      console.log(`  Body preview: ${emailDetails.body.substring(0, 80)}...`);
      if (emailDetails.attachments && emailDetails.attachments.length > 0) {
        console.log(`  Attachments:`);
        emailDetails.attachments.forEach(att => {
          console.log(`    - ${att.filename} (${att.contentType}, ${att.size} bytes)`);
        });
      }
      console.log('');

      // ========================================
      // 4. CATEGORY OPERATIONS ON EMAILS
      // ========================================
      console.log('🏷️  APPLYING CATEGORIES TO EMAIL\n');

      console.log('Adding "Important Work" category to email...');
      await client.addLabels({
        emailId,
        labelIds: [newCategory.id],
      });
      console.log('✓ Category added successfully\n');

      // ========================================
      // 5. FOLDER OPERATIONS ON EMAILS
      // ========================================
      console.log('📁 MOVING EMAIL TO FOLDER\n');

      console.log('Moving email to "SuperMail Test" folder...');
      await client.moveToFolder({
        emailId,
        folderId: newFolder.id,
      });
      console.log('✓ Email moved successfully\n');

      // ========================================
      // 6. MARK AS READ/UNREAD
      // ========================================
      console.log('📖 CHANGING EMAIL READ STATUS\n');

      if (firstEmail.isRead) {
        console.log('Marking email as unread...');
        await client.markAsUnread(emailId);
        console.log('✓ Email marked as unread\n');

        // Mark it back as read
        console.log('Marking email as read again...');
        await client.markAsRead(emailId);
        console.log('✓ Email marked as read\n');
      } else {
        console.log('Marking email as read...');
        await client.markAsRead(emailId);
        console.log('✓ Email marked as read\n');
      }

      // ========================================
      // 7. REPLY TO EMAIL
      // ========================================
      console.log('↩️  REPLYING TO EMAIL\n');

      console.log('Sending reply...');
      await client.replyToEmail(emailId, {
        subject: `Re: ${firstEmail.subject}`,
        to: firstEmail.from ? [firstEmail.from] : [],
        body: 'This is an automated reply from SuperMail demonstrating the reply feature.',
        htmlBody: '<p>This is an <strong>automated reply</strong> from SuperMail.</p>',
      });
      console.log('✓ Reply sent successfully\n');

      // ========================================
      // 8. REMOVING CATEGORIES
      // ========================================
      console.log('🏷️  REMOVING CATEGORIES\n');

      console.log('Removing category from email...');
      await client.removeLabels({
        emailId,
        labelIds: [newCategory.id],
      });
      console.log('✓ Category removed successfully\n');
    }

    // ========================================
    // 9. BATCH OPERATIONS
    // ========================================
    if (emails.messages.length >= 3) {
      console.log('⚡ BATCH OPERATIONS\n');

      const batchEmailIds = emails.messages.slice(0, 3).map(e => e.id!);

      console.log(`Marking ${batchEmailIds.length} emails as read in batch...`);
      await client.batchOperation({
        emailIds: batchEmailIds,
        operation: 'markRead',
      });
      console.log('✓ Batch mark as read completed\n');

      console.log(`Marking ${batchEmailIds.length} emails as unread in batch...`);
      await client.batchOperation({
        emailIds: batchEmailIds,
        operation: 'markUnread',
      });
      console.log('✓ Batch mark as unread completed\n');
    }

    // ========================================
    // 10. ARCHIVE EMAIL
    // ========================================
    if (emails.messages.length > 3) {
      console.log('📦 ARCHIVING EMAIL\n');

      const emailToArchive = emails.messages[3].id!;
      console.log('Moving email to Archive...');
      await client.archiveEmail(emailToArchive);
      console.log('✓ Email archived successfully\n');
    }

    // ========================================
    // 11. TRASH EMAIL
    // ========================================
    if (emails.messages.length > 4) {
      console.log('🗑️  MOVING TO TRASH\n');

      const emailToTrash = emails.messages[4].id!;
      console.log('Moving email to Deleted Items...');
      await client.trashEmail(emailToTrash);
      console.log('✓ Email moved to trash\n');
    }

    // ========================================
    // 12. DELETE EMAIL
    // ========================================
    if (emails.messages.length > 5) {
      console.log('🗑️  DELETING EMAIL\n');

      const emailToDelete = emails.messages[5].id!;
      console.log('Permanently deleting email...');
      await client.deleteEmail(emailToDelete);
      console.log('✓ Email deleted successfully\n');
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('=' .repeat(60));
    console.log('\n✅ ALL MICROSOFT GRAPH FEATURES DEMONSTRATED!\n');
    console.log('Features tested:');
    console.log('  ✓ Folder Management (list, create, get, move)');
    console.log('  ✓ Category Management (list, create, add, remove)');
    console.log('  ✓ Email Operations (send, list, get, reply)');
    console.log('  ✓ Attachments (send and receive)');
    console.log('  ✓ Mark as Read/Unread');
    console.log('  ✓ Batch Operations');
    console.log('  ✓ Archive & Trash');
    console.log('  ✓ Delete');
    console.log('\n🎉 Microsoft Graph provider is fully functional!\n');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    if (error instanceof AuthenticationError) {
      console.error('❌ Authentication failed:', error.message);
      console.error('   Please check your credentials and access token.');
      console.error('\n   Required permissions:');
      console.error('   - Mail.ReadWrite');
      console.error('   - Mail.Send');
      console.error('   - MailboxSettings.Read');
    } else if (error instanceof RateLimitError) {
      console.error('❌ Rate limit exceeded:', error.message);
      if (error.retryAfter) {
        console.error(`   Retry after: ${error.retryAfter} seconds`);
      }
    } else {
      console.error('❌ Error:', error);
    }
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  }
}

main();
