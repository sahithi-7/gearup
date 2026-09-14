import React, { useState } from 'react';
import type { Tournament, User, RegistrationResult, TeamMember } from '../../types';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  IndianRupee,
  Sparkles,
  Mail,
  ExternalLink,
  Users,
  Crown,
  User as UserIcon,
  Phone
} from 'lucide-react';
import { Button } from '../common/Button';

interface RegistrationModalProps {
  tournament: Tournament;
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    player_ign: string;
    player_uid: string;
    phone: string;
    team_name?: string;
    teammates?: TeamMember[];
    email?: string;
  }) => Promise<RegistrationResult | void>;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  tournament,
  user,
  isOpen,
  onClose,
  onSubmit
}) => {
  // Player 1 (Leader)
  const [ign, setIgn] = useState(user?.in_game_name || user?.username || '');
  const [uid, setUid] = useState('');

  // Team & Teammates
  const [teamName, setTeamName] = useState('');
  const [p2Ign, setP2Ign] = useState('');
  const [p2Uid, setP2Uid] = useState('');
  const [p3Ign, setP3Ign] = useState('');
  const [p3Uid, setP3Uid] = useState('');
  const [p4Ign, setP4Ign] = useState('');
  const [p4Uid, setP4Uid] = useState('');

  // Contact
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [paymentMode, setPaymentMode] = useState<'WALLET' | 'UPI'>('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const [submittedRoster, setSubmittedRoster] = useState<{ teamName?: string; members: { role: string; name: string; uid: string }[] } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const isDuo = tournament.format === 'Duo';
  const isSquad = tournament.format === 'Squad';
  const isTeam = isDuo || isSquad;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const targetEmail = email.trim() || user?.email || '';

      const teammates: TeamMember[] = [];
      const rosterList: { role: string; name: string; uid: string }[] = [
        { role: isTeam ? 'Player 1 (Leader)' : 'Player', name: ign.trim(), uid: uid.trim() }
      ];

      if (isDuo || isSquad) {
        teammates.push({ name: p2Ign.trim(), uid: p2Uid.trim() });
        rosterList.push({ role: 'Player 2', name: p2Ign.trim(), uid: p2Uid.trim() });
      }

      if (isSquad) {
        teammates.push({ name: p3Ign.trim(), uid: p3Uid.trim() });
        rosterList.push({ role: 'Player 3', name: p3Ign.trim(), uid: p3Uid.trim() });

        teammates.push({ name: p4Ign.trim(), uid: p4Uid.trim() });
        rosterList.push({ role: 'Player 4', name: p4Ign.trim(), uid: p4Uid.trim() });
      }

      const result = await onSubmit({
        player_ign: ign.trim(),
        player_uid: uid.trim(),
        phone: phone.trim(),
        team_name: isTeam ? teamName.trim() : undefined,
        teammates: isTeam ? teammates : undefined,
        email: targetEmail
      });

      setConfirmedEmail(targetEmail);
      setSubmittedRoster({
        teamName: isTeam ? teamName.trim() : undefined,
        members: rosterList
      });

      if (result && typeof result === 'object' && result.preview_url) {
        setPreviewUrl(result.preview_url);
      }
      setSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setPreviewUrl(null);
    setSubmittedRoster(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Drawer / Modal Container */}
      <div
        className="w-full sm:max-w-xl bg-[#0F1A28] border-t sm:border border-[#1F324B] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle pull bar */}
        <div className="w-12 h-1.5 bg-[#1F324B] rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1F324B] mb-4">
          <div>
            <span className="text-[10px] font-bold text-[#5BD19B] tracking-wider uppercase font-display flex items-center gap-1.5">
              {isTeam ? <Users size={13} /> : <UserIcon size={13} />}
              {tournament.game} • {tournament.format} Match
            </span>
            <h3 className="text-lg sm:text-xl font-black font-display uppercase text-white tracking-tight">
              {isTeam ? `Register ${tournament.format} Team` : 'Confirm Solo Match Entry'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#152234] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#5BD19B]/20 text-[#5BD19B] border border-[#5BD19B]/40 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            <h4 className="text-2xl font-black font-display uppercase text-white">Registration Confirmed!</h4>

            <div className="bg-[#0B131E] border border-[#1F324B] rounded-xl p-4 max-w-md mx-auto text-left space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#5BD19B] uppercase tracking-wider">
                <Mail size={15} /> Confirmation Email Dispatched
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                A match entry receipt with full tournament rules, slot confirmation, and roster details has been sent to:
              </p>
              <div className="font-mono text-xs text-white bg-[#152234] py-2 px-3 rounded-lg border border-[#1F324B] truncate flex items-center justify-between">
                <span className="text-[#5BD19B] font-bold">{confirmedEmail || email}</span>
                <span className="text-[10px] uppercase font-bold text-zinc-400">Delivered</span>
              </div>

              {/* Roster Confirmation Preview */}
              {submittedRoster && (
                <div className="border-t border-[#1F324B] pt-3 mt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-400 uppercase tracking-wider">Registered Roster:</span>
                    {submittedRoster.teamName && (
                      <span className="font-bold font-display text-white bg-[#152234] px-2 py-0.5 rounded border border-[#1F324B]">
                        Team: <strong className="text-[#5BD19B]">{submittedRoster.teamName}</strong>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {submittedRoster.members.map((m, i) => (
                      <div key={i} className="bg-[#111C2B] p-2 rounded-lg border border-[#1F324B] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400 block">{m.role}</span>
                          <span className="font-bold text-white text-xs">{m.name}</span>
                        </div>
                        <span className="font-mono text-[11px] text-[#5BD19B] bg-[#0B131E] px-1.5 py-0.5 rounded border border-[#1F324B]">
                          {m.uid}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-[11px] text-zinc-400 border-t border-[#1F324B] pt-2">
                ⚠️ <strong>Room ID & Password:</strong> Will unlock 15 minutes before the match start time in your player dashboard and notification center.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#5BD19B]/15 border border-[#5BD19B] text-[#5BD19B] hover:bg-[#5BD19B]/25 transition-all shadow-sm"
                >
                  <ExternalLink size={14} /> View Sent Email Preview
                </a>
              )}
              <Button
                type="button"
                variant="primary"
                onClick={handleClose}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold"
              >
                Back to Tournament
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tournament Summary Card */}
            <div className="bg-[#0B131E] p-3 rounded-xl border border-[#1F324B] flex items-center justify-between text-xs">
              <div>
                <p className="text-zinc-400 font-medium">Tournament</p>
                <p className="font-bold text-white font-display text-sm truncate max-w-[220px] sm:max-w-xs">
                  {tournament.title}
                </p>
              </div>
              <div className="text-right">
                <p className="text-zinc-400 font-medium">Entry Fee</p>
                <p className="font-black text-sm text-[#5BD19B]">
                  {tournament.entry_fee === 0 ? 'FREE' : `₹${tournament.entry_fee}`}
                </p>
              </div>
            </div>

            {/* TEAM REGISTRATION SECTION (DUO / SQUAD) */}
            {isTeam && (
              <div className="space-y-3.5 bg-[#0B131E]/80 border border-[#1F324B] rounded-2xl p-4">
                <div className="flex items-center justify-between border-b border-[#1F324B] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5BD19B] flex items-center gap-1.5">
                    <Users size={14} /> {tournament.format} Squad Details
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {isSquad ? 'All 4 Players Required' : 'Both 2 Players Required'}
                  </span>
                </div>

                {/* Team Name Input */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Squad / Team Name <span className="text-red-400">*</span></span>
                    <span className="text-[10px] text-zinc-400">Displayed in Live Results</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Team Velocity / Soul Warriors"
                    className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-[#5BD19B] transition-colors"
                  />
                </div>

                {/* Player 1 (Leader) */}
                <div className="pt-2 border-t border-[#1F324B]/60">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                    <Crown size={13} /> Player 1 (Team Leader / You) <span className="text-red-400">*</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                        Leader IGN <span className="text-red-400">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={ign}
                        onChange={(e) => setIgn(e.target.value)}
                        placeholder="Player 1 IGN"
                        className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5BD19B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                        Leader UID <span className="text-red-400">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={uid}
                        onChange={(e) => setUid(e.target.value)}
                        placeholder="Player 1 Game UID"
                        className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#5BD19B]"
                      />
                    </div>
                  </div>
                </div>

                {/* Player 2 */}
                <div className="pt-2 border-t border-[#1F324B]/60">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#4D8EF7] uppercase tracking-wider mb-2">
                    <UserIcon size={13} /> Player 2 <span className="text-red-400">*</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                        Player 2 IGN <span className="text-red-400">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={p2Ign}
                        onChange={(e) => setP2Ign(e.target.value)}
                        placeholder="Player 2 IGN"
                        className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5BD19B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                        Player 2 UID <span className="text-red-400">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={p2Uid}
                        onChange={(e) => setP2Uid(e.target.value)}
                        placeholder="Player 2 Game UID"
                        className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#5BD19B]"
                      />
                    </div>
                  </div>
                </div>

                {/* Player 3 (Squad only) */}
                {isSquad && (
                  <div className="pt-2 border-t border-[#1F324B]/60">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#4D8EF7] uppercase tracking-wider mb-2">
                      <UserIcon size={13} /> Player 3 <span className="text-red-400">*</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                          Player 3 IGN <span className="text-red-400">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          value={p3Ign}
                          onChange={(e) => setP3Ign(e.target.value)}
                          placeholder="Player 3 IGN"
                          className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5BD19B]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                          Player 3 UID <span className="text-red-400">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          value={p3Uid}
                          onChange={(e) => setP3Uid(e.target.value)}
                          placeholder="Player 3 Game UID"
                          className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#5BD19B]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Player 4 (Squad only) */}
                {isSquad && (
                  <div className="pt-2 border-t border-[#1F324B]/60">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#4D8EF7] uppercase tracking-wider mb-2">
                      <UserIcon size={13} /> Player 4 <span className="text-red-400">*</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                          Player 4 IGN <span className="text-red-400">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          value={p4Ign}
                          onChange={(e) => setP4Ign(e.target.value)}
                          placeholder="Player 4 IGN"
                          className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5BD19B]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                          Player 4 UID <span className="text-red-400">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          value={p4Uid}
                          onChange={(e) => setP4Uid(e.target.value)}
                          placeholder="Player 4 Game UID"
                          className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#5BD19B]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SOLO PLAYER INPUTS */}
            {!isTeam && (
              <div className="space-y-3 bg-[#0B131E]/80 border border-[#1F324B] rounded-2xl p-4">
                {/* In-Game Name */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    In-Game Name (IGN) <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={ign}
                    onChange={(e) => setIgn(e.target.value)}
                    placeholder="Exact IGN e.g. SoulMortaL"
                    className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B] transition-colors"
                  />
                </div>

                {/* Game UID */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Character / Player UID <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={uid}
                    onChange={(e) => setUid(e.target.value)}
                    placeholder="e.g. 519284710"
                    className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#5BD19B] transition-colors"
                  />
                </div>
              </div>
            )}

            {/* CONTACT DETAILS SECTION */}
            <div className="space-y-3 bg-[#0B131E]/60 border border-[#1F324B] rounded-2xl p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1.5">
                <Phone size={13} /> {isTeam ? 'Team Leader Contact Details' : 'Contact Details'}
              </div>

              {/* Email Address for Confirmation */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} className="text-[#5BD19B]" /> Confirmation Email Address <span className="text-red-400">*</span>
                  </span>
                  <span className="text-[10px] text-[#5BD19B] font-semibold">Sends Match Receipt</span>
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B] transition-colors"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  We'll email your registration receipt, match rules, and Room ID reminder to this inbox.
                </p>
              </div>

              {/* Mobile number for SMS alerts */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  WhatsApp / Mobile Number <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B] transition-colors"
                />
              </div>
            </div>

            {/* Payment Section (if fee > 0) */}
            {tournament.entry_fee > 0 && (
              <div className="bg-[#0B131E] p-3 rounded-xl border border-[#1F324B] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-bold uppercase">Payment Mode</span>
                  <span className="text-[#5BD19B] font-bold">Secure Checkout</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('UPI')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      paymentMode === 'UPI'
                        ? 'bg-[#5BD19B]/15 border-[#5BD19B] text-[#5BD19B]'
                        : 'bg-[#152234] border-[#1F324B] text-zinc-400'
                    }`}
                  >
                    <span>UPI / GPay / PhonePe</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('WALLET')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      paymentMode === 'WALLET'
                        ? 'bg-[#5BD19B]/15 border-[#5BD19B] text-[#5BD19B]'
                        : 'bg-[#152234] border-[#1F324B] text-zinc-400'
                    }`}
                  >
                    <span>GearUp Wallet (₹{user?.wallet_balance || 0})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Fair play reminder */}
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <ShieldCheck size={14} className="text-[#5BD19B] flex-shrink-0" />
              <span>I confirm all teammates will play without hacks/emulators on mobile.</span>
            </div>

            {/* Buttons */}
            <div className="pt-2 flex gap-3">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isSubmitting}
                className="py-3 font-bold"
              >
                {isSubmitting ? (
                  <span>Dispatching Registration & Email...</span>
                ) : tournament.entry_fee === 0 ? (
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={16} /> Confirm Free {isTeam ? `${tournament.format} Registration` : 'Registration'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <IndianRupee size={15} /> Pay ₹{tournament.entry_fee} & Register {isTeam ? `${tournament.format} Team` : ''}
                  </span>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
