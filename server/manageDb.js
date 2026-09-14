import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'data', 'gearup.sqlite');
const DEFAULT_EXPORT_PATH = path.join(__dirname, 'data', 'db.json');

function getDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database file not found at ${DB_PATH}. Start the server first to generate it.`);
  }
  return new DatabaseSync(DB_PATH);
}

function loadState(db) {
  const row = db.prepare('SELECT payload FROM application_state WHERE id = 1').get();
  if (!row) throw new Error('No state record found in database.');
  return JSON.parse(row.payload);
}

function saveState(db, data) {
  db.prepare('UPDATE application_state SET payload = ?, updated_at = ? WHERE id = 1')
    .run(JSON.stringify(data, null, 2), new Date().toISOString());
}

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

try {
  const db = getDatabase();
  const state = loadState(db);

  switch (command) {
    case 'export': {
      const targetFile = arg1 || DEFAULT_EXPORT_PATH;
      fs.writeFileSync(targetFile, JSON.stringify(state, null, 2), 'utf-8');
      console.log(`✅ Database successfully exported to:\n   ${targetFile}`);
      console.log('\nYou can now edit this JSON file directly in VS Code/Notepad, then run:');
      console.log(`   node server/manageDb.js import "${targetFile}"`);
      break;
    }

    case 'import': {
      const sourceFile = arg1 || DEFAULT_EXPORT_PATH;
      if (!fs.existsSync(sourceFile)) {
        throw new Error(`Source JSON file not found at ${sourceFile}`);
      }
      const raw = fs.readFileSync(sourceFile, 'utf-8');
      const parsed = JSON.parse(raw);
      saveState(db, parsed);
      console.log(`✅ Database successfully updated from:\n   ${sourceFile}`);
      console.log(`   - Tournaments: ${parsed.tournaments?.length || 0}`);
      console.log(`   - Users: ${parsed.users?.length || 0}`);
      console.log(`   - Registrations: ${parsed.registrations?.length || 0}`);
      break;
    }

    case 'set-password': {
      if (!arg1 || !arg2) {
        console.log('Usage: node server/manageDb.js set-password <usernameOrEmail> <newPassword>');
        process.exit(1);
      }
      const user = state.users.find(u =>
        u.username.toLowerCase() === arg1.toLowerCase() ||
        u.email.toLowerCase() === arg1.toLowerCase()
      );
      if (!user) {
        console.error(`❌ User "${arg1}" not found in database.`);
        process.exit(1);
      }
      user.password = arg2;
      saveState(db, state);
      console.log(`✅ Password for "${user.username}" (${user.email}) updated to: "${arg2}"`);
      break;
    }

    case 'set-wallet': {
      if (!arg1 || !arg2) {
        console.log('Usage: node server/manageDb.js set-wallet <usernameOrEmail> <amount>');
        process.exit(1);
      }
      const user = state.users.find(u =>
        u.username.toLowerCase() === arg1.toLowerCase() ||
        u.email.toLowerCase() === arg1.toLowerCase()
      );
      if (!user) {
        console.error(`❌ User "${arg1}" not found in database.`);
        process.exit(1);
      }
      const amount = Number(arg2);
      user.wallet_balance = amount;
      if (!state.wallets) state.wallets = {};
      if (!state.wallets[user.id]) state.wallets[user.id] = { balance: amount, transactions: [] };
      state.wallets[user.id].balance = amount;
      saveState(db, state);
      console.log(`✅ Wallet balance for "${user.username}" updated to: ₹${amount}`);
      break;
    }

    case 'list-users':
    case 'users': {
      console.log('\n--- REGISTERED USERS IN DATABASE ---');
      state.users.forEach(u => {
        console.log(`• [${u.role}] ${u.username} (${u.email}) | Password: "${u.password || 'none'}" | Wallet: ₹${state.wallets?.[u.id]?.balance ?? u.wallet_balance ?? 0}`);
      });
      break;
    }

    case 'list-tournaments':
    case 'tournaments': {
      console.log('\n--- TOURNAMENTS IN DATABASE ---');
      state.tournaments.forEach(t => {
        console.log(`• [${t.id}] ${t.title} | Game: ${t.game} | Status: ${t.status} | Slots: ${t.slots_filled}/${t.slots_total} | Room: ${t.room_credential?.roomId || 'None'}`);
      });
      break;
    }

    case 'clean':
    case 'clear-users': {
      const admin = state.users.find(u => u.is_admin || u.role === 'ADMIN') || {
        id: 'u-admin-1',
        username: 'Esports Admin',
        email: 'gearupesportsofficial@gmail.com',
        password: 'Saketh?999',
        role: 'ADMIN',
        is_admin: true,
        wallet_balance: 0
      };
      state.users = [admin];
      state.wallets = {
        [admin.id]: { balance: 0, transactions: [] }
      };
      state.registrations = [];
      state.notifications = [];
      state.chat_messages = [];
      state.sent_emails = [];
      if (Array.isArray(state.tournaments)) {
        state.tournaments.forEach(t => { t.slots_filled = 0; });
      }
      saveState(db, state);
      fs.writeFileSync(DEFAULT_EXPORT_PATH, JSON.stringify(state, null, 2), 'utf-8');
      console.log('✅ Database reset to clean state (Admin only, 0 notifications, 0 registrations, 0 emails).');
      break;
    }

    default: {
      console.log(`
=====================================================
  GEARUP DATABASE MANAGEMENT CLI
=====================================================

Usage:
  node server/manageDb.js export [file.json]
    Export entire SQLite database to a readable JSON file.

  node server/manageDb.js import [file.json]
    Import edited JSON file directly back into SQLite.

  node server/manageDb.js clean
    Reset database to clean state (Admin only, 0 registrations, 0 notifications).

  node server/manageDb.js users
    List all users with their emails, roles, and passwords.

  node server/manageDb.js tournaments
    List all tournaments and room credentials.

  node server/manageDb.js set-password <email/username> <newPassword>
    Quickly change any user's password.

  node server/manageDb.js set-wallet <email/username> <amount>
    Change any user's wallet balance.
=====================================================
      `);
    }
  }
} catch (err) {
  console.error('Database CLI error:', err.message);
}

