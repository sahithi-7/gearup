import React, { useState } from 'react';
import type { RoomCredential } from '../../types';
import { Lock, Unlock, Copy, Check, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';

interface RoomCodeCardProps {
  roomCredential?: RoomCredential;
  isRegistered: boolean;
  onRegisterClick?: () => void;
}

export const RoomCodeCard: React.FC<RoomCodeCardProps> = ({
  roomCredential,
  isRegistered,
  onRegisterClick
}) => {
  const [copiedField, setCopiedField] = useState<'id' | 'pass' | null>(null);

  const handleCopy = (text: string, field: 'id' | 'pass') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // State 1: User is not registered
  if (!isRegistered) {
    return (
      <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-5 text-center relative overflow-hidden">
        <div className="w-12 h-12 rounded-full bg-[#152234] border border-[#1F324B] flex items-center justify-center mx-auto mb-3 text-zinc-400">
          <Lock size={20} />
        </div>
        <h4 className="text-base font-bold font-display uppercase text-white mb-1">
          Custom Room Credentials Protected
        </h4>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
          Match Room ID and Password are encrypted and only accessible to confirmed participants.
        </p>
        {onRegisterClick && (
          <Button size="sm" variant="primary" onClick={onRegisterClick}>
            Register to Unlock Credentials
          </Button>
        )}
      </div>
    );
  }

  // State 2: Registered, but Organiser has not yet published credentials
  if (!roomCredential || !roomCredential.isReleased) {
    return (
      <div className="bg-[#111C2B] rounded-2xl border border-amber-500/30 p-5 relative overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400">
            <Lock size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-bold font-display uppercase text-white">
                Room ID Pending Broadcast
              </h4>
              <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                Scheduled
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
              The tournament organiser will release the Room ID & Password here <strong>15 minutes before the match start time</strong>.
              You will also receive an automated SMS alert.
            </p>
            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 bg-[#0B131E] px-3 py-2 rounded-lg border border-[#1F324B]">
              <AlertCircle size={13} className="text-amber-400" />
              <span>Keep this page open or check your registered phone/email before start.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State 3: UNLOCKED! Organiser has released Room ID & Password!
  return (
    <div className="bg-gradient-to-br from-[#111C2B] via-[#111C2B] to-[#15273F] rounded-2xl border-2 border-[#4D8EF7]/60 p-5 relative overflow-hidden shadow-[0_0_25px_rgba(77,142,247,0.2)]">
      {/* Glow pulse */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#4D8EF7]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1F324B]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#4D8EF7]/20 text-[#4D8EF7] flex items-center justify-center">
            <Unlock size={16} />
          </div>
          <div>
            <h4 className="text-sm font-black font-display uppercase text-white flex items-center gap-1.5">
              Room Credentials Unlocked <Sparkles size={14} className="text-[#5BD19B]" />
            </h4>
            <p className="text-[10px] text-[#5BD19B] font-semibold">Join match lobby now</p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#5BD19B]/20 text-[#5BD19B] px-2.5 py-1 rounded-full border border-[#5BD19B]/30 animate-pulse">
          LIVE IN LOBBY
        </span>
      </div>

      {/* Credentials Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Room ID */}
        <div className="bg-[#0B131E] p-3 rounded-xl border border-[#1F324B] flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Lobby / Room ID</p>
            <p className="text-base sm:text-lg font-black font-display text-white tracking-widest mt-0.5">
              {roomCredential.roomId}
            </p>
          </div>
          <button
            onClick={() => handleCopy(roomCredential.roomId, 'id')}
            className="p-2 rounded-lg bg-[#152234] hover:bg-[#1c2e47] text-zinc-300 hover:text-white transition-colors"
            title="Copy Room ID"
          >
            {copiedField === 'id' ? <Check size={16} className="text-[#5BD19B]" /> : <Copy size={16} />}
          </button>
        </div>

        {/* Password */}
        <div className="bg-[#0B131E] p-3 rounded-xl border border-[#1F324B] flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Room Password</p>
            <p className="text-base sm:text-lg font-black font-display text-[#5BD19B] tracking-widest mt-0.5">
              {roomCredential.roomPassword}
            </p>
          </div>
          <button
            onClick={() => handleCopy(roomCredential.roomPassword, 'pass')}
            className="p-2 rounded-lg bg-[#152234] hover:bg-[#1c2e47] text-zinc-300 hover:text-white transition-colors"
            title="Copy Password"
          >
            {copiedField === 'pass' ? <Check size={16} className="text-[#5BD19B]" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Instructions */}
      {roomCredential.instructions && (
        <div className="text-xs text-zinc-300 bg-[#0B131E]/60 p-3 rounded-xl border border-[#1F324B] leading-relaxed">
          <strong className="text-white block mb-1 font-display uppercase tracking-wider text-[11px]">
            Organiser Note:
          </strong>
          {roomCredential.instructions}
        </div>
      )}
    </div>
  );
};
