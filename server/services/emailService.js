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
            auth: { user, pass },
            pool: true,
            maxConnections: 3,
            maxMessages: 100,
            rateLimit: 5,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000
          }
        : {
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
            pool: true,
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

  let info;
  let previewUrl = null;

  try {
    const transporter = await getTransporter();
    info = await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject,
      text,
      html
    });

    if (nodemailer.getTestMessageUrl) {
      previewUrl = nodemailer.getTestMessageUrl(info) || null;
    }
    
    emailRecord.preview_url = previewUrl;
    emailRecord.message_id = info?.messageId || null;
    emailRecord.status = 'SENT';
    if (saveDb) saveDb(db);

    console.log(`[EmailService] ✉️ Registration confirmation email delivered to: ${recipientEmail} (${info.messageId})`);
    return {
      success: true,
      emailRecord,
      previewUrl
    };
  } catch (err) {
    console.error(`[EmailService] ❌ Failed delivering to ${recipientEmail}:`, err.message);
    emailRecord.status = 'FAILED';
    emailRecord.error = err.message;
    if (saveDb) saveDb(db);

    return {
      success: false,
      error: err.message,
      emailRecord
    };
  }
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

  let info;
  let previewUrl = null;

  try {
    info = await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject,
      text,
      html
    });

    if (nodemailer.getTestMessageUrl) {
      previewUrl = nodemailer.getTestMessageUrl(info) || null;
    }
  } catch (err) {
    console.error(`[EmailService] Failed sending welcome email to ${recipientEmail}:`, err.message);
    info = { messageId: `err-${Date.now()}`, error: err.message };
  }

  const emailRecord = {
    id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    type: 'ACCOUNT_REGISTRATION',
    recipient: recipientEmail,
    subject,
    username,
    timestamp: new Date().toISOString(),
    preview_url: previewUrl,
    message_id: info?.messageId || null,
    status: info?.error ? 'FAILED' : 'SENT',
    html
  };

  if (db) {
    if (!Array.isArray(db.sent_emails)) db.sent_emails = [];
    db.sent_emails.unshift(emailRecord);
    if (saveDb) saveDb(db);
  }

  console.log(`[EmailService] ✉️ Welcome email sent to: ${recipientEmail}`);
  if (previewUrl) {
    console.log(`[EmailService] 🔗 Online Ethereal Preview URL: ${previewUrl}`);
  }

  return {
    success: !info?.error,
    emailRecord,
    previewUrl
  };
}

/**
 * Verifies the current SMTP configuration
 */
export async function verifySmtp(forceRefresh = true) {
  if (forceRefresh) reloadEnv();
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return {
      connected: false,
      mode: 'ETHEREAL_SANDBOX',
      message: 'No SMTP credentials in .env. Using Ethereal sandbox (preview links only).'
    };
  }

  try {
    const transporter = await getTransporter(forceRefresh);
    if (transporter && typeof transporter.verify === 'function') {
      await transporter.verify();
    }
    return {
      connected: true,
      mode: 'REAL_SMTP',
      provider: host,
      user,
      message: `Successfully authenticated with ${host} as ${user}!`
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
        : err.message
    };
  }
}

/**
 * Dispatches a quick test email to verify delivery
 */
export async function sendTestEmail(recipientEmail, forceRefresh = true) {
  if (forceRefresh) reloadEnv();
  const target = recipientEmail || process.env.SMTP_USER;
  if (!target) throw new Error('No recipient email specified');

  const transporter = await getTransporter(forceRefresh);
  const defaultFrom = process.env.SMTP_USER
    ? `"GearUp Esports" <${process.env.SMTP_USER}>`
    : '"GearUp Esports" <no-reply@gearup.gg>';
  const fromAddress = process.env.SMTP_FROM || defaultFrom;

  const subject = '🎮 GearUp Esports - SMTP Test Email';
  const html = `
    <div style="font-family:sans-serif;background:#0F1A28;color:#fff;padding:24px;border-radius:12px;border:1px solid #1F324B;max-width:500px;">
      <h2 style="color:#5BD19B;margin-top:0;">⚡ SMTP Delivery Test Passed!</h2>
      <p>Congratulations! Your GearUp email delivery is working smoothly through <strong>${process.env.SMTP_USER || 'SMTP'}</strong>.</p>
      <p style="color:#94a3b8;font-size:13px;">Sent from GearUp localhost test suite at ${new Date().toLocaleString('en-IN')}.</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: fromAddress,
    to: target,
    subject,
    text: `GearUp Esports SMTP Delivery Test Passed! Sent at ${new Date().toISOString()}`,
    html
  });

  return {
    success: true,
    recipient: target,
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null
  };
}

