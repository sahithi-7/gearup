import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ShieldCheck, Wallet, User as UserIcon, Users, PlusCircle, Bell, KeyRound, CheckCheck, ExternalLink, Sparkles, Trash2, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { Button } from '../common/Button';
import type { User, Role, AppNotification } from '../../types';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
  user: User | null;
  onLogin: (role?: Role) => void;
  onRegister?: () => void;
  onLogout: () => void;
  onlineCount?: number;
  onOpenAddCash?: () => void;
  onOpenUserSwitcher?: () => void;
  notifications?: AppNotification[];
  onMarkNotificationAsRead?: (id: string) => void;
  onMarkAllNotificationsAsRead?: () => void;
  onClearAllNotifications?: () => void;
  onDeleteNotification?: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  navigate,
  user,
  onLogin,
  onRegister,
  onLogout,
  onlineCount = 1,
  onOpenAddCash,
  onOpenUserSwitcher,
  notifications = [],
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onClearAllNotifications,
  onDeleteNotification
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const isAdmin = Boolean(user?.is_admin || user?.role === 'ADMIN');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B131E]/95 backdrop-blur-md border-b border-[#1F324B]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Live Status Indicator */}
          <div className="flex items-center gap-3 sm:gap-4">
            <BrandLogo onClick={() => navigate('/')} size="sm" />
            
            {/* Real-time sync badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111C2B] border border-[#1F324B] text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-[#5BD19B] animate-ping" />
              <span className="w-2 h-2 rounded-full bg-[#5BD19B] -ml-3" />
              <span className="text-[#5BD19B] font-bold">LIVE SYNC</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-300 font-semibold flex items-center gap-1">
                <Users size={11} className="text-[#4D8EF7]" /> {onlineCount} {onlineCount === 1 ? 'Gamer' : 'Gamers'} Online
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-semibold font-display tracking-wider">
            <button
              onClick={() => navigate('/')}
              className={`transition-colors py-1 ${
                currentPath === '/' ? 'text-[#5BD19B] border-b-2 border-[#5BD19B]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              HOME
            </button>
            <button
              onClick={() => navigate('/tournaments')}
              className={`transition-colors py-1 ${
                currentPath === '/tournaments' ? 'text-[#5BD19B] border-b-2 border-[#5BD19B]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              TOURNAMENTS
            </button>
            <button
              onClick={() => navigate('/dashboard/player')}
              className={`transition-colors py-1 ${
                currentPath === '/dashboard/player' ? 'text-[#5BD19B] border-b-2 border-[#5BD19B]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              MY MATCHES
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate('/dashboard/organiser')}
                className={`transition-colors py-1 flex items-center gap-1 ${
                  currentPath === '/dashboard/organiser' ? 'text-[#4D8EF7] border-b-2 border-[#4D8EF7]' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ShieldCheck size={14} className="text-[#4D8EF7]" />
                <span>ORGANISER</span>
              </button>
            )}
          </nav>

          {/* Right Action / Auth Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {!user ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onLogin()}
                  className="text-xs px-3 sm:px-4"
                >
                  <UserIcon size={14} />
                  <span>Login</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline-blue"
                  onClick={onRegister}
                  className="text-xs px-2.5 sm:px-3"
                >
                  <ShieldCheck size={14} />
                  <span>Register User</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Wallet Balance with Quick Add Trigger */}
                <button
                  onClick={onOpenAddCash}
                  title="Click to add cash"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111C2B] hover:bg-[#15273F] border border-[#1F324B] hover:border-[#5BD19B]/40 text-xs transition-colors group"
                >
                  <Wallet size={13} className="text-[#5BD19B] group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline text-zinc-400">Balance:</span>
                  <span className="font-black text-white font-mono">₹{user.wallet_balance}</span>
                  <PlusCircle size={12} className="text-[#5BD19B] ml-0.5" />
                </button>

                {/* Notification Center (Bell) */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setIsNotifOpen(prev => !prev)}
                    title="Match notifications and room credentials"
                    className={`p-2 rounded-lg border text-xs transition-colors relative flex items-center justify-center ${
                      unreadCount > 0
                        ? 'bg-[#15273F] text-white border-[#5BD19B]/60 shadow-[0_0_10px_rgba(91,209,155,0.2)]'
                        : 'bg-[#111C2B] hover:bg-[#15273F] border-[#1F324B] text-zinc-300 hover:text-white'
                    }`}
                  >
                    <Bell size={16} className={unreadCount > 0 ? 'text-[#5BD19B]' : ''} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white font-bold text-[9px] flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {isNotifOpen && (
                    <div className="absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mt-2 w-80 sm:w-96 bg-[#0F1A28] border border-[#1F324B] rounded-2xl shadow-2xl p-4 z-50 animate-fadeIn">
                      <div className="flex items-center justify-between pb-3 border-b border-[#1F324B] mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold uppercase text-white tracking-wider flex items-center gap-1.5">
                            <Bell size={14} className="text-[#5BD19B]" /> Notifications
                          </h4>
                          {unreadCount > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5">
                          {unreadCount > 0 && onMarkAllNotificationsAsRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkAllNotificationsAsRead();
                              }}
                              className="text-[10px] text-zinc-400 hover:text-[#5BD19B] flex items-center gap-1 font-semibold transition-colors"
                              title="Mark all notifications as read"
                            >
                              <CheckCheck size={12} /> Mark read
                            </button>
                          )}
                          {notifications.length > 0 && onClearAllNotifications && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClearAllNotifications();
                              }}
                              className="text-[10px] text-zinc-400 hover:text-red-400 flex items-center gap-1 font-semibold transition-colors"
                              title="Clear all notifications"
                            >
                              <Trash2 size={12} /> Clear all
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-xs text-zinc-400 space-y-1">
                            <Sparkles size={24} className="mx-auto text-zinc-500 opacity-50 mb-1" />
                            <p className="font-semibold text-zinc-300">No match notifications yet</p>
                            <p className="text-[11px] text-zinc-500">Room codes and alerts for your registered games will appear here.</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => {
                                if (!notif.read && onMarkNotificationAsRead) {
                                  onMarkNotificationAsRead(notif.id);
                                }
                                if (notif.tournament_id) {
                                  navigate(`/tournament/${notif.tournament_id}`);
                                  setIsNotifOpen(false);
                                }
                              }}
                              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                !notif.read
                                  ? 'bg-[#15273F]/70 border-[#5BD19B]/40 hover:border-[#5BD19B]'
                                  : 'bg-[#0B131E] border-[#1F324B] hover:border-zinc-500 text-zinc-400'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  <span className="w-5 h-5 rounded bg-[#4D8EF7]/20 text-[#4D8EF7] flex items-center justify-center flex-shrink-0">
                                    <KeyRound size={11} />
                                  </span>
                                  <span className="font-bold text-white line-clamp-1">{notif.title}</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {!notif.read && (
                                    <span className="w-2 h-2 rounded-full bg-[#5BD19B] animate-pulse" />
                                  )}
                                  {onDeleteNotification && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteNotification(notif.id);
                                      }}
                                      title="Dismiss notification"
                                      className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition-colors"
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {notif.roomId && notif.roomPassword && (
                                <div className="mt-2 p-2 rounded-lg bg-[#070D14] border border-[#1F324B] flex items-center justify-between text-[11px] font-mono">
                                  <span className="text-zinc-300">
                                    ID: <strong className="text-white">{notif.roomId}</strong>
                                  </span>
                                  <span className="text-zinc-300">
                                    Pass: <strong className="text-[#5BD19B]">{notif.roomPassword}</strong>
                                  </span>
                                </div>
                              )}

                              {notif.instructions && (
                                <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">
                                  Note: {notif.instructions}
                                </p>
                              )}

                              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                                <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-[#5BD19B] flex items-center gap-0.5 font-bold">
                                  Enter Room <ExternalLink size={10} />
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {notifications.length > 0 && onClearAllNotifications && (
                        <div className="pt-2.5 mt-2 border-t border-[#1F324B] flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClearAllNotifications();
                            }}
                            className="text-[10px] text-zinc-400 hover:text-red-400 flex items-center gap-1 font-semibold transition-colors"
                          >
                            <Trash2 size={11} /> Clear all notifications
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Profile Pill & User Switcher Trigger */}
                <button
                  onClick={onOpenUserSwitcher || (() => navigate(isAdmin ? '/dashboard/organiser' : '/dashboard/player'))}
                  title="Switch user or profile"
                  className="flex items-center gap-2 p-1 sm:px-3 sm:py-1.5 rounded-lg bg-[#152234] hover:bg-[#1c2d46] border border-[#1F324B] transition-colors"
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center font-black text-xs ${
                    isAdmin ? 'bg-[#4D8EF7] text-[#0B131E]' : 'bg-[#5BD19B] text-[#0B131E]'
                  }`}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:flex flex-col text-left text-xs leading-tight">
                    <span className="font-bold text-white max-w-[100px] truncate">{user.username}</span>
                    <span className={`text-[10px] font-semibold uppercase ${
                      isAdmin ? 'text-[#4D8EF7]' : 'text-[#5BD19B]'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                </button>

                {/* Logout */}
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-[#152234] transition-colors"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
