import React from 'react';
import type { Tournament } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Trophy, Users, Calendar, MapPin, KeyRound, CheckCircle2, Flag } from 'lucide-react';

interface TournamentCardProps {
  tournament: Tournament;
  isRegistered?: boolean;
  onClick: () => void;
  onRegisterClick?: (e: React.MouseEvent) => void;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  isRegistered = false,
  onClick,
  onRegisterClick
}) => {
  const isFull = tournament.slots_filled >= tournament.slots_total;
  const slotPercentage = Math.min(100, Math.round((tournament.slots_filled / tournament.slots_total) * 100));
  const hasRoomReleased = tournament.room_credential?.isReleased;

  // Format date nicely
  const formattedDate = new Date(tournament.date).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric'
  });

  return (
    <div
      onClick={onClick}
      className="group relative bg-[#111C2B] rounded-2xl border border-[#1F324B] overflow-hidden hover:border-[#5BD19B]/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex flex-col"
    >
      {/* Banner & Overlay */}
      <div className="h-44 sm:h-48 relative overflow-hidden bg-[#0B131E]">
        <img
          src={tournament.banner_url}
          alt={tournament.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111C2B] via-[#111C2B]/40 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="mint" size="sm">
              {tournament.game}
            </Badge>
            <Badge variant="neutral" size="sm">
              {tournament.format}
            </Badge>
          </div>

          {tournament.status === 'COMPLETED' ? (
            <Badge variant="neutral" size="sm" className="bg-zinc-800 text-zinc-300 border-zinc-600 font-bold flex items-center gap-1">
              <Flag size={11} className="text-amber-400" /> ENDED
            </Badge>
          ) : isRegistered ? (
            <Badge variant="blue" size="sm" className="font-bold">
              <CheckCircle2 size={12} /> REGISTERED
            </Badge>
          ) : isFull ? (
            <Badge variant="danger" size="sm">FULL</Badge>
          ) : hasRoomReleased ? (
            <Badge variant="blue" size="sm" className="animate-pulse">
              <KeyRound size={12} /> ROOM LIVE
            </Badge>
          ) : (
            <Badge variant="mint" size="sm">OPEN</Badge>
          )}
        </div>

        {/* Map pill bottom right */}
        <div className="absolute bottom-2.5 right-3 z-10 flex items-center gap-1 text-[11px] font-semibold text-zinc-300 bg-[#0B131E]/80 backdrop-blur-sm px-2 py-0.5 rounded-md border border-[#1F324B]">
          <MapPin size={11} className="text-[#5BD19B]" />
          <span>{tournament.map}</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Organiser Name */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#5BD19B] tracking-wider uppercase font-display truncate">
              {tournament.organiser_name}
            </span>
            <span className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1">
              <Calendar size={12} /> {formattedDate} • {tournament.time}
            </span>
          </div>

          {/* Tournament Title */}
          <h3 className="text-base sm:text-lg font-black font-display text-white tracking-tight leading-snug uppercase mb-4 line-clamp-1 group-hover:text-[#5BD19B] transition-colors">
            {tournament.title}
          </h3>

          {/* Stats 2x2 Grid */}
          <div className="grid grid-cols-2 gap-2.5 bg-[#0B131E]/70 p-3 rounded-xl border border-[#1F324B]/70 mb-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Entry Fee</p>
              <p className="text-sm font-extrabold text-white">
                {tournament.entry_fee === 0 ? (
                  <span className="text-[#5BD19B]">FREE ENTRY</span>
                ) : (
                  `₹${tournament.entry_fee}`
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center justify-end gap-1">
                <Trophy size={11} className="text-[#5BD19B]" /> Prize Pool
              </p>
              <p className="text-sm font-black text-[#5BD19B] tracking-tight">
                ₹{(Number(tournament.prize_pool) || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Slot Progress Bar or Concluded Status */}
          <div className="mb-4">
            {tournament.status === 'COMPLETED' ? (
              <div className="bg-[#0B131E] rounded-xl p-2.5 border border-[#1F324B] flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider">
                  <Flag size={12} className="text-amber-400" /> Match Concluded
                </span>
                <span className="text-[#5BD19B] font-bold text-[11px]">
                  Standings Published
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Users size={12} /> Slots Filled
                  </span>
                  <span className="font-bold text-white">
                    <span className={isFull ? 'text-red-400' : 'text-[#5BD19B]'}>{tournament.slots_filled}</span>
                    <span className="text-zinc-500"> / {tournament.slots_total}</span>
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#152234] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFull ? 'bg-red-500' : slotPercentage > 75 ? 'bg-amber-400' : 'bg-[#5BD19B]'
                    }`}
                    style={{ width: `${slotPercentage}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div>
          {tournament.status === 'COMPLETED' ? (
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="border-[#1F324B] hover:border-[#5BD19B] text-zinc-300 hover:text-white flex items-center justify-center gap-1.5"
            >
              <Trophy size={14} className="text-[#5BD19B]" /> VIEW STANDINGS
            </Button>
          ) : isRegistered ? (
            hasRoomReleased ? (
              <Button
                variant="blue"
                size="sm"
                fullWidth
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                <KeyRound size={14} /> VIEW ROOM CODE
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                VIEW DETAILS
              </Button>
            )
          ) : (
            <Button
              variant={isFull ? 'outline' : 'primary'}
              size="sm"
              fullWidth
              disabled={isFull}
              onClick={(e) => {
                if (onRegisterClick) {
                  e.stopPropagation();
                  onRegisterClick(e);
                } else {
                  onClick();
                }
              }}
            >
              {isFull ? 'SLOTS FULL' : 'REGISTER NOW'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
