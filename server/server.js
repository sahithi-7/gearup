import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { sendTournamentRegistrationEmail, sendWelcomeRegistrationEmail, verifySmtp, sendTestEmail } from './services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env if present
const envCandidates = [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '..', '.env.local')
];
for (const envFile of envCandidates) {
  if (fs.existsSync(envFile)) {
    try {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(envFile);
        console.log(`[Config] Loaded environment variables from ${envFile}`);
      }
      break;
    } catch (e) {
      console.warn(`[Config] Error loading ${envFile}:`, e.message);
    }
  }
}

const PORT = process.env.PORT || 3001;
const DB_DIR = path.join(__dirname, 'data');
const SQLITE_PATH = path.join(DB_DIR, 'gearup.sqlite');
const LEGACY_DB_PATH = path.join(DB_DIR, 'db.json');
const SUPPORTED_GAMES = ['BGMI', 'Free Fire MAX'];

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT']
  }
});

// Initial mock dataset for a first-run database.
const SEED_DATA = {
  tournaments: [
    {
      id: 't-1',
      title: 'BGMI SUNDAY CLASH SERIES 4',
      game: 'BGMI',
      format: 'Squad',
      organiser_name: 'GearUp Official',
      date: '2026-09-13',
      time: '20:00',
      entry_fee: 0,
      prize_pool: 10000,
      slots_total: 100,
      slots_filled: 74,
      status: 'REGISTRATION_OPEN',
      banner_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200',
      map: 'Erangel',
      rules: '1. Standard BGMI Esports TPP Squad scoring system apply (10 pts #1, 1 pt per kill).\n2. Emulators and iPad views are strictly prohibited. Mobile devices only.\n3. Hackers/cheaters will face a lifetime ban and forfeit prizes.\n4. Room credentials will unlock in this portal 15 minutes before the match start time.',
      room_credential: {
        roomId: 'BGMI-882914',
        roomPassword: 'GEARUP#SUNDAY',
        instructions: 'Enter Room within 10 minutes. Slot assigned upon entry.',
        isReleased: true,
        releasedAt: new Date().toISOString()
      },
      prize_breakdown: [
        { rank: '1st Place', prize: 5000 },
        { rank: '2nd Place', prize: 3000 },
        { rank: '3rd Place', prize: 2000 }
      ],
      standings: [
        { rank: 1, team_name: 'Soul Esports', player_names: 'Mortal, Viper, Regaltos, Aman', kills: 14, points: 29, prize_amount: 5000 },
        { rank: 2, team_name: 'GodLike', player_names: 'Jonathan, Neyoo, Zgod, Shadow', kills: 11, points: 21, prize_amount: 3000 },
        { rank: 3, team_name: 'Team Velocity', player_names: 'NinjaGamer99, Axe, Blaze, Neo', kills: 8, points: 16, prize_amount: 2000 }
      ]
    },
    {
      id: 't-2',
      title: 'FREE FIRE MAX NIGHT CUP SHOWDOWN',
      game: 'Free Fire MAX',
      format: 'Squad',
      organiser_name: 'Apex Arena',
      date: '2026-09-15',
      time: '21:30',
      entry_fee: 50,
      prize_pool: 15000,
      slots_total: 48,
      slots_filled: 48,
      status: 'REGISTRATION_OPEN',
      banner_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=1200',
      map: 'Bermuda',
      rules: '1. Squad Rush mode. Gun property active.\n2. Character skills are allowed.\n3. Room ID will be broadcasted 15 mins prior. Ensure all squad members are in your lobby.\n4. Top 3 teams win cash prizes transferred via UPI directly after match verification.',
      room_credential: {
        roomId: 'FF-440192',
        roomPassword: 'APEX#FFMAX',
        instructions: 'Squad leaders must join the specific assigned slot.',
        isReleased: false
      },
      prize_breakdown: [
        { rank: '1st Place', prize: 8000 },
        { rank: '2nd Place', prize: 4500 },
        { rank: '3rd Place', prize: 2500 }
      ],
      standings: []
    },
    {
      id: 't-3',
      title: 'VALORANT COMMUNITY IGNITION SQUAD',
      game: 'Valorant',
      format: 'Squad',
      organiser_name: 'XYZ Gaming',
      date: '2026-09-20',
      time: '18:00',
      entry_fee: 0,
      prize_pool: 25000,
      slots_total: 32,
      slots_filled: 14,
      status: 'REGISTRATION_OPEN',
      banner_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=1200',
      map: 'Ascent / Bind',
      rules: '1. Mumbai Server, Tournament Mode enabled.\n2. Single-elimination best-of-1 until finals (BO3).\n3. Coaches are permitted in the designated coach slot.\n4. Both teams must upload end-game screenshots on result dispute.',
      room_credential: {
        roomId: 'VAL-CUSTOM-09',
        roomPassword: 'MUMBAI#CHAMPS',
        instructions: 'Lobby leader will invite team captains.',
        isReleased: false
      },
      prize_breakdown: [
        { rank: '1st Place', prize: 15000 },
        { rank: '2nd Place', prize: 7000 },
        { rank: '3rd Place', prize: 3000 }
      ],
      standings: []
    },
    {
      id: 't-4',
      title: 'CODM BATTLE ROYALE SHOWDOWN',
      game: 'CODM',
      format: 'Duo',
      organiser_name: 'GearUp Official',
      date: '2026-09-22',
      time: '19:00',
      entry_fee: 20,
      prize_pool: 5000,
      slots_total: 50,
      slots_filled: 29,
      status: 'REGISTRATION_OPEN',
      banner_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1200',
      map: 'Isolated',
      rules: '1. Duo FPP Battle Royale.\n2. Custom loadouts allowed from Airdrops only.\n3. No tank usage permitted. Violation leads to immediate match DQ.',
      room_credential: {
        roomId: 'CODM-BR-552',
        roomPassword: 'DUO#WAR',
        instructions: 'Join slot allocated to your registered duo.',
        isReleased: false
      },
      prize_breakdown: [
        { rank: '1st Place', prize: 3000 },
        { rank: '2nd Place', prize: 1500 },
        { rank: '3rd Place', prize: 500 }
      ],
      standings: []
    }
  ],
  registrations: [],
  chat_messages: [],
  payment_requests: [],
  wallets: {
    'u-admin-1': {
      balance: 0,
      transactions: []
    }
  }
};

const DEFAULT_USERS = [
  {
    id: 'u-admin-1',
    username: 'Esports Admin',
    email: 'gearupesportsofficial@gmail.com',
    password: 'Saketh?999',
    role: 'ADMIN',
    is_admin: true,
    wallet_balance: 0
  }
];

SEED_DATA.tournaments = SEED_DATA.tournaments.filter(tournament => SUPPORTED_GAMES.includes(tournament.game));

// SQLite persistence helpers. The state document keeps the existing API data
// shape stable while moving durable storage out of a mutable JSON file.
let database;

function loadDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  database = new DatabaseSync(SQLITE_PATH);
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS application_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const existing = database.prepare('SELECT payload FROM application_state WHERE id = 1').get();
  if (existing) return JSON.parse(existing.payload);

  let initialData = JSON.parse(JSON.stringify(SEED_DATA));
  if (fs.existsSync(LEGACY_DB_PATH)) {
    try {
      initialData = JSON.parse(fs.readFileSync(LEGACY_DB_PATH, 'utf-8'));
      console.log('Migrated existing data from db.json to SQLite.');
    } catch (err) {
      console.warn('Could not migrate db.json; starting with seed data.', err);
    }
  }

  database.prepare(
    'INSERT INTO application_state (id, payload, updated_at) VALUES (1, ?, ?)'
  ).run(JSON.stringify(initialData), new Date().toISOString());
  return initialData;
}

let isSavingFile = false;

function saveDb(data) {
  database.prepare(
    'UPDATE application_state SET payload = ?, updated_at = ? WHERE id = 1'
  ).run(JSON.stringify(data), new Date().toISOString());

  // Also keep db.json updated for easy human inspection and editing
  try {
    isSavingFile = true;
    fs.writeFileSync(LEGACY_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    setTimeout(() => { isSavingFile = false; }, 300);
  } catch {
    isSavingFile = false;
  }
}

let db = loadDb();

function watchDbFile() {
  if (!fs.existsSync(LEGACY_DB_PATH)) return;

  fs.watch(LEGACY_DB_PATH, (eventType) => {
    if (eventType !== 'change' || isSavingFile) return;
    try {
      const raw = fs.readFileSync(LEGACY_DB_PATH, 'utf-8');
      const fileData = JSON.parse(raw);
      if (fileData && typeof fileData === 'object') {
        db = fileData;
        database.prepare(
          'UPDATE application_state SET payload = ?, updated_at = ? WHERE id = 1'
        ).run(JSON.stringify(db), new Date().toISOString());
        console.log('🔄 [AutoSync] db.json was modified. Successfully reloaded into SQLite!');
        io.emit('tournament:updated');
      }
    } catch {
      // Ignore partial file write states while saving
    }
  });
}

watchDbFile();

function ensureUsers() {
  let changed = false;
  if (!Array.isArray(db.users)) {
    db.users = DEFAULT_USERS.map(user => ({ ...user }));
    changed = true;
  } else {
    for (const defaultUser of DEFAULT_USERS) {
      if (!db.users.some(user => user.id === defaultUser.id)) {
        db.users.push({ ...defaultUser });
        changed = true;
      }
    }
  }

  db.users = db.users.map(user => {
    const normalized = {
      ...user,
      role: ['PLAYER', 'ORGANISER', 'ADMIN'].includes(user.role) ? user.role : 'PLAYER',
      is_admin: user.role === 'ADMIN'
    };
    if (normalized.role !== user.role || normalized.is_admin !== user.is_admin) changed = true;
    return normalized;
  });

  for (const user of db.users) {
    if (!user.password) {
      user.password = user.is_admin || user.role === 'ORGANISER' ? 'admin123' : 'password123';
      changed = true;
    }
    if (!db.wallets[user.id]) {
      db.wallets[user.id] = { balance: user.wallet_balance ?? 0, transactions: [] };
      changed = true;
    }
  }

  if (!Array.isArray(db.notifications)) {
    db.notifications = [];
    changed = true;
  }

  if (!Array.isArray(db.sent_emails)) {
    db.sent_emails = [];
    changed = true;
  }

  if (!Array.isArray(db.payment_requests)) {
    db.payment_requests = [];
    changed = true;
  }

  if (changed) saveDb(db);
}

ensureUsers();

function removeUnsupportedGames() {
  const supportedTournamentIds = new Set(
    db.tournaments.filter(tournament => SUPPORTED_GAMES.includes(tournament.game)).map(tournament => tournament.id)
  );
  const originalTournamentCount = db.tournaments.length;
  const originalRegistrationCount = db.registrations.length;

  db.tournaments = db.tournaments.filter(tournament => supportedTournamentIds.has(tournament.id));
  db.registrations = db.registrations.filter(registration => supportedTournamentIds.has(registration.tournament_id));
  db.chat_messages = (db.chat_messages || []).filter(message => supportedTournamentIds.has(message.tournament_id));

  if (db.tournaments.length !== originalTournamentCount || db.registrations.length !== originalRegistrationCount) {
    saveDb(db);
  }
}

removeUnsupportedGames();

// Track active connected clients
let activeConnections = 0;

io.on('connection', (socket) => {
  activeConnections++;
  io.emit('users:count', activeConnections);
  console.log(`[Socket] Client connected. Total active: ${activeConnections}`);

  socket.on('disconnect', () => {
    activeConnections = Math.max(0, activeConnections - 1);
    io.emit('users:count', activeConnections);
    console.log(`[Socket] Client disconnected. Total active: ${activeConnections}`);
  });

  // Client joins specific tournament lobby room for chat & live score updates
  socket.on('join_tournament', (tournamentId) => {
    socket.join(`tournament_${tournamentId}`);
  });

  socket.on('leave_tournament', (tournamentId) => {
    socket.leave(`tournament_${tournamentId}`);
  });

  // Client registers their user ID for targeted alerts & private notifications
  socket.on('register_user', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
    }
  });

  socket.on('unregister_user', (userId) => {
    if (userId) {
      socket.leave(`user_${userId}`);
    }
  });

  // Chat message event via socket
  socket.on('send_chat', (data) => {
    if (!data.tournament_id || !data.message) return;
    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tournament_id: data.tournament_id,
      user_id: data.user_id || 'anonymous',
      username: data.username || 'Gamer',
      role: data.role || 'PLAYER',
      message: data.message.trim(),
      timestamp: new Date().toISOString(),
      is_announcement: Boolean(data.is_announcement)
    };

    if (!db.chat_messages) db.chat_messages = [];
    db.chat_messages.push(newMsg);
    saveDb(db);

    io.to(`tournament_${data.tournament_id}`).emit('chat:message', newMsg);
  });
});

// REST API Endpoints

// 1. Health & Server Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    online_users: activeConnections,
    timestamp: new Date().toISOString(),
    tournaments_count: db.tournaments.length
  });
});

// 2. Get All Tournaments
app.get('/api/tournaments', (req, res) => {
  res.json(db.tournaments);
});

// 3. Get Single Tournament
app.get('/api/tournaments/:id', (req, res) => {
  const tournament = db.tournaments.find(t => t.id === req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  res.json(tournament);
});

// 4. Create Tournament
app.post('/api/tournaments', (req, res) => {
  const data = req.body;
  if (!SUPPORTED_GAMES.includes(data.game)) {
    return res.status(400).json({ error: 'Only BGMI and Free Fire MAX tournaments are supported' });
  }
  const prizeBreakdown = Array.isArray(data.prize_breakdown) && data.prize_breakdown.length > 0
    ? data.prize_breakdown.map(p => ({ rank: String(p.rank), prize: Number(p.prize) || 0 }))
    : [
        { rank: '1st Place', prize: Number(data.first_prize) || 0 },
        { rank: '2nd Place', prize: Number(data.second_prize) || 0 },
        { rank: '3rd Place', prize: Number(data.third_prize) || 0 }
      ];

  const totalPrizePool = (data.prize_pool !== undefined && !isNaN(Number(data.prize_pool)))
    ? Number(data.prize_pool)
    : prizeBreakdown.reduce((sum, p) => sum + p.prize, 0);

  const newTournament = {
    ...data,
    id: `t-${Date.now()}`,
    slots_filled: 0,
    status: data.status || 'REGISTRATION_OPEN',
    prize_pool: totalPrizePool,
    prize_breakdown: prizeBreakdown,
    standings: []
  };

  db.tournaments.unshift(newTournament);
  saveDb(db);

  // Real-time broadcast
  io.emit('tournament:created', newTournament);

  res.status(201).json(newTournament);
});

// 5. Update / Broadcast Room Credentials
app.put('/api/tournaments/:id/room', (req, res) => {
  const { roomId, roomPassword, instructions, isReleased } = req.body;
  const requesterId = req.get('x-user-id') || req.body.requesterId;
  const requester = db.users?.find(u => u.id === requesterId);

  const index = db.tournaments.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  const tournament = db.tournaments[index];
  const released = Boolean(isReleased);
  const now = new Date().toISOString();

  const roomCredential = {
    roomId: typeof roomId === 'string' ? roomId.trim() : '',
    roomPassword: typeof roomPassword === 'string' ? roomPassword.trim() : '',
    instructions: typeof instructions === 'string' ? instructions.trim() : '',
    isReleased: released,
    releasedAt: released ? (tournament.room_credential?.releasedAt || now) : tournament.room_credential?.releasedAt
  };

  tournament.room_credential = roomCredential;
  if (released && tournament.status === 'REGISTRATION_OPEN') {
    tournament.status = 'ROOM_RELEASED';
  }

  db.tournaments[index] = tournament;

  // Registered players for this tournament
  const registered = db.registrations.filter(r => r.tournament_id === tournament.id);

  if (released) {
    // 1. Create persistent notifications for all registered users
    if (!Array.isArray(db.notifications)) db.notifications = [];

    // Remove previous room notifications for this tournament to keep inbox clean
    db.notifications = db.notifications.filter(
      n => !(n.tournament_id === tournament.id && n.type === 'ROOM_CREDENTIALS')
    );

    const newNotifications = registered.map(reg => ({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id: reg.user_id,
      tournament_id: tournament.id,
      tournament_title: tournament.title,
      game: tournament.game,
      type: 'ROOM_CREDENTIALS',
      title: `Room Credentials Unlocked: ${tournament.title}`,
      message: `Room ID: ${roomCredential.roomId} | Password: ${roomCredential.roomPassword}${roomCredential.instructions ? ` | Note: ${roomCredential.instructions}` : ''}`,
      roomId: roomCredential.roomId,
      roomPassword: roomCredential.roomPassword,
      instructions: roomCredential.instructions,
      timestamp: now,
      read: false
    }));

    db.notifications.unshift(...newNotifications);

    // 2. Post an official announcement into the tournament chat
    const announcementMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tournament_id: tournament.id,
      user_id: requesterId || 'system-announcer',
      username: requester?.username || tournament.organiser_name || 'Tournament Admin',
      role: 'ORGANISER',
      message: `📢 [OFFICIAL ROOM UNLOCK] Room ID: ${roomCredential.roomId} | Password: ${roomCredential.roomPassword}${roomCredential.instructions ? ` | Instructions: ${roomCredential.instructions}` : ''}. Please join the lobby!`,
      timestamp: now,
      is_announcement: true
    };
    if (!db.chat_messages) db.chat_messages = [];
    db.chat_messages.push(announcementMsg);
    io.to(`tournament_${tournament.id}`).emit('chat:message', announcementMsg);

    // 3. Emit targeted room alert to registered user socket rooms
    const broadcastPayload = {
      tournament_id: tournament.id,
      tournament_title: tournament.title,
      game: tournament.game,
      roomId: roomCredential.roomId,
      roomPassword: roomCredential.roomPassword,
      instructions: roomCredential.instructions,
      timestamp: now,
      recipients_count: registered.length,
      registered_user_ids: registered.map(r => r.user_id)
    };

    registered.forEach(reg => {
      io.to(`user_${reg.user_id}`).emit('room:credentials_sent', broadcastPayload);
    });

    // Also broadcast room event with registered_user_ids so client listeners can filter
    io.emit('room:broadcast', broadcastPayload);
  }

  saveDb(db);

  // Broadcast tournament update
  io.emit('tournament:updated', tournament);

  res.json({
    success: true,
    tournament,
    dispatched_count: released ? registered.length : 0,
    recipients: released ? registered : []
  });
});

// 6. Update Tournament Status (e.g., LIVE, COMPLETED)
app.put('/api/tournaments/:id/status', (req, res) => {
  const { status } = req.body;
  const index = db.tournaments.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  db.tournaments[index].status = status;
  if (status === 'COMPLETED' && db.settings?.hide_completed) {
    db.tournaments[index].is_hidden = true;
  }
  saveDb(db);

  io.emit('tournament:updated', db.tournaments[index]);
  res.json(db.tournaments[index]);
});

// 6b. Update Single Tournament Visibility (Admin hide / show from players)
app.put('/api/tournaments/:id/visibility', (req, res) => {
  const { is_hidden } = req.body;
  const index = db.tournaments.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  db.tournaments[index].is_hidden = Boolean(is_hidden);
  saveDb(db);

  io.emit('tournament:updated', db.tournaments[index]);
  res.json({ success: true, tournament: db.tournaments[index] });
});

// 6c. Delete Tournament (Permanent Removal)
app.delete('/api/tournaments/:id', (req, res) => {
  const tournamentId = req.params.id;
  const index = db.tournaments.findIndex(t => t.id === tournamentId);
  if (index === -1) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  const [deletedTournament] = db.tournaments.splice(index, 1);

  // Clean up associated registrations and messages
  if (Array.isArray(db.registrations)) {
    db.registrations = db.registrations.filter(r => r.tournament_id !== tournamentId);
  }
  if (Array.isArray(db.chat_messages)) {
    db.chat_messages = db.chat_messages.filter(m => m.tournament_id !== tournamentId);
  }

  saveDb(db);

  io.emit('tournament:deleted', { id: tournamentId });
  io.emit('tournaments:updated', db.tournaments);
  io.emit('registrations:updated', db.registrations);

  res.json({ success: true, deleted: deletedTournament });
});

// 6d. Toggle Global Completed Tournaments Visibility for Normal Users
app.post('/api/tournaments/toggle-hide-completed', (req, res) => {
  const { hide } = req.body;
  if (!db.settings) db.settings = {};
  const newHideVal = hide !== undefined ? Boolean(hide) : !db.settings.hide_completed;
  db.settings.hide_completed = newHideVal;

  db.tournaments = db.tournaments.map(t => {
    if (t.status === 'COMPLETED') {
      return { ...t, is_hidden: newHideVal };
    }
    return t;
  });

  saveDb(db);

  // Broadcast updates to all connected sockets
  db.tournaments.forEach(t => {
    io.emit('tournament:updated', t);
  });
  io.emit('tournaments:hide_completed_updated', { hide_completed: newHideVal });

  res.json({ success: true, hide_completed: newHideVal, tournaments: db.tournaments });
});

// 7. Update Tournament Prize Breakdown & Pool (Manual 1st, 2nd, 3rd)
app.put('/api/tournaments/:id/prizes', (req, res) => {
  const { prize_pool, prize_breakdown } = req.body;
  const index = db.tournaments.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  const tournament = db.tournaments[index];
  if (Array.isArray(prize_breakdown) && prize_breakdown.length > 0) {
    tournament.prize_breakdown = prize_breakdown.map(p => ({
      rank: String(p.rank),
      prize: Number(p.prize) || 0
    }));
  }

  if (prize_pool !== undefined && !isNaN(Number(prize_pool))) {
    tournament.prize_pool = Number(prize_pool);
  } else if (Array.isArray(tournament.prize_breakdown)) {
    tournament.prize_pool = tournament.prize_breakdown.reduce((sum, p) => sum + p.prize, 0);
  }

  db.tournaments[index] = tournament;
  saveDb(db);

  io.emit('tournament:updated', tournament);
  res.json({ success: true, tournament });
});

// 7. Register for Tournament
app.post('/api/tournaments/:id/register', async (req, res) => {
  const tournamentId = req.params.id;
  const { user_id, player_ign, player_uid, phone, team_name, teammates, email } = req.body;

  const tourneyIndex = db.tournaments.findIndex(t => t.id === tournamentId);
  if (tourneyIndex === -1) {
    return res.status(404).json({ success: false, message: 'Tournament not found' });
  }

  const tournament = db.tournaments[tourneyIndex];
  if (tournament.status === 'COMPLETED') {
    return res.status(400).json({ success: false, message: 'This tournament has already ended. Registration is closed.' });
  }

  if (tournament.slots_filled >= tournament.slots_total) {
    return res.status(400).json({ success: false, message: 'Tournament slots are completely filled!' });
  }

  // Team validation for Duo and Squad
  const isTeamTournament = tournament.format === 'Duo' || tournament.format === 'Squad';
  if (isTeamTournament && (!team_name || !team_name.trim())) {
    return res.status(400).json({ success: false, message: `Team Name is required for ${tournament.format} tournaments` });
  }

  const cleanTeammates = Array.isArray(teammates)
    ? teammates
        .map(t => ({
          name: typeof t?.name === 'string' ? t.name.trim() : '',
          uid: typeof t?.uid === 'string' ? t.uid.trim() : ''
        }))
        .filter(t => t.name && t.uid)
    : [];

  const existing = db.registrations.find(
    r => r.tournament_id === tournamentId && r.user_id === user_id
  );
  if (existing) {
    return res.status(400).json({ success: false, message: 'You are already registered for this tournament' });
  }

  // Handle entry fee deduction if user has wallet
  if (tournament.entry_fee > 0 && user_id) {
    if (!db.wallets[user_id]) {
      db.wallets[user_id] = { balance: 0, transactions: [] };
    }
    if (db.wallets[user_id].balance < tournament.entry_fee) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance for entry fee' });
    }
    db.wallets[user_id].balance -= tournament.entry_fee;
    db.wallets[user_id].transactions.unshift({
      id: `tx-${Date.now()}`,
      user_id,
      type: 'ENTRY_FEE',
      amount: tournament.entry_fee,
      description: `Entry Fee: ${tournament.title}`,
      timestamp: new Date().toISOString(),
      status: 'COMPLETED'
    });
  }

  const user = db.users?.find(u => u.id === user_id);
  const recipientEmail = (email && typeof email === 'string' && email.trim())
    ? email.trim()
    : (user?.email || null);

  const newRegistration = {
    id: `reg-${Date.now()}`,
    tournament_id: tournament.id,
    tournament_title: tournament.title,
    game: tournament.game,
    user_id,
    email: recipientEmail,
    player_ign: typeof player_ign === 'string' ? player_ign.trim() : 'Player',
    player_uid: typeof player_uid === 'string' ? player_uid.trim() : '',
    phone: typeof phone === 'string' ? phone.trim() : '',
    team_name: team_name ? team_name.trim() : undefined,
    teammates: cleanTeammates,
    registered_at: new Date().toISOString(),
    status: 'CONFIRMED'
  };

  db.registrations.unshift(newRegistration);
  tournament.slots_filled += 1;
  db.tournaments[tourneyIndex] = tournament;
  saveDb(db);

  // Broadcast real-time slot update
  io.emit('tournament:registered', {
    tournamentId: tournament.id,
    slots_filled: tournament.slots_filled,
    slots_total: tournament.slots_total,
    registration: newRegistration
  });
  io.emit('tournament:updated', tournament);

  // Pre-generate email record ID so local preview URL is available instantly
  const emailRecordId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  // Dispatch confirmation email to registered player in background (non-blocking for instant UI response)
  if (recipientEmail) {
    sendTournamentRegistrationEmail({
      emailId: emailRecordId,
      recipientEmail,
      playerIgn: newRegistration.player_ign,
      playerUid: newRegistration.player_uid,
      teamName: newRegistration.team_name,
      teammates: newRegistration.teammates,
      phone: newRegistration.phone,
      tournament,
      db,
      saveDb
    }).catch(err => {
      console.error('[Registration] Background email dispatch failed:', err.message);
    });
  }

  res.status(201).json({
    success: true,
    message: recipientEmail
      ? `Registration confirmed! A confirmation email has been dispatched to ${recipientEmail}.`
      : 'Registration confirmed! Room details will unlock 15 minutes before start.',
    registration: newRegistration,
    wallet_balance: db.wallets[user_id]?.balance,
    email_sent: Boolean(recipientEmail),
    email: recipientEmail,
    preview_url: `/api/emails/${emailRecordId}/preview`
  });
});

// 8. Get & Manage Registrations
app.get('/api/registrations', (req, res) => {
  const { userId } = req.query;
  if (userId) {
    const filtered = db.registrations.filter(r => r.user_id === userId);
    return res.json(filtered);
  }
  res.json(db.registrations);
});

app.delete('/api/registrations/:id', (req, res) => {
  const regIndex = db.registrations.findIndex(r => r.id === req.params.id);
  if (regIndex === -1) {
    return res.status(404).json({ error: 'Registration not found' });
  }
  const removed = db.registrations[regIndex];
  db.registrations.splice(regIndex, 1);

  const tournament = db.tournaments.find(t => t.id === removed.tournament_id);
  if (tournament && tournament.slots_filled > 0) {
    tournament.slots_filled -= 1;
  }

  saveDb(db);
  io.emit('tournaments:updated', db.tournaments);
  io.emit('registrations:updated', db.registrations);
  res.json({ success: true, removed });
});

// 9. User registration and role management
app.get('/api/users', (req, res) => {
  const requesterId = req.get('x-user-id') || req.query.requesterId;
  const requester = db.users.find(user => user.id === requesterId);
  if (!requester) {
    return res.status(401).json({ error: 'A valid user is required to view user details' });
  }

  const canViewAllUsers = requester.role === 'ORGANISER' || requester.is_admin;
  const visibleUsers = canViewAllUsers ? db.users : [requester];
  const users = visibleUsers.map(user => ({
    ...user,
    wallet_balance: db.wallets[user.id]?.balance ?? user.wallet_balance ?? 0
  }));
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const { username, email, password, in_game_name, phone, role = 'PLAYER' } = req.body;
  const normalizedUsername = typeof username === 'string' ? username.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const userPassword = (typeof password === 'string' && password.trim()) ? password.trim() : 'password123';
  const validRoles = ['PLAYER', 'ORGANISER', 'ADMIN'];

  if (!normalizedUsername || !normalizedEmail) {
    return res.status(400).json({ error: 'Username and email are required' });
  }
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid user role' });
  }
  if (db.users.some(user => user.email.toLowerCase() === normalizedEmail)) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const user = {
    id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    username: normalizedUsername,
    email: normalizedEmail,
    password: userPassword,
    role,
    is_admin: role === 'ADMIN',
    in_game_name: typeof in_game_name === 'string' && in_game_name.trim() ? in_game_name.trim() : normalizedUsername,
    phone: typeof phone === 'string' ? phone.trim() : '',
    wallet_balance: 0
  };

  db.users.unshift(user);
  db.wallets[user.id] = { balance: 0, transactions: [] };
  saveDb(db);

  // Send welcome confirmation email
  let emailResult = null;
  try {
    emailResult = await sendWelcomeRegistrationEmail({
      recipientEmail: normalizedEmail,
      username: normalizedUsername,
      inGameName: user.in_game_name,
      role,
      db,
      saveDb
    });
  } catch (err) {
    console.error('[Registration] Welcome email failed:', err.message);
  }

  res.status(201).json({
    ...user,
    email_sent: Boolean(emailResult?.success),
    preview_url: emailResult?.previewUrl || (emailResult?.emailRecord ? `/api/emails/${emailResult.emailRecord.id}/preview` : null)
  });
});

// 10. User Login
app.post('/api/login', (req, res) => {
  const { identifier, email, username, password } = req.body;
  const userIdentifier = (identifier || email || username || '').trim().toLowerCase();
  const inputPassword = typeof password === 'string' ? password.trim() : '';

  if (!userIdentifier || !inputPassword) {
    return res.status(400).json({ error: 'Email/Username and password are required' });
  }

  const user = db.users.find(u =>
    u.email.toLowerCase() === userIdentifier || u.username.toLowerCase() === userIdentifier
  );

  if (!user || user.password !== inputPassword) {
    return res.status(401).json({ error: 'Invalid email/username or password' });
  }

  res.json({
    success: true,
    user: {
      ...user,
      wallet_balance: db.wallets[user.id]?.balance ?? user.wallet_balance ?? 0
    }
  });
});

app.put('/api/users/:id/role', (req, res) => {
  const { role } = req.body;
  const requesterId = req.get('x-user-id');
  const validRoles = ['PLAYER', 'ORGANISER', 'ADMIN'];
  const requester = db.users.find(candidate => candidate.id === requesterId);
  const user = db.users.find(candidate => candidate.id === req.params.id);

  if (!requester?.is_admin) return res.status(403).json({ error: 'Only admins can update user roles' });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid user role' });

  user.role = role;
  user.is_admin = role === 'ADMIN';
  saveDb(db);
  res.json(user);
});

// 10. Tournament Lobby Chat Messages
app.get('/api/tournaments/:id/chat', (req, res) => {
  const tournamentId = req.params.id;
  const messages = (db.chat_messages || []).filter(m => m.tournament_id === tournamentId);
  res.json(messages);
});

app.post('/api/tournaments/:id/chat', (req, res) => {
  const tournamentId = req.params.id;
  const { user_id, username, role, message, is_announcement } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const newMsg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    tournament_id: tournamentId,
    user_id: user_id || 'anonymous',
    username: username || 'Player',
    role: role || 'PLAYER',
    message: message.trim(),
    timestamp: new Date().toISOString(),
    is_announcement: Boolean(is_announcement)
  };

  if (!db.chat_messages) db.chat_messages = [];
  db.chat_messages.push(newMsg);
  saveDb(db);

  // Broadcast to room
  io.to(`tournament_${tournamentId}`).emit('chat:message', newMsg);

  res.status(201).json(newMsg);
});

// 11. Tournament Standings / Scoreboard
app.get('/api/tournaments/:id/standings', (req, res) => {
  const tournament = db.tournaments.find(t => t.id === req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
  res.json(tournament.standings || []);
});

app.put('/api/tournaments/:id/standings', (req, res) => {
  const tournamentId = req.params.id;
  const { standings } = req.body;

  const index = db.tournaments.findIndex(t => t.id === tournamentId);
  if (index === -1) return res.status(404).json({ error: 'Tournament not found' });

  db.tournaments[index].standings = standings;
  saveDb(db);

  io.to(`tournament_${tournamentId}`).emit('standings:updated', {
    tournament_id: tournamentId,
    standings
  });
  io.emit('tournament:updated', db.tournaments[index]);

  res.json({ success: true, standings });
});

// 12. Wallet Top-Up & Balance

app.post('/api/wallet/topup', (req, res) => {
  const { userId, amount, paymentMethod } = req.body;
  const topupAmount = Number(amount);

  if (isNaN(topupAmount) || topupAmount <= 0) {
    return res.status(400).json({ error: 'Invalid top-up amount' });
  }

  if (!db.wallets[userId]) {
    db.wallets[userId] = { balance: 0, transactions: [] };
  }

  db.wallets[userId].balance += topupAmount;
  const tx = {
    id: `tx-${Date.now()}`,
    user_id: userId,
    type: 'DEPOSIT',
    amount: topupAmount,
    description: `Added cash via ${paymentMethod || 'UPI (Instant Pay)'}`,
    timestamp: new Date().toISOString(),
    status: 'COMPLETED'
  };

  db.wallets[userId].transactions.unshift(tx);
  saveDb(db);

  res.json({
    success: true,
    balance: db.wallets[userId].balance,
    transaction: tx
  });
});

// 12b. Payment Config (Admin UPI Details for QR & UTR Top-Up)
app.get('/api/payment-config', (req, res) => {
  const config = db.payment_config || {
    upi_id: process.env.ADMIN_UPI_ID || '6303134462@axl',
    payee_name: process.env.ADMIN_PAYEE_NAME || 'GearUp Esports'
  };
  res.json(config);
});

app.put('/api/payment-config', (req, res) => {
  const { upi_id, payee_name } = req.body;
  const cleanUpi = typeof upi_id === 'string' ? upi_id.trim() : '';
  const cleanName = typeof payee_name === 'string' && payee_name.trim() ? payee_name.trim() : 'GearUp Esports';

  if (!cleanUpi || !cleanUpi.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid UPI ID (e.g. username@okhdfcbank or 9876543210@paytm)' });
  }

  db.payment_config = {
    upi_id: cleanUpi,
    payee_name: cleanName
  };
  saveDb(db);

  // Sync with .env file so it persists across server reboots
  try {
    const envPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (/ADMIN_UPI_ID=.*(\r?\n|$)/.test(envContent)) {
        envContent = envContent.replace(/ADMIN_UPI_ID=.*(\r?\n|$)/, `ADMIN_UPI_ID=${cleanUpi}$1`);
      } else {
        envContent += `\nADMIN_UPI_ID=${cleanUpi}\n`;
      }
      if (/ADMIN_PAYEE_NAME=.*(\r?\n|$)/.test(envContent)) {
        envContent = envContent.replace(/ADMIN_PAYEE_NAME=.*(\r?\n|$)/, `ADMIN_PAYEE_NAME=${cleanName}$1`);
      } else {
        envContent += `\nADMIN_PAYEE_NAME=${cleanName}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
    }
  } catch (err) {
    console.error('[PaymentConfig] Failed to sync .env file:', err.message);
  }

  process.env.ADMIN_UPI_ID = cleanUpi;
  process.env.ADMIN_PAYEE_NAME = cleanName;

  io.emit('payment:config_updated', db.payment_config);
  res.json({ success: true, config: db.payment_config });
});

// 12c. Submit 12-Digit UTR for Verification
app.post('/api/wallet/submit-utr', (req, res) => {
  const { userId, amount, utr_number } = req.body;
  const numAmount = Number(amount);
  const cleanUtr = typeof utr_number === 'string' ? utr_number.trim() : '';

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid top-up amount' });
  }
  if (!/^\d{12}$/.test(cleanUtr)) {
    return res.status(400).json({ error: 'UTR must be exactly 12 numeric digits (e.g. 425619382012)' });
  }

  if (!Array.isArray(db.payment_requests)) {
    db.payment_requests = [];
  }

  // Duplicate check across all existing requests that aren't rejected
  const duplicate = db.payment_requests.find(r => r.utr_number === cleanUtr && r.status !== 'REJECTED');
  if (duplicate) {
    return res.status(400).json({ error: 'This 12-digit UTR has already been submitted or claimed.' });
  }

  const user = db.users.find(u => u.id === userId);
  const newRequest = {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    username: user?.username || 'Player',
    player_ign: user?.in_game_name || user?.username || 'Player',
    phone: user?.phone || '',
    amount: numAmount,
    utr_number: cleanUtr,
    payment_method: 'UPI QR',
    status: 'PENDING',
    submitted_at: new Date().toISOString()
  };

  db.payment_requests.unshift(newRequest);
  saveDb(db);

  io.emit('payment:new_request', newRequest);
  io.emit('payment:requests_updated', db.payment_requests);

  res.status(201).json({
    success: true,
    message: 'Payment request submitted for admin verification. Your wallet will be credited once verified.',
    request: newRequest
  });
});

// 12d. Get Payment Requests (Admin or Player)
app.get('/api/wallet/requests', (req, res) => {
  if (!Array.isArray(db.payment_requests)) {
    db.payment_requests = [];
  }
  const { userId, status } = req.query;
  let list = db.payment_requests;
  if (userId) {
    list = list.filter(r => r.user_id === userId);
  }
  if (status) {
    list = list.filter(r => r.status === status);
  }
  res.json(list);
});

// 12e. Approve Payment Request (Admin 1-Click)
app.put('/api/wallet/requests/:id/approve', (req, res) => {
  if (!Array.isArray(db.payment_requests)) db.payment_requests = [];
  const reqItem = db.payment_requests.find(r => r.id === req.params.id);
  if (!reqItem) {
    return res.status(404).json({ error: 'Payment request not found' });
  }
  if (reqItem.status === 'APPROVED') {
    return res.status(400).json({ error: 'Payment request is already approved' });
  }

  reqItem.status = 'APPROVED';
  reqItem.approved_at = new Date().toISOString();

  // Credit player's wallet
  if (!db.wallets[reqItem.user_id]) {
    db.wallets[reqItem.user_id] = { balance: 0, transactions: [] };
  }
  db.wallets[reqItem.user_id].balance += reqItem.amount;

  const tx = {
    id: `tx-${Date.now()}`,
    user_id: reqItem.user_id,
    type: 'DEPOSIT',
    amount: reqItem.amount,
    description: `UPI QR Deposit (UTR: ${reqItem.utr_number})`,
    timestamp: new Date().toISOString(),
    status: 'COMPLETED'
  };
  db.wallets[reqItem.user_id].transactions.unshift(tx);

  // Send In-App Notification to player
  if (!Array.isArray(db.notifications)) db.notifications = [];
  db.notifications.unshift({
    id: `notif-${Date.now()}`,
    user_id: reqItem.user_id,
    tournament_id: '',
    tournament_title: 'GearUp Wallet',
    game: 'System',
    type: 'SYSTEM',
    title: `Deposit Approved! ₹${reqItem.amount} Credited`,
    message: `Your deposit of ₹${reqItem.amount} (UTR: ${reqItem.utr_number}) has been verified and credited to your wallet balance. You are ready to join matches!`,
    timestamp: new Date().toISOString(),
    read: false
  });

  saveDb(db);

  io.emit('payment:requests_updated', db.payment_requests);
  io.emit('wallet:updated', {
    userId: reqItem.user_id,
    balance: db.wallets[reqItem.user_id].balance
  });

  res.json({
    success: true,
    request: reqItem,
    new_balance: db.wallets[reqItem.user_id].balance
  });
});

// 12f. Reject Payment Request (Admin)
app.put('/api/wallet/requests/:id/reject', (req, res) => {
  if (!Array.isArray(db.payment_requests)) db.payment_requests = [];
  const reqItem = db.payment_requests.find(r => r.id === req.params.id);
  if (!reqItem) {
    return res.status(404).json({ error: 'Payment request not found' });
  }

  const { reason } = req.body;
  reqItem.status = 'REJECTED';
  reqItem.rejection_reason = reason || 'Payment could not be verified in bank records';

  // Notify player of rejection
  if (!Array.isArray(db.notifications)) db.notifications = [];
  db.notifications.unshift({
    id: `notif-${Date.now()}`,
    user_id: reqItem.user_id,
    tournament_id: '',
    tournament_title: 'GearUp Wallet',
    game: 'System',
    type: 'SYSTEM',
    title: 'Deposit Request Declined',
    message: `Your deposit request for ₹${reqItem.amount} (UTR: ${reqItem.utr_number}) could not be verified: ${reqItem.rejection_reason}. Please check your transaction details or contact support.`,
    timestamp: new Date().toISOString(),
    read: false
  });

  saveDb(db);

  io.emit('payment:requests_updated', db.payment_requests);

  res.json({ success: true, request: reqItem });
});

// 12g. Get Wallet Balance for specific User
app.get('/api/wallet/:userId', (req, res) => {
  const userId = req.params.userId;
  if (!userId || ['requests', 'topup', 'submit-utr'].includes(userId)) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  if (!db.wallets) db.wallets = {};
  if (!db.wallets[userId]) {
    db.wallets[userId] = { balance: 350, transactions: [] };
    saveDb(db);
  }
  res.json(db.wallets[userId]);
});

// 13. In-App Notifications API
app.get('/api/notifications', (req, res) => {
  const { userId } = req.query;
  if (!Array.isArray(db.notifications)) db.notifications = [];
  if (!userId) {
    return res.json(db.notifications.slice(0, 50));
  }
  const userNotifications = db.notifications
    .filter(n => n.user_id === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(userNotifications);
});

app.put('/api/notifications/:id/read', (req, res) => {
  if (!Array.isArray(db.notifications)) db.notifications = [];
  const notif = db.notifications.find(n => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    saveDb(db);
    return res.json({ success: true, notification: notif });
  }
  res.status(404).json({ error: 'Notification not found' });
});

app.put('/api/notifications/mark-all-read', (req, res) => {
  const { userId } = req.body;
  if (!Array.isArray(db.notifications)) db.notifications = [];
  if (userId) {
    db.notifications.forEach(n => {
      if (n.user_id === userId) n.read = true;
    });
    saveDb(db);
  }
  res.json({ success: true });
});

app.delete('/api/notifications/clear-all', (req, res) => {
  const userId = req.query.userId || req.body?.userId;
  if (!Array.isArray(db.notifications)) db.notifications = [];
  if (userId) {
    db.notifications = db.notifications.filter(n => n.user_id !== userId);
  } else {
    db.notifications = [];
  }
  saveDb(db);
  res.json({ success: true, count: db.notifications.length });
});

app.post('/api/notifications/clear-all', (req, res) => {
  const userId = req.query.userId || req.body?.userId;
  if (!Array.isArray(db.notifications)) db.notifications = [];
  if (userId) {
    db.notifications = db.notifications.filter(n => n.user_id !== userId);
  } else {
    db.notifications = [];
  }
  saveDb(db);
  res.json({ success: true, count: db.notifications.length });
});

app.delete('/api/notifications/:id', (req, res) => {
  if (!Array.isArray(db.notifications)) db.notifications = [];
  const initialCount = db.notifications.length;
  db.notifications = db.notifications.filter(n => n.id !== req.params.id);
  saveDb(db);
  res.json({ success: true, deleted: initialCount !== db.notifications.length });
});

// 14. Email Deliveries & In-Browser HTML Preview
app.get('/api/emails', (req, res) => {
  const { recipient, userId } = req.query;
  let emails = db.sent_emails || [];
  if (recipient) {
    emails = emails.filter(e => e.recipient?.toLowerCase() === String(recipient).toLowerCase());
  }
  const summary = emails.map(e => ({
    id: e.id,
    type: e.type,
    recipient: e.recipient,
    subject: e.subject,
    tournament_id: e.tournament_id,
    tournament_title: e.tournament_title,
    player_ign: e.player_ign,
    timestamp: e.timestamp,
    preview_url: e.preview_url,
    status: e.status,
    local_preview_url: `/api/emails/${e.id}/preview`
  }));
  res.json(summary);
});

app.get('/api/emails/:id/preview', (req, res) => {
  const email = (db.sent_emails || []).find(e => e.id === req.params.id);
  if (!email) {
    return res.status(404).send('<!DOCTYPE html><html><body style="background:#080D14;color:#fff;font-family:sans-serif;padding:40px;text-align:center;"><h2>Email receipt not found</h2><p style="color:#94a3b8;">This email may not have been recorded yet.</p></body></html>');
  }
  res.setHeader('Content-Type', 'text/html');
  res.send(email.html);
});

// 15. Real-Time SMTP Status & Delivery Test
app.get('/api/email/status', async (req, res) => {
  const status = await verifySmtp();
  res.json(status);
});

app.all('/api/email/test', async (req, res) => {
  const to = req.query?.to || req.body?.to;
  try {
    const result = await sendTestEmail(to);
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
      help: 'If using Gmail, ensure 2-Step Verification is active and you generated a 16-character Google App Password from https://myaccount.google.com/apppasswords. Paste it into SMTP_PASS in .env.'
    });
  }
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GearUp Real-Time Backend running on http://0.0.0.0:${PORT}`);
});
