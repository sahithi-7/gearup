import React, { useState, useEffect } from 'react';
import {
  X,
  LogIn,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Button } from '../common/Button';
import { tournamentService } from '../../services/tournamentService';
import { soundFx } from '../../utils/sound';
import type { User } from '../../types';

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (credentials: { identifier: string; password: string }) => Promise<User>;
  onNavigateToRegister: () => void;
  onResetSuccess?: (user: User) => void;
}

type AuthMode = 'LOGIN' | 'FORGOT_REQUEST' | 'FORGOT_VERIFY' | 'SUCCESS';

export const AuthModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onNavigateToRegister,
  onResetSuccess
}) => {
  // Modal mode state
  const [mode, setMode] = useState<AuthMode>('LOGIN');

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password flow state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resetSuccessUser, setResetSuccessUser] = useState<User | null>(null);

  // Status & Resend Timer
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setMode('LOGIN');
        setPassword('');
        setError('');
        setSuccessMsg('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setPreviewUrl(null);
        setResetSuccessUser(null);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // 1. Handle Standard Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
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

  // Switch to Forgot Password
  const handleOpenForgotPassword = () => {
    setError('');
    setSuccessMsg('');
    setForgotIdentifier(identifier.trim());
    setMode('FORGOT_REQUEST');
  };

  // 2. Handle Request OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = forgotIdentifier.trim();
    if (!cleanId) {
      setError('Please enter your registered email or username');
      return;
    }

    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await tournamentService.requestPasswordReset(cleanId);
      setMaskedEmail(res.masked_email || res.target_email || 'your email');
      setPreviewUrl(res.preview_url || null);
      setSuccessMsg(res.message || 'Verification code sent successfully!');
      setResendCooldown(60);
      soundFx.playChatPop();
      setMode('FORGOT_VERIFY');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code. Please check your username/email.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    await handleRequestOtp();
  };

  // 3. Handle Verify OTP & Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await tournamentService.resetPasswordWithOtp({
        identifier: forgotIdentifier.trim(),
        otp: cleanOtp,
        newPassword
      });

      soundFx.playSuccess();
      setResetSuccessUser(res.user);
      setMode('SUCCESS');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please check the OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Handle Post-Reset Action
  const handleFinishReset = () => {
    if (resetSuccessUser && onResetSuccess) {
      onResetSuccess(resetSuccessUser);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-[#0F1A28] border border-[#1F324B] rounded-2xl p-6 shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#5BD19B]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1F324B] mb-5">
          <div className="flex items-center gap-3">
            {mode === 'LOGIN' ? (
              <div className="w-10 h-10 rounded-xl bg-[#5BD19B]/15 text-[#5BD19B] border border-[#5BD19B]/30 flex items-center justify-center">
                <LogIn size={20} />
              </div>
            ) : mode === 'FORGOT_REQUEST' ? (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode('LOGIN');
                }}
                className="w-10 h-10 rounded-xl bg-[#152234] hover:bg-[#1f324b] text-zinc-300 hover:text-white border border-[#1F324B] flex items-center justify-center transition-colors"
                title="Back to Login"
              >
                <ArrowLeft size={18} />
              </button>
            ) : mode === 'FORGOT_VERIFY' ? (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode('FORGOT_REQUEST');
                }}
                className="w-10 h-10 rounded-xl bg-[#152234] hover:bg-[#1f324b] text-zinc-300 hover:text-white border border-[#1F324B] flex items-center justify-center transition-colors"
                title="Back to Code Request"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#5BD19B]/15 text-[#5BD19B] border border-[#5BD19B]/30 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
            )}

            <div>
              <h3 className="text-xl font-black font-display uppercase text-white tracking-tight flex items-center gap-1.5">
                {mode === 'LOGIN' && 'Player Login'}
                {mode === 'FORGOT_REQUEST' && 'Reset Password'}
                {mode === 'FORGOT_VERIFY' && 'Enter 6-Digit OTP'}
                {mode === 'SUCCESS' && 'Password Updated!'}
              </h3>
              <p className="text-xs text-zinc-400">
                {mode === 'LOGIN' && 'Access your tournaments & match stats'}
                {mode === 'FORGOT_REQUEST' && 'We will send a 6-digit OTP code to your email'}
                {mode === 'FORGOT_VERIFY' && 'Verify your identity and set a new password'}
                {mode === 'SUCCESS' && 'Your account credentials have been securely updated'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#152234] transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium animate-fadeIn">
            {error}
          </div>
        )}

        {/* Success message banner (for request stage) */}
        {successMsg && mode !== 'SUCCESS' && (
          <div className="mb-4 p-3 rounded-xl bg-[#5BD19B]/10 border border-[#5BD19B]/30 text-[#5BD19B] text-xs font-medium animate-fadeIn">
            {successMsg}
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE: LOGIN FORM                                          */}
        {/* ========================================================= */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgotPassword}
                  className="text-xs text-[#5BD19B] hover:text-[#4ec08b] font-semibold transition-colors hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
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
              className="py-3 mt-2 shadow-lg shadow-[#5BD19B]/10"
            >
              {isLoading ? 'Signing In...' : 'Sign In to GearUp'}
            </Button>

            {/* Footer Link to Register */}
            <div className="pt-2 text-center">
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
          </form>
        )}

        {/* ========================================================= */}
        {/* MODE: FORGOT REQUEST (Enter email/username)               */}
        {/* ========================================================= */}
        {mode === 'FORGOT_REQUEST' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="bg-[#152234]/60 border border-[#1F324B] rounded-xl p-3.5 text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5">
              <KeyRound size={18} className="text-[#5BD19B] shrink-0 mt-0.5" />
              <span>
                Enter your registered <strong>email address</strong> or <strong>GamerTag</strong>. We will generate a secure 6-digit OTP code and send it to your inbox immediately.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Registered Email or Username
              </label>
              <div className="relative">
                <input
                  required
                  autoFocus
                  type="text"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="e.g. your_email@gmail.com or playerTag"
                  className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B] transition-colors"
                />
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isLoading || !forgotIdentifier.trim()}
              className="py-3 mt-2 shadow-lg shadow-[#5BD19B]/10"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin" /> Sending OTP Code...
                </span>
              ) : (
                'Send Verification OTP'
              )}
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode('LOGIN');
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Remembered your password? <span className="text-[#5BD19B] font-bold">Back to Login</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* MODE: FORGOT VERIFY (Enter OTP + New Password)            */}
        {/* ========================================================= */}
        {mode === 'FORGOT_VERIFY' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="bg-[#152234]/70 border border-[#1F324B] rounded-xl p-3 text-xs text-zinc-300 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Verification Code Sent</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#5BD19B]/15 text-[#5BD19B] border border-[#5BD19B]/30">
                  Valid 10 Mins
                </span>
              </div>
              <p className="text-zinc-400">
                Code sent to <span className="text-white font-mono">{maskedEmail}</span>. Check your inbox and spam folder.
              </p>

              {/* Dev / Quick Preview Helper */}
              {previewUrl && (
                <div className="pt-1 border-t border-[#1F324B]/50 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Testing locally or SMTP slow?</span>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#5BD19B] hover:underline font-semibold"
                  >
                    View Code in Browser <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* 6-Digit OTP Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  6-Digit OTP Code
                </label>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-xs text-[#5BD19B] disabled:text-zinc-500 font-medium transition-colors hover:underline"
                >
                  {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
                </button>
              </div>
              <div className="relative">
                <input
                  required
                  autoFocus
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-4 py-2.5 text-center text-lg font-mono font-bold tracking-[0.35em] text-white focus:outline-none focus:border-[#5BD19B] transition-colors"
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  required
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B] transition-colors"
                />
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  required
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B] transition-colors"
                />
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isLoading || otp.trim().length !== 6 || !newPassword || newPassword !== confirmPassword}
              className="py-3 mt-2 shadow-lg shadow-[#5BD19B]/10"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin" /> Verifying & Updating...
                </span>
              ) : (
                'Set New Password & Continue'
              )}
            </Button>
          </form>
        )}

        {/* ========================================================= */}
        {/* MODE: SUCCESS NOTIFICATION                                */}
        {/* ========================================================= */}
        {mode === 'SUCCESS' && (
          <div className="py-4 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-[#5BD19B]/20 border border-[#5BD19B]/40 text-[#5BD19B] flex items-center justify-center mx-auto shadow-lg shadow-[#5BD19B]/20">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white">Password Reset Complete!</h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Your password has been successfully updated. You can now access all tournaments, wallet services, and match lobbies with your new credentials.
              </p>
            </div>

            {resetSuccessUser && (
              <div className="bg-[#152234]/80 border border-[#1F324B] rounded-xl p-3 text-left max-w-sm mx-auto flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">{resetSuccessUser.username}</div>
                  <div className="text-[11px] text-zinc-400">{resetSuccessUser.email}</div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#5BD19B]/15 text-[#5BD19B] border border-[#5BD19B]/30 flex items-center gap-1">
                  <Sparkles size={10} /> Active
                </span>
              </div>
            )}

            <Button
              type="button"
              variant="primary"
              fullWidth
              onClick={handleFinishReset}
              className="py-3 mt-2 shadow-lg shadow-[#5BD19B]/10"
            >
              {onResetSuccess && resetSuccessUser ? 'Proceed to Dashboard' : 'Done & Close'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export const LoginModal = AuthModal;
