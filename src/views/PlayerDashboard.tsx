import React from 'react';
import type { User, Registration, Tournament } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { RoomCodeCard } from '../components/tournaments/RoomCodeCard';
import {
  User as UserIcon,
  Wallet,
  Swords,
  Calendar,
  Phone,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface PlayerDashboardProps {
  user: User | null;
  registrations: Registration[];
  tournaments: Tournament[];
  navigate: (path: string) => void;
  onLogin: () => void;
  onOpenAddCash?: () => void;
}

export const PlayerDashboard: React.FC<PlayerDashboardProps> = ({
  user,
  registrations,
  tournaments,
  navigate,
  onLogin,
  onOpenAddCash
}) => {
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#5BD19B]/20 text-[#5BD19B] flex items-center justify-center mx-auto">
          <UserIcon size={32} />
        </div>
        <h2 className="text-2xl font-black font-display uppercase text-white">Player Login Required</h2>
        <p className="text-xs sm:text-sm text-zinc-400">
          Sign in to view your registered tournaments, live Room IDs, and payout wallet.
        </p>
        <Button variant="primary" fullWidth onClick={onLogin}>
          Login as Demo Player
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Player Header Card */}
      <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#5BD19B] text-[#0B131E] font-black font-display text-xl sm:text-2xl flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(91,209,155,0.3)]">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black font-display uppercase text-white">
                  {user.username}
                </h1>
                <Badge variant="mint" size="sm">PLAYER</Badge>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                <span>IGN: <strong className="text-white">{user.in_game_name || user.username}</strong></span>
                {user.phone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Phone size={11} /> {user.phone}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Wallet Balance Widget */}
          <div className="bg-[#0B131E] p-3.5 rounded-xl border border-[#1F324B] flex items-center justify-between sm:justify-start gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                <Wallet size={12} className="text-[#5BD19B]" /> GearUp Balance
              </span>
              <p className="text-xl sm:text-2xl font-black font-display text-[#5BD19B]">
                ₹{user.wallet_balance}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs py-1.5 px-3"
              onClick={onOpenAddCash}
            >
              + Add Cash
            </Button>
          </div>
        </div>
      </div>

      {/* Registrations & Match Rooms Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-display uppercase text-white flex items-center gap-2">
              <Swords size={20} className="text-[#5BD19B]" /> My Match Schedule
            </h2>
            <p className="text-xs text-zinc-400">
              Access your match lobby credentials and registration status.
            </p>
          </div>
          <span className="text-xs font-bold font-display uppercase text-[#5BD19B]">
            {registrations.length} Active {registrations.length === 1 ? 'Entry' : 'Entries'}
          </span>
        </div>

        {registrations.length === 0 ? (
          <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-8 sm:p-12 text-center max-w-md mx-auto space-y-3">
            <Swords size={36} className="mx-auto text-zinc-500" />
            <h3 className="text-lg font-bold font-display uppercase text-white">No Match Entries Yet</h3>
            <p className="text-xs text-zinc-400">
              You haven't registered for any tournaments. Browse open tournaments to compete for cash prizes!
            </p>
            <Button variant="primary" size="sm" onClick={() => navigate('/tournaments')}>
              Find Tournaments
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {registrations.map(reg => {
              const tournament = tournaments.find(t => t.id === reg.tournament_id);
              if (!tournament) return null;

              return (
                <div
                  key={reg.id}
                  className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-5 sm:p-6 shadow-xl space-y-4"
                >
                  {/* Match Info Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1F324B]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="mint" size="sm">{tournament.game}</Badge>
                        <Badge variant="neutral" size="sm">{tournament.format}</Badge>
                        <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                          <Calendar size={12} /> {tournament.date} • {tournament.time} IST
                        </span>
                      </div>
                      <h3
                        onClick={() => navigate(`/tournament/${tournament.id}`)}
                        className="text-base sm:text-lg font-black font-display uppercase text-white hover:text-[#5BD19B] transition-colors cursor-pointer"
                      >
                        {tournament.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Registered as: <strong className="text-white">{reg.player_ign}</strong> (UID: {reg.player_uid})
                        {reg.team_name && <span> • Team: <strong className="text-white">{reg.team_name}</strong></span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Badge variant="mint" size="md">
                        <Sparkles size={12} /> CONFIRMED
                      </Badge>
                      <button
                        onClick={() => navigate(`/tournament/${tournament.id}`)}
                        className="p-1.5 text-zinc-400 hover:text-white"
                        title="View Tournament Page"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Integrated Room Code Card */}
                  <RoomCodeCard
                    roomCredential={tournament.room_credential}
                    isRegistered={true}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
