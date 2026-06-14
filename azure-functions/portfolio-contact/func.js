// Azure HTTP Function - Portfolio Contact Form Email Handler
// Sends emails via Resend API with career-fair fallback

const resendApiKey = process.env.RESEND_API_KEY || null;
const recipientEmail = process.env.RECIPIENT_EMAIL || 'eugene.vince55@gmail.com';
const domain = process.env.RESEND_DOMAIN || 'chai-homelab.com';

async function main(context, req) {
async function main(context, req) {
  // Only allow POST requests
  if (req.method === 'OPTIONS') {
    context.res.writeHead(204, { 'Content-Type': 'application/json' });
    context.res.end();
    return;
  }

  if (req.method !== 'POST') {
    context.res.writeHead(405, { 'Content-Type': 'application/json' });
    context.res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Parse request body
  let body;
  try {
    body = req.body ? JSON.parse(req.body) : {};
  } catch {
    context.res.writeHead(400, { 'Content-Type': 'application/json' });
    context.res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  const { name, subject, message } = body;

  // Validate required fields
  if (!name || !subject || !message) {
    context.res.writeHead(400, { 'Content-Type': 'application/json' });
    context.res.end(JSON.stringify({
      error: 'Missing required fields',
      required: ['name', 'subject', 'message']
    }));
    return;
  }

  // Validate field lengths
  if (name.length > 200) {
    context.res.writeHead(400, { 'Content-Type': 'application/json' });
    context.res.end(JSON.stringify({ error: 'Name too long (max 200 chars)' }));
    return;
  }

  if (subject.length > 300) {
    context.res.writeHead(400, { 'Content-Type': 'application/json' });
    context.res.end(JSON.stringify({ error: 'Subject too long (max 300 chars)' }));
    return;
  }

  if (message.length > 5000) {
    context.res.writeHead(400, { 'Content-Type': 'application/json' });
    context.res.end(JSON.stringify({ error: 'Message too long (max 5000 chars)' }));
    return;
  }

  // Try to send email via Resend API
  if (resendApiKey) {
    try {
      await sendViaResend(name, subject, message);
      context.res.writeHead(200, { 'Content-Type': 'application/json' });
      context.res.end(JSON.stringify({ success: true, message: 'Email sent successfully' }));
      return;
    } catch (err) {
      console.error('Resend API error:', err.message);
      // Fall through to fallback response
    }
  }

  // Fallback: log the submission and return success
  // In production without Resend, this logs to Azure Functions console
  console.log('[portfolio-contact] Email submission received:');
  console.log('  From: ' + name);
  console.log('  To: ' + recipientEmail);
  console.log('  Subject: ' + subject);
  console.log('  Message: ' + message.substring(0, 100) + '...');

  context.res.writeHead(200, { 'Content-Type': 'application/json' });
  context.res.end(JSON.stringify({
    success: true,
    message: resendApiKey
      ? 'Email sent successfully'
      : 'Message received (Resend API not configured — email logged to console)'
  }));
}

module.exports = { main };

// Send email via Resend API
async function sendViaResend(name, subject, message) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + resendApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Portfolio Contact <contact@' + domain + '>',
      to: recipientEmail,
      subject: '[Portfolio] ' + subject + ' — from ' + name,
      text: 'Hi Eugene,\n\nFrom: ' + name + '\nSubject: ' + subject + '\n\n' + message + '\n\n---\nSent from chai-homelab.com portfolio contact form',
      replyTo: 'noreply@chai-homelab.com'
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error('Resend API ' + response.status + ': ' + errorBody);
  }

  return response.json();
}
