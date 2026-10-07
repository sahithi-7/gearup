import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

let transporterPromise = null;
let etherealAccount = null;

function reloadEnv() {
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'server', '.env')
  ];
  for (const envFile of envCandidates) {
    if (fs.existsSync(envFile)) {
      try {
        if (typeof process.loadEnvFile === 'function') {
          process.loadEnvFile(envFile);
        }
        break;
      } catch {}
    }
  }
}

/**
 * Initializes and returns a singleton nodemailer transporter.
 * If SMTP credentials are provided in env vars, uses them.
 * Otherwise, automatically provisions a free Ethereal test account with graceful fallback.
 */
async function getTransporter(forceRefresh = false) {
  if (forceRefresh) {
    reloadEnv();
    transporterPromise = null;
  }
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    reloadEnv();
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // 1. If explicit SMTP credentials are provided, use them
    if (host && user && pass) {
      console.log(`[EmailService] Using configured SMTP server: ${host}:${port} (${user})`);
      const isGmail = host === 'smtp.gmail.com' || String(user).toLowerCase().endsWith('@gmail.com');
      
      const transportConfig = isGmail
        ? {
            service: 'gmail',
            auth: { user, pass }
          }
        : {
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000
          };

      const transporter = nodemailer.createTransport(transportConfig);

      transporter.verify().then(() => {
        console.log(`[EmailService] ✅ SMTP Connected successfully! Ready to deliver real emails to inboxes from: ${user}`);
      }).catch((err) => {
        console.error(`[EmailService] ❌ SMTP Verification Error (${err.responseCode || err.code}): ${err.message}`);
        if (err.responseCode === 535 || err.message?.includes('BadCredentials')) {
          console.error('[EmailService] ⚠️ GMAIL AUTHENTICATION FAILED:');
          console.error('[EmailService] Google does not allow using your regular Gmail account password.');
          console.error('[EmailService] 👉 You MUST generate a 16-character Google App Password:');
          console.error('[EmailService] 1. Ensure 2-Step Verification is ON in your Google Account.');
          console.error('[EmailService] 2. Visit https://myaccount.google.com/apppasswords');
          console.error('[EmailService] 3. Generate a 16-letter App Password and paste it into SMTP_PASS in .env');
        }
      });

      return transporter;
    }

    // 2. Otherwise provision free Ethereal test account
    try {
      console.log('[EmailService] No SMTP credentials provided. Creating free Ethereal test account...');
      etherealAccount = await nodemailer.createTestAccount();
      console.log(`[EmailService] Ethereal test account created: ${etherealAccount.user}`);
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass
        }
      });
    } catch (err) {
      console.warn('[EmailService] Could not reach Ethereal service, using mock console transporter.', err.message);
      // Fallback mock transporter (works 100% offline)
      return {
        sendMail: async (mailOptions) => {
          return {
            messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            mock: true,
            ...mailOptions
          };
        }
      };
    }
  })();

  return transporterPromise;
}

/**
 * Common HTML email layout wrapper with cyberpunk esports styling
 */
function buildEmailTemplate({ title, badge, contentHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #080D14;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
    }
    .wrapper {
      width: 100%;
      background-color: #080D14;
      padding: 30px 10px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #0F1A28;
      border: 1px solid #1F324B;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .header {
      background: linear-gradient(135deg, #111C2B 0%, #0F253E 100%);
      padding: 24px;
      text-align: center;
      border-bottom: 2px solid #5BD19B;
    }
    .brand {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #FFFFFF;
      margin: 0;
    }
    .brand span {
      color: #5BD19B;
    }
    .badge {
      display: inline-block;
      margin-top: 10px;
      padding: 5px 14px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      background-color: rgba(91, 209, 155, 0.15);
      border: 1px solid #5BD19B;
      color: #5BD19B;
      border-radius: 20px;
    }
    .body {
      padding: 28px 24px;
    }
    .info-card {
      background-color: #0B131E;
      border: 1px solid #1F324B;
      border-radius: 8px;
      padding: 18px;
      margin: 18px 0;
    }
    .grid-table {
      width: 100%;
      border-collapse: collapse;
    }
    .grid-table td {
      padding: 8px 6px;
      font-size: 13px;
      vertical-align: top;
    }
    .label {
      color: #94A3B8;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .val {
      color: #FFFFFF;
      font-weight: 700;
    }
    .val-highlight {
      color: #5BD19B;
      font-weight: 800;
    }
    .notice-box {
      background-color: rgba(56, 189, 248, 0.08);
      border-left: 4px solid #38BDF8;
      padding: 14px 16px;
      border-radius: 4px;
      margin: 20px 0;
      font-size: 13px;
      line-height: 1.5;
      color: #BAE6FD;
    }
    .footer {
      background-color: #0B131E;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #1F324B;
      font-size: 12px;
      color: #64748B;
    }
    .btn {
      display: inline-block;
      background-color: #5BD19B;
      color: #0B131E !important;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 13px;
      letter-spacing: 1px;
      padding: 12px 26px;
      border-radius: 6px;
      text-decoration: none;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand">GEAR<span>UP</span> ESPORTS</h1>
        <div class="badge">${badge}</div>
      </div>
      <div class="body">
        ${contentHtml}
      </div>
      <div class="footer">
        <p style="margin:0 0 6px 0;">This is an automated confirmation sent by <strong>GearUp Esports Platform</strong>.</p>
        <p style="margin:0;">Need assistance? Reach out to support at <a href="mailto:" style="color:#5BD19B;text-decoration:none;">gearupesportsofficial@gmail.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Universal email dispatcher:
 * 1. Checks for Resend HTTP API (RESEND_API_KEY) - works on Render Free Tier (Port 443)
 * 2. Checks for Brevo HTTP API (BREVO_API_KEY) - works on Render Free Tier (Port 443)
 * 3. Falls back to configured SMTP (Gmail / Custom SMTP) with a 4-second timeout protection
 * 4. Falls back to simulated delivery with on-screen fallback
 */
async function deliverMail({ from, to, subject, text, html }) {
  reloadEnv();

  // 1. Direct Gmail / Custom SMTP Transport (prioritized when credentials are provided in .env)
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (smtpUser && smtpPass) {
    try {
      console.log(`[EmailService] ✉️ Dispatching real email via Gmail SMTP (${smtpUser}) to: ${to}`);
      const transporter = await getTransporter();
      const cleanFrom = from ? from.replace(/^"|"$/g, '').replace(/""/g, '"') : `GearUp Esports <${smtpUser}>`;
      const sendPromise = transporter.sendMail({
        from: cleanFrom,
        to,
        subject,
        text,
        html
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP connection timed out')), 15000)
      );

      const info = await Promise.race([sendPromise, timeoutPromise]);
      let previewUrl = null;
      if (nodemailer.getTestMessageUrl) {
        previewUrl = nodemailer.getTestMessageUrl(info) || null;
      }
      console.log(`[EmailService] ✅ Email delivered via Gmail SMTP! MessageID: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
        provider: 'GMAIL_SMTP'
      };
    } catch (err) {
      console.error(`[EmailService] ⚠️ SMTP delivery failed to ${to}: ${err.message}. Trying fallbacks...`);
    }
  }

  // 2. Resend HTTPS API (Port 443 - fallback for hosted cloud environments like Render)
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      console.log(`[EmailService] 🚀 Dispatching email via Resend HTTPS API to: ${to}`);
      const rawFrom = process.env.RESEND_FROM || 'GearUp Esports <onboarding@resend.dev>';
      const cleanFrom = rawFrom.replace(/^"|"$/g, '').replace(/""/g, '"');
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: cleanFrom,
          to: [to],
          subject,
          html,
          text
        })
      });
      const data = await res.json();
      if (res.ok && data?.id) {
        console.log(`[EmailService] ✅ Email delivered via Resend API! ID: ${data.id}`);
        return { success: true, messageId: data.id, provider: 'RESEND_API' };
      } else {
        console.error(`[EmailService] ⚠️ Resend API error:`, data);
      }
    } catch (err) {
      console.error(`[EmailService] ⚠️ Resend API request failed:`, err.message);
    }
  }

  // 3. Brevo HTTPS API (Port 443)
  const brevoKey = process.env.BREVO_API_KEY?.trim();
  if (brevoKey) {
    try {
      console.log(`[EmailService] 🚀 Dispatching email via Brevo HTTPS API to: ${to}`);
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'GearUp Esports', email: process.env.SMTP_USER || 'gearupesportsofficial@gmail.com' },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text
        })
      });
      const data = await res.json();
      if (res.ok && data?.messageId) {
        console.log(`[EmailService] ✅ Email delivered via Brevo API! ID: ${data.messageId}`);
        return { success: true, messageId: data.messageId, provider: 'BREVO_API' };
      } else {
        console.error(`[EmailService] ⚠️ Brevo API error:`, data);
      }
    } catch (err) {
      console.error(`[EmailService] ⚠️ Brevo API request failed:`, err.message);
    }
  }

  return {
    success: false,
    error: 'All email delivery channels failed',
    messageId: null,
    provider: 'FAILED'
  };
}

/**
 * Dispatches a tournament entry confirmation email to the registered player
 */
export async function sendTournamentRegistrationEmail({
  emailId,
  recipientEmail,
  playerIgn,
  playerUid,
  teamName,
  teammates,
  phone,
  tournament,
  db,
  saveDb
}) {
  const defaultFrom = process.env.SMTP_USER
    ? `"GearUp Esports" <${process.env.SMTP_USER}>`
    : '"GearUp Esports" <no-reply@gearup.gg>';
  const fromAddress = process.env.SMTP_FROM || defaultFrom;
  const subject = `🎮 Registration Confirmed: ${tournament.title} | GearUp Esports`;

  const contentHtml = `
    <h2 style="color:#FFFFFF;margin-top:0;font-size:20px;font-weight:800;text-transform:uppercase;">
      Match Slot Reserved!
    </h2>
    <p style="font-size:14px;line-height:1.6;color:#CBD5E1;">
      Hey <strong>${playerIgn}</strong>, your registration for <strong>${tournament.title}</strong> has been successfully confirmed. Get ready for battle!
    </p>

    <div class="info-card">
      <div style="font-size:12px;font-weight:800;color:#5BD19B;text-transform:uppercase;margin-bottom:12px;letter-spacing:1px;">
        Tournament Specifications
      </div>
      <table class="grid-table">
        <tr>
          <td class="label" style="width:35%;">Tournament:</td>
          <td class="val">${tournament.title}</td>
        </tr>
        <tr>
          <td class="label">Game & Format:</td>
          <td class="val"><span class="val-highlight">${tournament.game}</span> • ${tournament.format}</td>
        </tr>
        <tr>
          <td class="label">Match Date:</td>
          <td class="val">${tournament.date}</td>
        </tr>
        <tr>
          <td class="label">Kickoff Time:</td>
          <td class="val">${tournament.time} IST</td>
        </tr>
        <tr>
          <td class="label">Map:</td>
          <td class="val">${tournament.map || 'Erangel / Bermuda'}</td>
        </tr>
        <tr>
          <td class="label">Prize Pool:</td>
          <td class="val-highlight">₹${Number(tournament.prize_pool || 0).toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td class="label">Organiser:</td>
          <td class="val">${tournament.organiser_name || 'GearUp Official'}</td>
        </tr>
      </table>
    </div>

    <div class="info-card">
      <div style="font-size:12px;font-weight:800;color:#38BDF8;text-transform:uppercase;margin-bottom:12px;letter-spacing:1px;">
        Your Player Details
      </div>
      <table class="grid-table">
        ${teamName ? `<tr><td class="label" style="width:35%;">Team Name:</td><td class="val" style="font-weight:bold;color:#5BD19B;">${teamName}</td></tr>` : ''}
        <tr>
          <td class="label" style="width:35%;">Leader (IGN):</td>
          <td class="val">${playerIgn}</td>
        </tr>
        <tr>
          <td class="label">Leader UID:</td>
          <td class="val">${playerUid}</td>
        </tr>
        ${Array.isArray(teammates) && teammates.length > 0 ? `
        <tr>
          <td class="label">Teammates:</td>
          <td class="val">${teammates.map((t, idx) => `P${idx + 2}: ${t.name} (UID: ${t.uid})`).join('<br>')}</td>
        </tr>` : ''}
        ${phone ? `<tr><td class="label">Contact Phone:</td><td class="val">${phone}</td></tr>` : ''}
        <tr>
          <td class="label">Confirmation Status:</td>
          <td class="val" style="color:#5BD19B;">CONFIRMED (Slot Booked)</td>
        </tr>
      </table>
    </div>

    <div class="notice-box">
      <strong>⚠️ HOW TO ACCESS ROOM ID & PASSWORD:</strong><br>
      The custom match credentials (Room ID and Password) will unlock <strong>15 minutes prior to match start (${tournament.time})</strong>.
      You can access the credentials directly via:
      <ul style="margin:8px 0 0 18px;padding:0;">
        <li>Your GearUp Dashboard & Notification Center bell</li>
        <li>The Tournament Details page under the "Room ID & Pass" tab</li>
        <li>Match lobby live announcements</li>
      </ul>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="http://localhost:5173" class="btn" target="_blank">Open GearUp Portal</a>
    </div>
  `;

  const html = buildEmailTemplate({
    title: subject,
    badge: 'REGISTRATION CONFIRMED',
    contentHtml
  });

  const text = `
GEARUP ESPORTS - REGISTRATION CONFIRMED
----------------------------------------
Tournament: ${tournament.title}
Game: ${tournament.game} (${tournament.format})
Date & Time: ${tournament.date} at ${tournament.time} IST
Prize Pool: ₹${tournament.prize_pool}

Player: ${playerIgn} (UID: ${playerUid})
${teamName ? `Team: ${teamName}\n` : ''}
Status: CONFIRMED

IMPORTANT:
Room ID and Password will unlock 15 minutes before the match start time directly on your GearUp dashboard & notification center.
`;

  const recordId = emailId || `email-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const emailRecord = {
    id: recordId,
    type: 'TOURNAMENT_REGISTRATION',
    recipient: recipientEmail,
    subject,
    tournament_id: tournament.id,
    tournament_title: tournament.title,
    player_ign: playerIgn,
    timestamp: new Date().toISOString(),
    preview_url: null,
    message_id: null,
    status: 'SENDING',
    html
  };

  if (db) {
    if (!Array.isArray(db.sent_emails)) db.sent_emails = [];
    const existingIdx = db.sent_emails.findIndex(e => e.id === recordId);
    if (existingIdx !== -1) {
      db.sent_emails[existingIdx] = emailRecord;
    } else {
      db.sent_emails.unshift(emailRecord);
    }
    if (saveDb) saveDb(db);
  }

  const delivery = await deliverMail({
    from: fromAddress,
    to: recipientEmail,
    subject,
    text,
    html
  });

  emailRecord.preview_url = delivery.previewUrl || null;
  emailRecord.message_id = delivery.messageId || null;
  emailRecord.status = delivery.success ? 'SENT' : 'FAILED';
  if (!delivery.success) emailRecord.error = delivery.error;
  if (saveDb) saveDb(db);

  if (delivery.success) {
    console.log(`[EmailService] ✉️ Registration confirmation email delivered to: ${recipientEmail} (${delivery.messageId}) [${delivery.provider}]`);
  }

  return {
    success: delivery.success,
    emailRecord,
    previewUrl: delivery.previewUrl,
    error: delivery.error
  };
}

/**
 * Dispatches a welcome confirmation email to a newly registered user
 */
export async function sendWelcomeRegistrationEmail({
  recipientEmail,
  username,
  inGameName,
  role = 'PLAYER',
  db,
  saveDb
}) {
  const transporter = await getTransporter();
  const defaultFrom = process.env.SMTP_USER
    ? `"GearUp Esports" <${process.env.SMTP_USER}>`
    : '"GearUp Esports" <no-reply@gearup.gg>';
  const fromAddress = process.env.SMTP_FROM || defaultFrom;
  const subject = `🔥 Welcome to GearUp Esports - Account Successfully Registered!`;

  const contentHtml = `
    <h2 style="color:#FFFFFF;margin-top:0;font-size:20px;font-weight:800;text-transform:uppercase;">
      Welcome to the Arena, ${username}!
    </h2>
    <p style="font-size:14px;line-height:1.6;color:#CBD5E1;">
      Your GearUp player account has been created successfully. You are now equipped to participate in verified BGMI and Free Fire MAX competitive tournaments, track real-time match stats, and win real prize pools.
    </p>

    <div class="info-card">
      <div style="font-size:12px;font-weight:800;color:#5BD19B;text-transform:uppercase;margin-bottom:12px;letter-spacing:1px;">
        Profile Summary
      </div>
      <table class="grid-table">
        <tr>
          <td class="label" style="width:35%;">Username:</td>
          <td class="val">${username}</td>
        </tr>
        <tr>
          <td class="label">In-Game Name:</td>
          <td class="val-highlight">${inGameName || username}</td>
        </tr>
        <tr>
          <td class="label">Registered Email:</td>
          <td class="val">${recipientEmail}</td>
        </tr>
        <tr>
          <td class="label">Account Role:</td>
          <td class="val">${role}</td>
        </tr>
      </table>
    </div>

    <div class="notice-box">
      <strong>🚀 QUICK START GUIDE:</strong>
      <ol style="margin:8px 0 0 18px;padding:0;">
        <li>Browse active tournaments on the homepage.</li>
        <li>Register your squad with your in-game UID and mobile number.</li>
        <li>Receive your match confirmation email and real-time room credentials prior to match time!</li>
      </ol>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="http://localhost:5173" class="btn" target="_blank">Start Competing</a>
    </div>
  `;

  const html = buildEmailTemplate({
    title: subject,
    badge: 'ACCOUNT REGISTERED',
    contentHtml
  });

  const text = `
WELCOME TO GEARUP ESPORTS
-------------------------
Welcome, ${username}! Your account has been successfully created.
Email: ${recipientEmail}
Role: ${role}

Visit http://localhost:5173 to join tournaments!
`;

  const delivery = await deliverMail({
    from: fromAddress,
    to: recipientEmail,
    subject,
    text,
    html
  });

  const emailRecord = {
    id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    type: 'ACCOUNT_REGISTRATION',
    recipient: recipientEmail,
    subject,
    username,
    timestamp: new Date().toISOString(),
    preview_url: delivery.previewUrl || null,
    message_id: delivery.messageId || null,
    status: delivery.success ? 'SENT' : 'FAILED',
    error: delivery.error || null,
    html
  };

  if (db) {
    if (!Array.isArray(db.sent_emails)) db.sent_emails = [];
    db.sent_emails.unshift(emailRecord);
    if (saveDb) saveDb(db);
  }

  if (delivery.success) {
    console.log(`[EmailService] ✉️ Welcome email delivered to: ${recipientEmail} (${delivery.messageId}) [${delivery.provider}]`);
  }

  return {
    success: delivery.success,
    emailRecord,
    previewUrl: delivery.previewUrl,
    error: delivery.error
  };
}

/**
 * Verifies the current SMTP configuration
 */
export async function verifySmtp(forceRefresh = true) {
  if (forceRefresh) reloadEnv();

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    try {
      const transporter = await getTransporter(forceRefresh);
      if (transporter && typeof transporter.verify === 'function') {
        const verifyPromise = transporter.verify();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SMTP timeout')), 15000)
        );
        await Promise.race([verifyPromise, timeoutPromise]);
      }
      return {
        connected: true,
        mode: 'GMAIL_SMTP',
        provider: host,
        user,
        message: `Successfully authenticated with Gmail SMTP as ${user}! Delivering real emails to player inboxes.`
      };
    } catch (err) {
      const isAppPassReq = err.responseCode === 534 || err.responseCode === 535 || err.message?.includes('Application-specific') || err.message?.includes('BadCredentials');
      return {
        connected: false,
        mode: 'FAILED',
        error: err.message,
        code: err.responseCode || err.code,
        help: isAppPassReq
          ? 'Google requires a 16-letter App Password because 2-Step Verification is active. Generate one at https://myaccount.google.com/apppasswords and paste it into SMTP_PASS in .env'
          : 'Failed to authenticate with SMTP server. Check credentials in .env.'
      };
    }
  }

  if (process.env.RESEND_API_KEY?.trim()) {
    return {
      connected: true,
      mode: 'RESEND_HTTPS',
      provider: 'api.resend.com (Port 443)',
      message: 'Active Resend HTTPS API configured! Real emails delivering to inboxes over port 443.'
    };
  }

  if (process.env.BREVO_API_KEY?.trim()) {
    return {
      connected: true,
      mode: 'BREVO_HTTPS',
      provider: 'api.brevo.com (Port 443)',
      message: 'Active Brevo HTTPS API configured! Real emails delivering to inboxes over port 443.'
    };
  }

  return {
    connected: false,
    mode: 'ETHEREAL_SANDBOX',
    message: 'No SMTP credentials in .env. Using simulated delivery with on-screen verification codes.'
  };
}

/**
 * Dispatches a quick test email to verify delivery
 */
export async function sendTestEmail(recipientEmail, forceRefresh = true) {
  if (forceRefresh) reloadEnv();
  const target = recipientEmail || process.env.SMTP_USER;
  if (!target) throw new Error('No recipient email specified');

  const defaultFrom = process.env.SMTP_USER
    ? `"GearUp Esports" <${process.env.SMTP_USER}>`
    : '"GearUp Esports" <no-reply@gearup.gg>';
  const fromAddress = process.env.SMTP_FROM || defaultFrom;

  const subject = '🎮 GearUp Esports - Email Delivery Test';
  const html = `
    <div style="font-family:sans-serif;background:#0F1A28;color:#fff;padding:24px;border-radius:12px;border:1px solid #1F324B;max-width:500px;">
      <h2 style="color:#5BD19B;margin-top:0;">⚡ Email Delivery Test Passed!</h2>
      <p>Congratulations! Your GearUp email delivery is working smoothly to <strong>${target}</strong>.</p>
      <p style="color:#94a3b8;font-size:13px;">Sent from GearUp platform at ${new Date().toLocaleString('en-IN')}.</p>
    </div>
  `;

  const delivery = await deliverMail({
    from: fromAddress,
    to: target,
    subject,
    text: `GearUp Esports Email Delivery Test Passed! Sent at ${new Date().toISOString()}`,
    html
  });

  if (!delivery.success) {
    throw new Error(delivery.error || 'Failed to deliver test email');
  }

  return {
    success: true,
    recipient: target,
    messageId: delivery.messageId,
    previewUrl: delivery.previewUrl,
    provider: delivery.provider
  };
}

/**
 * Dispatches a password reset OTP verification code email
 */
export async function sendPasswordResetOtpEmail({
  emailId,
  recipientEmail,
  username,
  otp,
  db,
  saveDb
}) {
  const defaultFrom = process.env.SMTP_USER
    ? `"GearUp Esports" <${process.env.SMTP_USER}>`
    : '"GearUp Esports" <no-reply@gearup.gg>';
  const fromAddress = process.env.SMTP_FROM || defaultFrom;
  const subject = `🔐 ${otp} is your GearUp Password Reset Code`;

  const contentHtml = `
    <h2 style="color:#FFFFFF;margin-top:0;font-size:20px;font-weight:800;text-transform:uppercase;">
      Password Reset Request
    </h2>
    <p style="font-size:14px;line-height:1.6;color:#CBD5E1;">
      Hey <strong>${username || 'Player'}</strong>, we received a request to reset your GearUp Esports account password.
      Please enter the single-use 6-digit verification code below to set your new password:
    </p>

    <div style="background-color: #0B131E; border: 2px dashed #5BD19B; border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0;">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #94A3B8; text-transform: uppercase; margin-bottom: 6px;">
        Your Password Reset Code (OTP)
      </div>
      <div style="font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #5BD19B; font-family: monospace; padding: 6px 0;">
        ${otp}
      </div>
      <div style="font-size: 12px; color: #F59E0B; font-weight: 700; margin-top: 6px;">
        ⏱️ Valid for 10 minutes
      </div>
    </div>

    <div class="notice-box">
      <strong>⚠️ SECURITY NOTICE:</strong><br>
      • Never share this OTP code with anyone. GearUp admins will never ask for your password or reset codes.<br>
      • If you did not request a password reset, you can safely ignore this email. Your account remains completely secure.
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="http://localhost:5173" class="btn" target="_blank">Open GearUp Platform</a>
    </div>
  `;

  const html = buildEmailTemplate({
    title: subject,
    badge: 'PASSWORD RESET',
    contentHtml
  });

  const text = `
GEARUP ESPORTS - PASSWORD RESET VERIFICATION
--------------------------------------------
Hello ${username || 'Player'},

Your One-Time Password (OTP) to reset your password is:

>>> ${otp} <<<

This code is valid for 10 minutes.
If you did not request this reset, your account is safe and you can ignore this email.
`;

  const recordId = emailId || `email-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const emailRecord = {
    id: recordId,
    type: 'PASSWORD_RESET',
    recipient: recipientEmail,
    subject,
    username: username || '',
    otp,
    timestamp: new Date().toISOString(),
    preview_url: null,
    message_id: null,
    status: 'SENDING',
    html
  };

  if (db) {
    if (!Array.isArray(db.sent_emails)) db.sent_emails = [];
    const existingIdx = db.sent_emails.findIndex(e => e.id === recordId);
    if (existingIdx !== -1) {
      db.sent_emails[existingIdx] = emailRecord;
    } else {
      db.sent_emails.unshift(emailRecord);
    }
    if (saveDb) saveDb(db);
  }

  const delivery = await deliverMail({
    from: fromAddress,
    to: recipientEmail,
    subject,
    text,
    html
  });

  emailRecord.preview_url = delivery.previewUrl || null;
  emailRecord.message_id = delivery.messageId || null;
  emailRecord.status = delivery.success ? 'SENT' : 'FAILED';
  if (!delivery.success) emailRecord.error = delivery.error;
  if (saveDb) saveDb(db);

  if (delivery.success) {
    console.log(`[EmailService] ✉️ Password reset OTP email delivered to: ${recipientEmail} (${delivery.messageId}) [${delivery.provider}]`);
  }

  return {
    success: delivery.success,
    emailRecord,
    previewUrl: delivery.previewUrl,
    error: delivery.error
  };
}


