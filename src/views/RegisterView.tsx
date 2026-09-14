import { useState } from 'react';
import { ShieldCheck, UserPlus, Lock, Eye, EyeOff } from 'lucide-react';
import type { User } from '../types';
import { tournamentService } from '../services/tournamentService';
import { Button } from '../components/common/Button';

interface RegisterViewProps {
  navigate: (path: string) => void;
  onRegistered: (user: User) => void;
  onOpenLogin?: () => void;
}

export function RegisterView({ navigate, onRegistered, onOpenLogin }: RegisterViewProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inGameName, setInGameName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password && confirmPassword && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password && password.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await tournamentService.registerUser({
        username: username.trim(),
        email: email.trim(),
        password: password.trim() || 'password123',
        in_game_name: inGameName.trim(),
        phone: phone.trim(),
        role: 'PLAYER'
      });
      onRegistered(user);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to register your account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="border border-[#1F324B] bg-[#111C2B] rounded-lg shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-[#1F324B]">
          <div className="w-11 h-11 rounded-lg bg-[#5BD19B]/15 text-[#5BD19B] flex items-center justify-center mb-4">
            <UserPlus size={22} />
          </div>
          <h1 className="text-2xl font-black font-display uppercase text-white">Create Account</h1>
          <p className="text-sm text-zinc-400 mt-1">Set up your GearUp profile to join and manage tournaments.</p>
        </div>

        <form onSubmit={submit} className="p-6 sm:p-8 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase text-zinc-300">Username</span>
            <input required value={username} onChange={(event) => setUsername(event.target.value)} className="w-full bg-[#0B131E] border border-[#1F324B] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]" placeholder="Your display name" />
          </label>

          <label className="block space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-zinc-300">Email</span>
              <span className="text-[10px] text-[#5BD19B] font-semibold">Sends Welcome Email</span>
            </div>
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-[#0B131E] border border-[#1F324B] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]" placeholder="you@example.com" />
          </label>

          {/* Password & Confirm Password */}
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase text-zinc-300 flex items-center gap-1">
                <Lock size={12} className="text-[#5BD19B]" /> Password
              </span>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-[#0B131E] border border-[#1F324B] rounded-lg pl-3 pr-9 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]"
                  placeholder="Create password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase text-zinc-300">Confirm Password</span>
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full bg-[#0B131E] border border-[#1F324B] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]"
                placeholder="Repeat password"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase text-zinc-300">In-game Name</span>
              <input value={inGameName} onChange={(event) => setInGameName(event.target.value)} className="w-full bg-[#0B131E] border border-[#1F324B] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]" placeholder="Optional" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase text-zinc-300">Phone</span>
              <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full bg-[#0B131E] border border-[#1F324B] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]" placeholder="Optional" />
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-bold uppercase text-zinc-300">Account Role</legend>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" aria-pressed="true" className="min-h-10 border rounded-lg px-2 text-xs font-bold uppercase border-[#5BD19B] bg-[#5BD19B]/15 text-[#5BD19B]">
                Normal User
              </button>
              <button type="button" disabled aria-disabled="true" className="min-h-10 border rounded-lg px-2 text-xs font-bold uppercase border-[#1F324B] bg-[#0B131E] text-zinc-600 cursor-not-allowed">
                <ShieldCheck size={13} className="inline mr-1" />
                Admin
              </button>
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/')} className="sm:w-auto">Cancel</Button>
            <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>

          <div className="pt-2 text-center text-xs text-zinc-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => onOpenLogin ? onOpenLogin() : navigate('/')}
              className="text-[#5BD19B] font-bold hover:underline ml-1"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
