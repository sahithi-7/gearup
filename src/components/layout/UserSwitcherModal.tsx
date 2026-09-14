import React, { useEffect, useState } from 'react';
import type { User, Role } from '../../types';
import { X, CheckCircle, Plus } from 'lucide-react';
import { Button } from '../common/Button';
import { tournamentService } from '../../services/tournamentService';

interface UserSwitcherModalProps {
  isOpen: boolean;
  currentUser: User | null;
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSelectUser
}) => {
  const [customUsername, setCustomUsername] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customIgn, setCustomIgn] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customPassword, setCustomPassword] = useState('password123');
  const [customRole, setCustomRole] = useState<Role>('PLAYER');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    tournamentService.fetchUsers(currentUser.id).then(setUsers).catch(() => {
      setFormError('Unable to load saved users. Check that the backend is running.');
    });
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const canManageUsers = currentUser?.role === 'ORGANISER' || currentUser?.is_admin;

  const handleSelect = (u: User) => {
    onSelectUser(u);
    onClose();
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      const newUser = await tournamentService.registerUser({
        username: customUsername.trim(),
        email: customEmail.trim(),
        password: customPassword.trim() || 'password123',
        in_game_name: customIgn.trim(),
        phone: customPhone.trim(),
        role: customRole
      });
      setUsers(currentUsers => [newUser, ...currentUsers]);
      onSelectUser(newUser);
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to register user');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#0F1A28] border border-[#1F324B] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#4D8EF7]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1F324B] mb-4">
          <div>
            <span className="text-[10px] font-bold text-[#4D8EF7] tracking-wider uppercase font-display">
              Multiplayer Switcher
            </span>
            <h3 className="text-lg font-black font-display uppercase text-white">
              Switch or Create User
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#152234] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-zinc-400 mb-4">
          Test real-time features across players and organizers. Open another tab or browser to simulate live interactions!
        </p>

        {/* Demo Accounts List */}
        <div className="space-y-2.5 mb-4">
          {users.map((u) => {
            const isSelected = currentUser?.id === u.id;
            const isPrivileged = u.role === 'ORGANISER' || u.is_admin;

            return (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSelect(u)}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-[#15273F] border-[#4D8EF7] shadow-[0_0_15px_rgba(77,142,247,0.2)]'
                    : 'bg-[#111C2B] border-[#1F324B] hover:border-zinc-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black font-display text-sm ${
                      isPrivileged
                        ? 'bg-[#4D8EF7] text-[#0B131E]'
                        : 'bg-[#5BD19B] text-[#0B131E]'
                    }`}
                  >
                    {u.username.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-sm font-display">{u.username}</span>
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                          isPrivileged
                            ? 'bg-[#4D8EF7]/20 text-[#4D8EF7] border-[#4D8EF7]/30'
                            : 'bg-[#5BD19B]/20 text-[#5BD19B] border-[#5BD19B]/30'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Balance: <strong className="text-[#5BD19B]">₹{u.wallet_balance}</strong>
                      {u.in_game_name && ` • IGN: ${u.in_game_name}`}
                    </p>
                  </div>
                </div>

                {isSelected ? (
                  <CheckCircle size={18} className="text-[#5BD19B]" />
                ) : (
                  <span className="text-xs text-zinc-500 font-bold uppercase">Select</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Profile Section */}
        {canManageUsers && !showCustomForm ? (
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => setShowCustomForm(true)}
            className="text-xs py-2 border-dashed"
          >
            <Plus size={14} />
            <span>Register User</span>
          </Button>
        ) : canManageUsers ? (
          <form onSubmit={handleCreateCustom} className="p-4 bg-[#0B131E] rounded-2xl border border-[#1F324B] space-y-3">
            <h4 className="text-xs font-bold uppercase text-zinc-300">Register User</h4>
            <div>
              <input
                required
                type="text"
                placeholder="Username (e.g. PhoenixGamer)"
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value)}
                className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5BD19B]"
              />
            </div>
            <div>
              <input
                required
                type="email"
                placeholder="Email address"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5BD19B]"
              />
            </div>
            <div>
              <input
                required
                type="password"
                placeholder="Password (e.g. password123)"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5BD19B]"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="In-Game Name (IGN)"
                value={customIgn}
                onChange={(e) => setCustomIgn(e.target.value)}
                className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5BD19B]"
              />
            </div>
            <div>
              <input
                type="tel"
                placeholder="Phone (for SMS alert)"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5BD19B]"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCustomRole('PLAYER')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase border ${
                  customRole === 'PLAYER'
                    ? 'bg-[#5BD19B]/20 text-[#5BD19B] border-[#5BD19B]'
                    : 'bg-[#152234] border-[#1F324B] text-zinc-400'
                }`}
              >
                Normal User
              </button>
              <button
                type="button"
                onClick={() => setCustomRole('ORGANISER')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase border ${
                  customRole === 'ORGANISER'
                    ? 'bg-[#4D8EF7]/20 text-[#4D8EF7] border-[#4D8EF7]'
                    : 'bg-[#152234] border-[#1F324B] text-zinc-400'
                }`}
              >
                Organiser
              </button>
              <button
                type="button"
                onClick={() => setCustomRole('ADMIN')}
                className={`py-1.5 rounded-lg text-xs font-bold uppercase border ${
                  customRole === 'ADMIN'
                    ? 'bg-[#4D8EF7]/20 text-[#4D8EF7] border-[#4D8EF7]'
                    : 'bg-[#152234] border-[#1F324B] text-zinc-400'
                }`}
              >
                Admin
              </button>
            </div>
            {formError && <p className="text-xs text-red-400">{formError}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCustomForm(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" fullWidth className="text-xs" disabled={isSaving}>
                {isSaving ? 'Registering...' : 'Register & Switch'}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
};
