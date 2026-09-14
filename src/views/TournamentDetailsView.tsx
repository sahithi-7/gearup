import React, { useState } from 'react';
import type { Tournament, User, Registration } from '../types';
import { tournamentService } from '../services/tournamentService';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { RoomCodeCard } from '../components/tournaments/RoomCodeCard';
import { LobbyChat } from '../components/tournaments/LobbyChat';
import { LeaderboardTable } from '../components/tournaments/LeaderboardTable';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Trophy,
  Users,
  ShieldCheck,
  Swords,
  KeyRound,
  CheckCircle2,
  MessageSquare,
  Radio,
  Lock,
  Send,
  X,
  Flag
} from 'lucide-react';

interface TournamentDetailsViewProps {
  tournament: Tournament;
  user: User | null;
  navigate: (path: string) => void;
  onOpenRegistration: (tournament: Tournament) => void;
  isRegistered: boolean;
}

export const TournamentDetailsView: React.FC<TournamentDetailsViewProps> = ({
  tournament,
  user,
  navigate,
  onOpenRegistration,
  isRegistered
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'room' | 'chat' | 'standings' | 'rules'>(
    tournament.status === 'COMPLETED' ? 'standings' : 'overview'
  );
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomPassInput, setRoomPassInput] = useState('');
  const [instructionsInput, setInstructionsInput] = useState('');
  const [registeredPlayers, setRegisteredPlayers] = useState<Registration[]>([]);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [roomSuccessMessage, setRoomSuccessMessage] = useState('');

  const isAdminOrOrganiser = Boolean(user?.is_admin || user?.role === 'ORGANISER');
  const isFull = tournament.slots_filled >= tournament.slots_total;

  const formattedDate = new Date(tournament.date).toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="pb-28 md:pb-12">
      {/* Top Banner Area */}
      <div className="relative h-60 sm:h-80 w-full overflow-hidden bg-[#0B131E]">
        <img
          src={tournament.banner_url}
          alt={tournament.title}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B131E] via-[#0B131E]/60 to-transparent" />

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={() => navigate('/tournaments')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B131E]/80 backdrop-blur-md border border-[#1F324B] text-zinc-300 hover:text-white text-xs font-bold uppercase transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Tournaments</span>
          </button>
        </div>

        {/* Banner Badges */}
        <div className="absolute bottom-6 left-4 right-4 max-w-5xl mx-auto z-20 flex flex-wrap gap-2 items-center">
          <Badge variant="mint" size="md">{tournament.game}</Badge>
          <Badge variant="blue" size="md">{tournament.format}</Badge>
          <Badge variant="neutral" size="md">{tournament.map}</Badge>
          {tournament.status === 'COMPLETED' ? (
            <span className="text-xs font-black uppercase bg-zinc-800 text-zinc-200 border border-zinc-600 px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5">
              <Flag size={13} className="text-amber-400" /> Match Concluded
            </span>
          ) : isRegistered ? (
            <Badge variant="mint" size="md">
              <CheckCircle2 size={13} /> You are Registered
            </Badge>
          ) : null}
          {tournament.status !== 'COMPLETED' && tournament.room_credential?.isReleased && (
            <span className="text-xs font-black uppercase bg-[#5BD19B] text-[#0B131E] px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
              <KeyRound size={13} /> Room Credentials Live
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 relative z-20 space-y-6">
        {/* Header Information */}
        <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-5 sm:p-7 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-[#1F324B]">
            <div>
              <p className="text-xs font-bold text-[#5BD19B] uppercase tracking-wider font-display mb-1 flex items-center gap-1.5">
                Organised by <span className="text-white font-bold">{tournament.organiser_name}</span>
                <ShieldCheck size={14} className="text-[#5BD19B]" />
              </p>
              <h1 className="text-2xl sm:text-4xl font-black font-display text-white uppercase tracking-tight leading-tight">
                {tournament.title}
              </h1>
            </div>

            {/* Desktop Action Box */}
            <div className="hidden md:flex flex-col items-end gap-2 flex-shrink-0">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Prize Pool</span>
                <p className="text-3xl font-black font-display text-[#5BD19B]">
                  ₹{(Number(tournament.prize_pool) || 0).toLocaleString('en-IN')}
                </p>
              </div>

              {tournament.status === 'COMPLETED' ? (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setActiveTab('standings')}
                  className="px-6 border-[#5BD19B]/40 text-[#5BD19B] hover:bg-[#5BD19B]/10 flex items-center gap-2"
                >
                  <Trophy size={16} /> View Final Results
                </Button>
              ) : isRegistered ? (
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setActiveTab('chat')}
                  >
                    <MessageSquare size={16} /> Lobby Chat
                  </Button>
                  <Button
                    variant="blue"
                    size="md"
                    onClick={() => setActiveTab('room')}
                  >
                    <KeyRound size={16} /> Room Code
                  </Button>
                </div>
              ) : (
                <Button
                  variant={isFull ? 'outline' : 'primary'}
                  size="md"
                  disabled={isFull}
                  onClick={() => onOpenRegistration(tournament)}
                  className="px-8"
                >
                  {isFull ? 'Tournament Full' : tournament.entry_fee === 0 ? 'Register Free' : `Register (₹${tournament.entry_fee})`}
                </Button>
              )}
            </div>
          </div>

          {/* Key Metrics 4-Item Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
            <div className="bg-[#0B131E] p-3 rounded-xl border border-[#1F324B]">
              <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                <Trophy size={12} className="text-[#5BD19B]" /> Prize Pool
              </span>
              <p className="text-base sm:text-lg font-black font-display text-[#5BD19B] mt-0.5">
                ₹{(Number(tournament.prize_pool) || 0).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="bg-[#0B131E] p-3 rounded-xl border border-[#1F324B]">
              <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                <Calendar size={12} className="text-[#4D8EF7]" /> Match Date
              </span>
              <p className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate">
                {formattedDate}
              </p>
            </div>

            <div className="bg-[#0B131E] p-3 rounded-xl border border-[#1F324B]">
              <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                <Clock size={12} className="text-[#5BD19B]" /> Match Time
              </span>
              <p className="text-base sm:text-lg font-black font-display text-white mt-0.5">
                {tournament.time} IST
              </p>
            </div>

            <div className="bg-[#0B131E] p-3 rounded-xl border border-[#1F324B]">
              <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                <Users size={12} className="text-[#4D8EF7]" /> Slots Booked
              </span>
              <p className="text-base sm:text-lg font-black font-display text-white mt-0.5">
                <span className={isFull ? 'text-red-400' : 'text-[#5BD19B]'}>{tournament.slots_filled}</span>
                <span className="text-zinc-500 text-xs"> / {tournament.slots_total}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Match Concluded Callout Banner */}
        {tournament.status === 'COMPLETED' && (
          <div className="bg-[#111C2B] rounded-2xl border border-amber-500/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0">
                <Flag size={20} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black font-display uppercase text-white">
                  Tournament Concluded by Admin
                </h3>
                <p className="text-xs text-zinc-400">
                  This match has officially concluded. Registration is closed and final standings have been published.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('standings')}
              className="text-xs text-[#5BD19B] border-[#5BD19B]/40 hover:bg-[#5BD19B]/10 self-start sm:self-auto flex items-center gap-1.5"
            >
              <Trophy size={14} /> View Final Standings
            </Button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1F324B] gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-colors border-b-2 flex-shrink-0 ${
              activeTab === 'overview'
                ? 'text-[#5BD19B] border-[#5BD19B]'
                : 'text-zinc-400 border-transparent hover:text-white'
            }`}
          >
            Overview & Prizes
          </button>
          <button
            onClick={() => setActiveTab('room')}
            className={`pb-3 text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 flex-shrink-0 ${
              activeTab === 'room'
                ? 'text-[#4D8EF7] border-[#4D8EF7]'
                : 'text-zinc-400 border-transparent hover:text-white'
            }`}
          >
            <KeyRound size={15} />
            <span>Room ID & Pass</span>
            {tournament.room_credential?.isReleased && (
              <span className="w-2 h-2 rounded-full bg-[#5BD19B] animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`pb-3 text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 flex-shrink-0 ${
              activeTab === 'chat'
                ? 'text-[#5BD19B] border-[#5BD19B]'
                : 'text-zinc-400 border-transparent hover:text-white'
            }`}
          >
            <MessageSquare size={15} />
            <span>Lobby Chat</span>
            <span className="w-2 h-2 rounded-full bg-[#5BD19B]" />
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`pb-3 text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 flex-shrink-0 ${
              activeTab === 'standings'
                ? 'text-[#4D8EF7] border-[#4D8EF7]'
                : 'text-zinc-400 border-transparent hover:text-white'
            }`}
          >
            <Trophy size={15} />
            <span>Live Standings</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-3 text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 flex-shrink-0 ${
              activeTab === 'rules'
                ? 'text-[#5BD19B] border-[#5BD19B]'
                : 'text-zinc-400 border-transparent hover:text-white'
            }`}
          >
            <Swords size={15} />
            <span>Rules</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Prize Breakdown Table */}
            <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-5">
              <h3 className="text-base font-black font-display uppercase text-white mb-4 flex items-center gap-2">
                <Trophy size={18} className="text-[#5BD19B]" /> Prize Distribution
              </h3>
              <div className="divide-y divide-[#1F324B]">
                {(tournament.prize_breakdown || []).map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center font-display font-black text-xs ${
                        idx === 0
                          ? 'bg-amber-400 text-black'
                          : idx === 1
                          ? 'bg-slate-300 text-black'
                          : 'bg-amber-700 text-white'
                      }`}>
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-white">{item.rank}</span>
                    </div>
                    <span className="font-display font-black text-base text-[#5BD19B]">
                      ₹{(Number(item.prize) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Match Information */}
            <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-5">
              <h3 className="text-base font-black font-display uppercase text-white mb-4">
                Tournament Structure
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-zinc-300">
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-[#1F324B]/50">
                    <span className="text-zinc-400">Game Mode:</span>
                    <span className="font-bold text-white">{tournament.format} ({tournament.map})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1F324B]/50">
                    <span className="text-zinc-400">Server Region:</span>
                    <span className="font-bold text-white">India / Mumbai</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-[#1F324B]/50">
                    <span className="text-zinc-400">Payout Method:</span>
                    <span className="font-bold text-[#5BD19B]">Instant UPI (GPay / PhonePe)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1F324B]/50">
                    <span className="text-zinc-400">Anti-Cheat:</span>
                    <span className="font-bold text-[#4D8EF7]">Strict Device Verification</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'room' && (
          <div className="space-y-4">
            {isAdminOrOrganiser && (
              <div className="bg-[#111C2B] rounded-2xl border border-[#4D8EF7]/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#4D8EF7]/20 text-[#4D8EF7] flex items-center justify-center font-bold flex-shrink-0">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#4D8EF7] tracking-wider font-display">
                      {user?.is_admin ? 'Admin Match Control' : 'Organiser Match Control'}
                    </span>
                    <h4 className="text-sm font-bold text-white uppercase">
                      {tournament.room_credential?.isReleased ? 'Room Credentials Released' : 'Room Credentials Not Yet Broadcasted'}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      {tournament.room_credential?.isReleased
                        ? `Room ID: ${tournament.room_credential.roomId} • Pass: ${tournament.room_credential.roomPassword}`
                        : 'Configure and dispatch credentials directly to registered players.'}
                    </p>
                  </div>
                </div>

                <Button
                  variant="blue"
                  size="sm"
                  onClick={() => {
                    setRoomIdInput(tournament.room_credential?.roomId || '');
                    setRoomPassInput(tournament.room_credential?.roomPassword || '');
                    setInstructionsInput(tournament.room_credential?.instructions || '');
                    setRoomSuccessMessage('');
                    setIsRoomModalOpen(true);
                    tournamentService.fetchRegistrations().then(allRegs => {
                      setRegisteredPlayers(allRegs.filter(r => r.tournament_id === tournament.id));
                    });
                  }}
                  className="text-xs self-start sm:self-auto flex-shrink-0"
                >
                  <Radio size={14} />
                  <span>{tournament.room_credential?.isReleased ? 'Update Room ID & Pass' : 'Add & Broadcast Room'}</span>
                </Button>
              </div>
            )}

            <RoomCodeCard
              roomCredential={tournament.room_credential}
              isRegistered={isRegistered || isAdminOrOrganiser}
              onRegisterClick={() => onOpenRegistration(tournament)}
            />
          </div>
        )}

        {activeTab === 'chat' && (
          <LobbyChat
            tournamentId={tournament.id}
            user={user}
            onLoginPrompt={() => onOpenRegistration(tournament)}
          />
        )}

        {activeTab === 'standings' && (
          <LeaderboardTable
            tournamentId={tournament.id}
            initialStandings={tournament.standings}
            prizePool={tournament.prize_pool}
          />
        )}

        {activeTab === 'rules' && (
          <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-black font-display uppercase text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#5BD19B]" /> Official Tournament Guidelines
            </h3>
            <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line bg-[#0B131E] p-4 rounded-xl border border-[#1F324B]">
              {tournament.rules}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="md:hidden fixed bottom-14 left-0 right-0 z-30 bg-[#0B131E]/95 backdrop-blur-lg border-t border-[#1F324B] p-3 shadow-2xl">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400">Entry Fee</span>
            <p className="text-lg font-black font-display text-white">
              {tournament.entry_fee === 0 ? (
                <span className="text-[#5BD19B]">FREE ENTRY</span>
              ) : (
                `₹${tournament.entry_fee}`
              )}
            </p>
          </div>

          <div className="flex-1 max-w-[200px]">
            {isRegistered ? (
              <Button
                variant="blue"
                size="sm"
                fullWidth
                onClick={() => setActiveTab('room')}
              >
                <KeyRound size={14} /> Room Code
              </Button>
            ) : (
              <Button
                variant={isFull ? 'outline' : 'primary'}
                size="sm"
                fullWidth
                disabled={isFull}
                onClick={() => onOpenRegistration(tournament)}
              >
                {isFull ? 'FULL' : 'REGISTER NOW'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Admin / Organiser Room Edit Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-lg bg-[#0F1A28] border-t sm:border border-[#1F324B] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F324B] mb-4">
              <div>
                <span className="text-[10px] font-bold text-[#4D8EF7] tracking-wider uppercase font-display flex items-center gap-1.5">
                  <ShieldCheck size={12} /> {user?.is_admin ? 'Admin' : 'Organiser'} Match Control
                </span>
                <h3 className="text-lg font-black font-display uppercase text-white">
                  Add & Send Room ID & Password
                </h3>
              </div>
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#152234]"
              >
                <X size={18} />
              </button>
            </div>

            {roomSuccessMessage ? (
              <div className="py-4 text-center space-y-3">
                <CheckCircle2 size={40} className="text-[#5BD19B] mx-auto animate-bounce" />
                <h4 className="text-lg font-black font-display uppercase text-white">
                  {roomSuccessMessage}
                </h4>
                <Button
                  variant="primary"
                  fullWidth
                  size="md"
                  onClick={() => setIsRoomModalOpen(false)}
                >
                  Done
                </Button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSavingRoom(true);
                  const res = await tournamentService.updateRoomCredentials(
                    tournament.id,
                    {
                      roomId: roomIdInput.trim(),
                      roomPassword: roomPassInput.trim(),
                      instructions: instructionsInput.trim(),
                      isReleased: true
                    },
                    user?.id
                  );
                  setIsSavingRoom(false);
                  if (res.success) {
                    setRoomSuccessMessage(`Room credentials dispatched to ${res.dispatched_count ?? registeredPlayers.length} registered player(s)!`);
                  }
                }}
                className="space-y-3.5"
              >
                <div className="bg-[#0B131E] p-3 rounded-xl border border-[#1F324B] text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Target Tournament</span>
                    <p className="font-bold text-white font-display text-sm truncate">
                      {tournament.title}
                    </p>
                  </div>
                  <Badge variant="blue" size="sm">{tournament.game}</Badge>
                </div>

                <div className="bg-[#0B131E]/70 p-3 rounded-xl border border-[#1F324B] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                      <Users size={13} className="text-[#5BD19B]" />
                      Registered Players ({registeredPlayers.length})
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#5BD19B]">
                      {registeredPlayers.length > 0 ? 'Will receive credentials' : 'No registered users yet'}
                    </span>
                  </div>

                  {registeredPlayers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {registeredPlayers.map((p, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-[#152234] border border-[#1F324B] text-[11px] text-white font-medium flex items-center gap-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5BD19B]" />
                          {p.player_ign} {p.team_name ? `(${p.team_name})` : ''}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-400">
                      When players register for this {tournament.game} tournament, credentials will be sent to them.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">
                      Room / Lobby ID <span className="text-red-400">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={roomIdInput}
                      onChange={(e) => setRoomIdInput(e.target.value)}
                      placeholder="e.g. 882914 or CUSTOM-ROOM-4"
                      className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#4D8EF7] font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">
                      Room Password <span className="text-red-400">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={roomPassInput}
                      onChange={(e) => setRoomPassInput(e.target.value)}
                      placeholder="e.g. GEARUP123"
                      className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-[#5BD19B] focus:outline-none focus:border-[#4D8EF7] font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">
                    Slot Instructions / Match Notes
                  </label>
                  <input
                    type="text"
                    value={instructionsInput}
                    onChange={(e) => setInstructionsInput(e.target.value)}
                    placeholder="e.g. Join your allocated squad slot within 10 mins"
                    className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#4D8EF7]"
                  />
                </div>

                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    disabled={isSavingRoom}
                    onClick={async (e) => {
                      e.preventDefault();
                      setIsSavingRoom(true);
                      const res = await tournamentService.updateRoomCredentials(
                        tournament.id,
                        {
                          roomId: roomIdInput.trim(),
                          roomPassword: roomPassInput.trim(),
                          instructions: instructionsInput.trim(),
                          isReleased: false
                        },
                        user?.id
                      );
                      setIsSavingRoom(false);
                      if (res.success) {
                        setRoomSuccessMessage('Room credentials saved as draft (unreleased).');
                      }
                    }}
                    className="text-xs"
                  >
                    <Lock size={13} />
                    <span>Save Draft</span>
                  </Button>

                  <Button
                    type="submit"
                    variant="blue"
                    size="md"
                    disabled={isSavingRoom}
                    className="text-xs"
                  >
                    {isSavingRoom ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Send to {registeredPlayers.length} Registered</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
