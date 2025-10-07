/**
 * Gmail Provider Example
 *
 * This example demonstrates how to use SuperMail with Gmail
 * using just an access token from .env file
 */

import 'dotenv/config';
import { SuperMail, AuthenticationError, RateLimitError } from '../src';

async function main() {
  // Initialize Gmail provider with access token
  const client = new SuperMail({
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
  });

  try {
    console.log('🔍 Fetching recent emails from Gmail...\n');

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

    // Example: Send an email
    console.log('📧 Sending test email...\n');

    const sentMessage = await client.sendEmail({
      subject: 'Test Email from SuperMail',
      to: [{ email: process.env.TEST_EMAIL! }],
      body: 'This is a test email sent using SuperMail library with Gmail provider.',
      htmlBody: '<p>This is a <strong>test email</strong> sent using SuperMail library with Gmail provider.</p>',
    });

    console.log('✓ Email sent successfully!');
    console.log(`  Message ID: ${sentMessage.id}\n`);

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
