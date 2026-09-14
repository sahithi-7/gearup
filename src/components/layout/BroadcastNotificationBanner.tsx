import React, { useEffect } from 'react';
import type { BroadcastAlert } from '../../types';
import { KeyRound, X, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';

interface BroadcastNotificationBannerProps {
  alert: BroadcastAlert | null;
  onClose: () => void;
  onNavigateToTournament: (tournamentId: string) => void;
}

export const BroadcastNotificationBanner: React.FC<BroadcastNotificationBannerProps> = ({
  alert,
  onClose,
  onNavigateToTournament
}) => {
  // Auto-dismiss after 12 seconds
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      onClose();
    }, 12000);
    return () => clearTimeout(timer);
  }, [alert, onClose]);

  if (!alert) return null;

  return (
    <div className="fixed top-20 right-4 left-4 sm:left-auto sm:max-w-md z-50 animate-bounce-short">
      <div className="bg-gradient-to-r from-[#0F1A28] via-[#15273F] to-[#0F1A28] border-2 border-[#5BD19B] rounded-2xl p-4 shadow-[0_10px_35px_rgba(91,209,155,0.3)] backdrop-blur-xl relative overflow-hidden">
        {/* Glowing pulse aura */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#5BD19B]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5BD19B] text-[#0B131E] flex items-center justify-center font-bold flex-shrink-0 shadow-lg shadow-[#5BD19B]/20 animate-pulse">
              <KeyRound size={20} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#5BD19B]/20 text-[#5BD19B] border border-[#5BD19B]/30 tracking-wider">
                  ROOM UNLOCKED
                </span>
                {alert.game && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#4D8EF7]/20 text-[#4D8EF7] border border-[#4D8EF7]/30 tracking-wider">
                    {alert.game}
                  </span>
                )}
                <span className="text-[10px] text-zinc-400 font-mono">Just Now</span>
              </div>

              <h4 className="text-sm font-black font-display uppercase text-white tracking-tight flex items-center gap-1.5">
                Credentials Sent to Your Match! <Sparkles size={14} className="text-[#5BD19B]" />
              </h4>

              <p className="text-xs text-zinc-300 font-medium line-clamp-1">
                {alert.tournament_title}
              </p>

              <div className="pt-2 flex items-center gap-2">
                <div className="bg-[#0B131E]/90 px-2.5 py-1 rounded-lg border border-[#1F324B] text-[11px] font-mono">
                  <span className="text-zinc-400">ID: </span>
                  <span className="text-white font-bold">{alert.roomId}</span>
                </div>
                <div className="bg-[#0B131E]/90 px-2.5 py-1 rounded-lg border border-[#1F324B] text-[11px] font-mono">
                  <span className="text-zinc-400">Pass: </span>
                  <span className="text-[#5BD19B] font-bold">{alert.roomPassword}</span>
                </div>
              </div>

              {alert.instructions && (
                <p className="text-[10px] text-zinc-400 mt-1 italic line-clamp-1">
                  Slot note: {alert.instructions}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#1F324B] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 pt-3 border-t border-[#1F324B] flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">Enter custom match lobby now</span>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              onNavigateToTournament(alert.tournament_id);
              onClose();
            }}
            className="text-xs py-1 px-3"
          >
            <span>View Room</span>
            <ExternalLink size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
};
