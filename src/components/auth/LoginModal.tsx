import React, { useState } from 'react';
import { X, LogIn, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { Button } from '../common/Button';
import type { User } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (credentials: { identifier: string; password: string }) => Promise<User>;
  onNavigateToRegister: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onNavigateToRegister
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onLogin({
        identifier: identifier.trim(),
        password
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-[#0F1A28] border border-[#1F324B] rounded-2xl p-6 shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1F324B] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5BD19B]/15 text-[#5BD19B] border border-[#5BD19B]/30 flex items-center justify-center">
              <LogIn size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black font-display uppercase text-white tracking-tight">
                Player Login
              </h3>
              <p className="text-xs text-zinc-400">Access your tournaments & match stats</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#152234] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Email or Username
            </label>
            <div className="relative">
              <input
                required
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or GamerTag"
                className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B] transition-colors"
              />
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B] transition-colors"
              />
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isLoading}
            className="py-3 mt-2"
          >
            {isLoading ? 'Logging in...' : 'Sign In to GearUp'}
          </Button>
        </form>

        {/* Footer Link to Register */}
        <div className="mt-4 text-center">
          <p className="text-xs text-zinc-400">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToRegister();
              }}
              className="text-[#5BD19B] font-bold hover:underline ml-1"
            >
              Create Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

