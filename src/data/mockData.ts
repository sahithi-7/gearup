import type { Tournament } from '../types';

export const INITIAL_TOURNAMENTS: Tournament[] = ([
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
    rules: `1. Standard BGMI Esports TPP Squad scoring system apply (10 pts #1, 1 pt per kill).
2. Emulators and iPad views are strictly prohibited. Mobile devices only.
3. Hackers/cheaters will face a lifetime ban and forfeit prizes.
4. Room credentials will unlock in this portal 15 minutes before the match start time.`,
    room_credential: {
      roomId: 'BGMI-882914',
      roomPassword: 'GEARUP#SUNDAY',
      instructions: 'Enter Room within 10 minutes. Slot assigned upon entry.',
      isReleased: true,
      releasedAt: '2026-09-13T19:45:00Z'
    },
    prize_breakdown: [
      { rank: '1st Place', prize: 5000 },
      { rank: '2nd Place', prize: 3000 },
      { rank: '3rd Place', prize: 2000 }
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
    rules: `1. Squad Rush mode. Gun property active.
2. Character skills are allowed.
3. Room ID will be broadcasted 15 mins prior. Ensure all squad members are in your lobby.
4. Top 3 teams win cash prizes transferred via UPI directly after match verification.`,
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
    ]
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
    rules: `1. Mumbai Server, Tournament Mode enabled.
2. Single-elimination best-of-1 until finals (BO3).
3. Coaches are permitted in the designated coach slot.
4. Both teams must upload end-game screenshots on result dispute.`,
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
    ]
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
    rules: `1. Duo FPP Battle Royale.
2. Custom loadouts allowed from Airdrops only.
3. No tank usage permitted. Violation leads to immediate match DQ.`,
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
    ]
  }
] as unknown as Tournament[]).filter(
  (tournament) => tournament.game === 'BGMI' || tournament.game === 'Free Fire MAX'
);
