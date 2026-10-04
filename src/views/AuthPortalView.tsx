import React, { useState, useEffect } from 'react';
import {
  LogIn,
  UserPlus,
  Lock,
  Mail,
  Eye,
  EyeOff,
  User as UserIcon,
  Phone,
  Gamepad2,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  ExternalLink,
  Flame,
  Swords
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { tournamentService } from '../services/tournamentService';
import { soundFx } from '../utils/sound';
import type { User } from '../types';

interface AuthPortalViewProps {
  initialMode?: 'LOGIN' | 'REGISTER';
  onLogin: (credentials: { identifier: string; password: string }) => Promise<User>;
  onRegistered: (user: User) => void;
  onResetSuccess: (user: User) => void;
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_REQUEST' | 'FORGOT_VERIFY' | 'FORGOT_SUCCESS';

export const AuthPortalView: React.FC<AuthPortalViewProps> = ({
  initialMode = 'LOGIN',
  onLogin,
  onRegistered,
  onResetSuccess
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode === 'REGISTER' ? 'REGISTER' : 'LOGIN');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regIgn, setRegIgn] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot password state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resetSuccessUser, setResetSuccessUser] = useState<User | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Status & loading
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const clearMessages = () => {
    setError('');
    setSuccessMsg('');
  };

  // Switch between Login and Register tabs
  const handleSwitchTab = (newMode: 'LOGIN' | 'REGISTER') => {
    clearMessages();
    setMode(newMode);
  };

  // 1. Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const cleanId = loginIdentifier.trim();
    if (!cleanId || !loginPassword) {
      setError('Please provide both username/email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await onLogin({
        identifier: cleanId,
        password: loginPassword
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid username/email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (regPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please verify your password.');
      return;
    }

    setIsLoading(true);
    try {
      const newUser = await tournamentService.registerUser({
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
        in_game_name: regIgn.trim() || regUsername.trim(),
        phone: regPhone.trim(),
        role: 'PLAYER'
      });
      soundFx.playSuccess();
      onRegistered(newUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account. Email or username might be taken.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Request OTP (Forgot Password)
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearMessages();
    const cleanId = forgotIdentifier.trim();
    if (!cleanId) {
      setError('Please enter your registered email or username.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await tournamentService.requestPasswordReset(cleanId);
      setMaskedEmail(res.masked_email || res.target_email || 'your email');
      setPreviewUrl(res.preview_url || null);
      if (res.dev_otp) {
        setOtp(res.dev_otp);
        setSuccessMsg(`Your verification code is: ${res.dev_otp} (Auto-filled below)`);
      } else {
        setSuccessMsg(res.message || 'Verification code sent to your email! (Check Inbox & Spam folder)');
      }
      setResendCooldown(60);
      soundFx.playChatPop();
      setMode('FORGOT_VERIFY');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account not found. Please check your username/email.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Handle Verify OTP & Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
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
      setMode('FORGOT_SUCCESS');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishReset = () => {
    if (resetSuccessUser) {
      onResetSuccess(resetSuccessUser);
    } else {
      setMode('LOGIN');
    }
  };

  return (
    <div className="min-h-screen bg-[#070D15] bg-radial-gradient text-zinc-100 flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Background Esports Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#5BD19B]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#1B59F8]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-72 h-72 bg-[#5BD19B]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5BD19B]/10 border border-[#5BD19B]/30 text-[#5BD19B] text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(91,209,155,0.2)]">
            <Flame size={14} className="animate-pulse" />
            <span>Official Esports Arena</span>
          </div>

          <div className="flex items-center justify-center gap-2.5 pt-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5BD19B] to-[#3BA878] text-[#070D15] flex items-center justify-center shadow-[0_0_20px_rgba(91,209,155,0.4)]">
              <Swords size={22} className="stroke-[2.5]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white uppercase">
              GEAR<span className="text-[#5BD19B]">UP</span>
            </h1>
          </div>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto">
            BGMI • Free Fire • COD • Valorant
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#0F1A28]/95 backdrop-blur-xl border border-[#1F324B] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle top edge highlight */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#5BD19B] to-transparent" />

          {/* Mode: LOGIN or REGISTER Tabs */}
          {(mode === 'LOGIN' || mode === 'REGISTER') && (
            <div className="space-y-6">
              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1 bg-[#09111C] rounded-2xl border border-[#1F324B]">
                <button
                  type="button"
                  onClick={() => handleSwitchTab('LOGIN')}
                  className={`py-2.5 rounded-xl text-xs sm:text-sm font-black font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    mode === 'LOGIN'
                      ? 'bg-[#5BD19B] text-[#070D15] shadow-[0_0_15px_rgba(91,209,155,0.3)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <LogIn size={15} />
                  <span>Log In</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchTab('REGISTER')}
                  className={`py-2.5 rounded-xl text-xs sm:text-sm font-black font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    mode === 'REGISTER'
                      ? 'bg-[#5BD19B] text-[#070D15] shadow-[0_0_15px_rgba(91,209,155,0.3)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <UserPlus size={15} />
                  <span>Register Player</span>
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>{error}</span>
                </div>
              )}

              {/* TAB 1: LOGIN FORM */}
              {mode === 'LOGIN' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <UserIcon size={12} className="text-[#5BD19B]" /> Username or Email
                    </label>
                    <input
                      required
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="player_one or player@example.com"
                      className="w-full bg-[#070D15] border border-[#1F324B] rounded-xl px-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#5BD19B] focus:ring-1 focus:ring-[#5BD19B] transition-colors"
                      autoComplete="username"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                        <Lock size={12} className="text-[#5BD19B]" /> Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          clearMessages();
                          setForgotIdentifier(loginIdentifier.trim());
                          setMode('FORGOT_REQUEST');
                        }}
                        className="text-[11px] font-semibold text-[#5BD19B] hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        required
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#070D15] border border-[#1F324B] rounded-xl pl-3.5 pr-10 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#5BD19B] focus:ring-1 focus:ring-[#5BD19B] transition-colors"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      size="lg"
                      disabled={isLoading}
                      className="text-sm font-black font-display uppercase tracking-wider py-3.5 shadow-[0_0_20px_rgba(91,209,155,0.3)] hover:shadow-[0_0_25px_rgba(91,209,155,0.5)]"
                    >
                      {isLoading ? 'Entering Arena...' : 'Sign In to Arena'}
                    </Button>
                  </div>

                  <div className="text-center pt-2">
                    <p className="text-xs text-zinc-400">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => handleSwitchTab('REGISTER')}
                        className="text-[#5BD19B] font-bold hover:underline"
                      >
                        Register as Player
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* TAB 2: REGISTER FORM */}
              {mode === 'REGISTER' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1">
                        <UserIcon size={12} className="text-[#5BD19B]" /> Username *
                      </label>
                      <input
                        required
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="pro_gamer"
                        className="w-full bg-[#070D15] border border-[#1F324B] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#5BD19B]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1">
                        <Gamepad2 size={12} className="text-[#5BD19B]" /> In-Game Name (IGN)
                      </label>
                      <input
                        type="text"
                        value={regIgn}
                        onChange={(e) => setRegIgn(e.target.value)}
                        placeholder="e.g. SOUL•MORTAL"
                        className="w-full bg-[#070D15] border border-[#1F324B] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#5BD19B]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1">
                        <Mail size={12} className="text-[#5BD19B]" /> Email Address *
                      </label>
                      <span className="text-[10px] text-[#5BD19B] font-semibold">Sends Welcome Email</span>
                    </div>
                    <input
                      required
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="player@gmail.com"
                      className="w-full bg-[#070D15] border border-[#1F324B] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#5BD19B]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1">
                      <Phone size={12} className="text-[#5BD19B]" /> Mobile / WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full bg-[#070D15] border border-[#1F324B] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#5BD19B]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1">
                        <Lock size={12} className="text-[#5BD19B]" /> Password *
                      </label>
                      <div className="relative">
                        <input
                          required
                          type={showRegPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min 4 chars"
                          className="w-full bg-[#070D15] border border-[#1F324B] rounded-xl pl-3 pr-9 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#5BD19B]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                          {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-[#5BD19B]" /> Confirm *
                      </label>
                      <input
                        required
                        type={showRegPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full bg-[#070D15] border border-[#1F324B] rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#5BD19B]"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      size="lg"
                      disabled={isLoading}
                      className="text-sm font-black font-display uppercase tracking-wider py-3.5 shadow-[0_0_20px_rgba(91,209,155,0.3)] hover:shadow-[0_0_25px_rgba(91,209,155,0.5)]"
                    >
                      {isLoading ? 'Creating Player Account...' : 'Create Player Account'}
                    </Button>
                  </div>

                  <div className="text-center pt-2">
                    <p className="text-xs text-zinc-400">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => handleSwitchTab('LOGIN')}
                        className="text-[#5BD19B] font-bold hover:underline"
                      >
                        Sign In
                      </button>
                    </p>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* MODE: FORGOT PASSWORD REQUEST */}
          {mode === 'FORGOT_REQUEST' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-[#1F324B]">
                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setMode('LOGIN');
                  }}
                  className="p-2 rounded-xl bg-[#070D15] hover:bg-[#152234] text-zinc-300 hover:text-white border border-[#1F324B] transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h3 className="text-base font-black font-display uppercase text-white">Reset Password</h3>
                  <p className="text-[11px] text-zinc-400">Receive a 6-digit OTP code to reset password</p>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Mail size={12} className="text-[#5BD19B]" /> Registered Email or Username
                  </label>
                  <input
                    required
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="e.g. player@example.com"
                    className="w-full bg-[#070D15] border border-[#1F324B] rounded-xl px-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#5BD19B]"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={isLoading}
                  className="text-sm font-black font-display uppercase py-3 shadow-[0_0_20px_rgba(91,209,155,0.3)]"
                >
                  {isLoading ? 'Sending Code...' : 'Send 6-Digit OTP Code'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setMode('LOGIN');
                    }}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Back to Log In
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MODE: FORGOT PASSWORD VERIFY OTP */}
          {mode === 'FORGOT_VERIFY' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-[#1F324B]">
                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setMode('FORGOT_REQUEST');
                  }}
                  className="p-2 rounded-xl bg-[#070D15] hover:bg-[#152234] text-zinc-300 hover:text-white border border-[#1F324B] transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h3 className="text-base font-black font-display uppercase text-white">Enter 6-Digit Code</h3>
                  <p className="text-[11px] text-zinc-400">Sent to {maskedEmail}</p>
                </div>
              </div>

              {successMsg && (
                <div className="p-3 rounded-xl bg-[#5BD19B]/10 border border-[#5BD19B]/30 text-[#5BD19B] text-xs">
                  {successMsg}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {error}
                </div>
              )}

              {/* Dev preview link if local testing */}
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-[#1B59F8]/10 border border-[#1B59F8]/30 text-[#4D8EF7] text-xs flex items-center justify-between hover:underline"
                >
                  <span>View Test Email with OTP</span>
                  <ExternalLink size={13} />
                </a>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <KeyRound size={12} className="text-[#5BD19B]" /> 6-Digit OTP Code
                  </label>
                  <input
                    required
                    maxLength={6}
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.5em] font-mono font-bold text-xl bg-[#070D15] border border-[#1F324B] rounded-xl px-3 py-3 text-white focus:outline-none focus:border-[#5BD19B]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#070D15] border border-[#1F324B] rounded-xl pl-3 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                      Confirm New
                    </label>
                    <input
                      required
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#070D15] border border-[#1F324B] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-zinc-500">Didn't receive code?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isLoading}
                    onClick={() => handleRequestOtp()}
                    className={`font-semibold ${
                      resendCooldown > 0 ? 'text-zinc-500 cursor-not-allowed' : 'text-[#5BD19B] hover:underline'
                    }`}
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={isLoading}
                  className="text-sm font-black font-display uppercase py-3 shadow-[0_0_20px_rgba(91,209,155,0.3)]"
                >
                  {isLoading ? 'Verifying...' : 'Set Password & Enter Arena'}
                </Button>
              </form>
            </div>
          )}

          {/* MODE: FORGOT PASSWORD SUCCESS */}
          {mode === 'FORGOT_SUCCESS' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#5BD19B]/20 text-[#5BD19B] border border-[#5BD19B]/40 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(91,209,155,0.4)]">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black font-display uppercase text-white">Password Updated!</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Your credentials have been securely updated. You can now jump straight into the arena.
                </p>
              </div>
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={handleFinishReset}
                className="text-sm font-black font-display uppercase py-3.5 shadow-[0_0_20px_rgba(91,209,155,0.3)]"
              >
                Enter Arena Lobby
              </Button>
            </div>
          )}
        </div>

        {/* Footer info badge */}
        <div className="text-center text-[11px] text-zinc-500">
          <p>Protected by GearUp Security • Real-Time Tournament Passwords</p>
        </div>
      </div>
    </div>
  );
};
