/**
 * IMAP/SMTP Provider Example
 *
 * This example demonstrates how to use SuperMail with IMAP/SMTP
 * Works with any email provider (Gmail, Yahoo, Outlook, custom servers, etc.)
 */

import 'dotenv/config';
import { SuperMail, AuthenticationError, RateLimitError } from '../src';

async function main() {
  // Initialize IMAP/SMTP provider
  const client = new SuperMail({
    type: 'imap',
    imap: {
      host: process.env.IMAP_HOST!,
      port: parseInt(process.env.IMAP_PORT || '993'),
      user: process.env.EMAIL_USER!,
      password: process.env.EMAIL_PASSWORD!,
      tls: true,
    },
    smtp: {
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      user: process.env.EMAIL_USER!,
      password: process.env.EMAIL_PASSWORD!,
    },
  });

  try {
    console.log('🔍 Fetching recent emails via IMAP...\n');

    // List recent emails
    const emails = await client.listEmails({
      maxResults: 5,
      unreadOnly: false,
    });

    console.log(`Found ${emails.messages.length} emails:\n`);

    emails.messages.forEach((email, index) => {
      console.log(`${index + 1}. ${email.subject}`);
      console.log(`   From: ${email.from?.name || email.from?.email}`);
      console.log(`   Date: ${email.date?.toLocaleString()}`);
      console.log(`   Read: ${email.isRead ? '✓' : '✗'}`);
      if (email.attachments && email.attachments.length > 0) {
        console.log(`   Attachments: ${email.attachments.length}`);
      }
      console.log('');
    });

    // Example: Send an email via SMTP
    console.log('📧 Sending test email via SMTP...\n');

    const sentMessage = await client.sendEmail({
      subject: 'Test Email from SuperMail (IMAP/SMTP)',
      to: [{ email: process.env.TEST_EMAIL! }],
      body: 'This is a test email sent using SuperMail library with IMAP/SMTP provider.',
      htmlBody:
        '<p>This is a <strong>test email</strong> sent using SuperMail library with IMAP/SMTP provider.</p>',
    });

    console.log('✓ Email sent successfully!');
    console.log(`  Message ID: ${sentMessage.id}\n`);

    // Example: List folders
    console.log('📁 Listing folders...\n');

    const folders = await client.listFolders();
    console.log(`Found ${folders.length} folders:`);
    folders.slice(0, 10).forEach((folder) => {
      console.log(`  - ${folder.name}`);
      if (folder.unreadCount !== undefined) {
        console.log(`    Unread: ${folder.unreadCount}, Total: ${folder.totalCount}`);
      }
    });
    console.log('');

    // Example: Get a specific email
    if (emails.messages.length > 0) {
      const firstEmailId = emails.messages[0].id!;
      console.log('📬 Fetching email details...\n');

      const emailDetails = await client.getEmail(firstEmailId);
      console.log('Email Details:');
      console.log(`  Subject: ${emailDetails.subject}`);
      console.log(`  From: ${emailDetails.from?.name || emailDetails.from?.email}`);
      console.log(`  Body preview: ${emailDetails.body.substring(0, 100)}...\n`);

      // Example: Mark as read
      if (!emailDetails.isRead) {
        console.log('📖 Marking email as read...');
        await client.markAsRead(firstEmailId);
        console.log('✓ Email marked as read\n');
      }
    }

    console.log('✅ All operations completed successfully!\n');
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error('❌ Authentication failed:', error.message);
      console.error('   Please check your IMAP/SMTP credentials.');
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
