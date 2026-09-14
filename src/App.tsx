import { useState, useEffect } from 'react';
import type { User, Tournament, Registration, BroadcastAlert, AppNotification, TeamMember } from './types';
import { tournamentService } from './services/tournamentService';
import { socketService } from './services/socketService';
import { soundFx } from './utils/sound';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { Footer } from './components/layout/Footer';
import { BroadcastNotificationBanner } from './components/layout/BroadcastNotificationBanner';
import { UserSwitcherModal } from './components/layout/UserSwitcherModal';
import { AddCashModal } from './components/wallet/AddCashModal';
import { HomeView } from './views/HomeView';
import { MarketplaceView } from './views/MarketplaceView';
import { TournamentDetailsView } from './views/TournamentDetailsView';
import { PlayerDashboard } from './views/PlayerDashboard';
import { OrganiserPortal } from './views/OrganiserPortal';
import { RegistrationModal } from './components/tournaments/RegistrationModal';
import { RegisterView } from './views/RegisterView';
import { LoginModal } from './components/auth/LoginModal';
import { Button } from './components/common/Button';
import { ShieldAlert } from 'lucide-react';

const USER_SESSION_KEY = 'gearup_user_session_v1';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [tournaments, setTournaments] = useState<Tournament[]>(tournamentService.getTournaments());
  
  // Initial user state from localStorage (null for guests)
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(USER_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id && parsed.id !== 'u-admin-1') return parsed;
      }
    } catch {
      // fallback
    }
    return null;
  });
  const isAdmin = Boolean(user?.is_admin || user?.role === 'ADMIN');

  const [registrations, setRegistrations] = useState<Registration[]>(
    user ? tournamentService.getUserRegistrations(user.id) : []
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [registrationModalTournament, setRegistrationModalTournament] = useState<Tournament | null>(null);
  const [broadcastAlert, setBroadcastAlert] = useState<BroadcastAlert | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [isAddCashOpen, setIsAddCashOpen] = useState(false);
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Sync user changes to localStorage and fetch wallet & notifications
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
      socketService.registerUser(user.id);
      tournamentService.getWallet(user.id).then(w => {
        if (w && w.balance !== undefined && w.balance !== user.wallet_balance) {
          setUser(prev => prev ? { ...prev, wallet_balance: w.balance } : null);
        }
      });
      tournamentService.fetchNotifications(user.id).then(notifs => {
        if (notifs) setNotifications(notifs);
      });
    } else {
      localStorage.removeItem(USER_SESSION_KEY);
    }
  }, [user]);

  // Initial fetch from backend REST API & socket initialization
  useEffect(() => {
    tournamentService.fetchTournaments().then(data => {
      if (data) setTournaments(data);
    });

    if (user) {
      tournamentService.fetchRegistrations(user.id).then(regs => {
        if (regs) setRegistrations(regs);
      });
      tournamentService.fetchNotifications(user.id).then(notifs => {
        if (notifs) setNotifications(notifs);
      });
    }

    // Subscribe to tournament service updates
    const unsubService = tournamentService.subscribe(() => {
      setTournaments([...tournamentService.getTournaments()]);
      if (user) {
        setRegistrations([...tournamentService.getUserRegistrations(user.id)]);
      }
    });

    // Real-time socket events
    const unsubUsers = socketService.onUsersCount((count) => {
      setOnlineCount(count);
    });

    // Targeted Room Credentials Alert handler
    const handleIncomingRoomAlert = (alert: BroadcastAlert) => {
      if (!user) return;
      const isPrivileged = user.role === 'ORGANISER' || user.is_admin;
      const isTargetedUser = alert.registered_user_ids && alert.registered_user_ids.includes(user.id);
      const isUserRegisteredLocally = tournamentService.getUserRegistrations(user.id).some(
        r => r.tournament_id === alert.tournament_id || r.game === alert.game
      );

      // Only show room credentials to users registered for this match/game or organizers/admins
      if (isPrivileged || isTargetedUser || isUserRegisteredLocally) {
        soundFx.playRoomUnlock();
        setBroadcastAlert(alert);
        tournamentService.fetchNotifications(user.id).then(notifs => {
          if (notifs) setNotifications(notifs);
        });
      }
    };

    const unsubBroadcast = socketService.onRoomBroadcast(handleIncomingRoomAlert);
    const unsubSent = socketService.onRoomCredentialsSent(handleIncomingRoomAlert);

    return () => {
      unsubService();
      unsubUsers();
      unsubBroadcast();
      unsubSent();
    };
  }, [user]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLogin = () => {
    setIsLoginModalOpen(true);
  };

  const handleLoginSubmit = async (credentials: { identifier: string; password: string }): Promise<User> => {
    const authenticated = await tournamentService.loginUser(credentials);
    setUser(authenticated);
    soundFx.playSuccess();
    if (authenticated.role === 'ADMIN' || authenticated.role === 'ORGANISER') {
      navigate('/dashboard/organiser');
    } else {
      navigate('/dashboard/player');
    }
    return authenticated;
  };

  const handleLogout = () => {
    setUser(null);
    setRegistrations([]);
    setNotifications([]);
    navigate('/');
  };

  const handleSelectUser = (selectedUser: User) => {
    setUser(selectedUser);
    setRegistrations(tournamentService.getUserRegistrations(selectedUser.id));
    if (selectedUser.role === 'ORGANISER' || selectedUser.is_admin) {
      navigate('/dashboard/organiser');
    } else {
      navigate('/dashboard/player');
    }
  };

  const handleRegisteredUser = (registeredUser: User) => {
    setUser(registeredUser);
    setRegistrations([]);
    navigate(registeredUser.role === 'ORGANISER' || registeredUser.is_admin ? '/dashboard/organiser' : '/dashboard/player');
  };

  const handleOpenRegistration = (tournament: Tournament) => {
    if (tournament.status === 'COMPLETED') {
      navigate(`/tournament/${tournament.id}`);
      return;
    }
    if (!user) {
      handleOpenLogin();
      return;
    }
    setRegistrationModalTournament(tournament);
  };

  const handleCompleteRegistration = async (data: {
    player_ign: string;
    player_uid: string;
    phone: string;
    team_name?: string;
    teammates?: TeamMember[];
    email?: string;
  }) => {
    if (!registrationModalTournament || !user) return;

    const res = await tournamentService.registerForTournament(registrationModalTournament.id, {
      user_id: user.id,
      player_ign: data.player_ign,
      player_uid: data.player_uid,
      phone: data.phone,
      team_name: data.team_name,
      teammates: data.teammates,
      email: data.email || user.email
    });

    if (res.success) {
      soundFx.playSuccess();
      if (res.wallet_balance !== undefined) {
        setUser(prev => prev ? { ...prev, wallet_balance: res.wallet_balance! } : null);
      } else if (registrationModalTournament.entry_fee > 0) {
        setUser(prev => prev ? {
          ...prev,
          wallet_balance: Math.max(0, prev.wallet_balance - registrationModalTournament.entry_fee)
        } : null);
      }
    }
    return res;
  };

  const handleCreateTournament = (data: Omit<Tournament, 'id' | 'slots_filled'>) => {
    tournamentService.createTournament(data);
  };

  const handleUpdateRoom = (
    tournamentId: string,
    credentials: { roomId: string; roomPassword: string; instructions?: string; isReleased: boolean }
  ) => {
    tournamentService.updateRoomCredentials(tournamentId, credentials, user?.id);
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    await tournamentService.markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllNotificationsAsRead = async () => {
    if (!user) return;
    await tournamentService.markAllNotificationsAsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAllNotifications = async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setNotifications([]);
    await tournamentService.clearAllNotifications(user.id);
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await tournamentService.deleteNotification(id);
  };

  const isUserRegistered = (tournamentId: string) => {
    if (!user) return false;
    return registrations.some(r => r.tournament_id === tournamentId);
  };

  // Tournaments visible to the current user:
  // If user is Admin, they can view all tournaments (including hidden ones).
  // If user is a normal player or guest, hide any tournament marked as is_hidden.
  const visibleTournaments = isAdmin
    ? tournaments
    : tournaments.filter(t => !t.is_hidden);

  // Router View Renderer
  const renderView = () => {
    if (currentPath === '/') {
      return (
        <HomeView
          tournaments={visibleTournaments}
          user={user}
          navigate={navigate}
          onOpenRegistration={handleOpenRegistration}
          isUserRegistered={isUserRegistered}
        />
      );
    }

    if (currentPath === '/tournaments') {
      return (
        <MarketplaceView
          tournaments={visibleTournaments}
          user={user}
          navigate={navigate}
          onOpenRegistration={handleOpenRegistration}
          isUserRegistered={isUserRegistered}
        />
      );
    }

    if (currentPath === '/register') {
      return (
        <RegisterView
          navigate={navigate}
          onRegistered={handleRegisteredUser}
          onOpenLogin={() => setIsLoginModalOpen(true)}
        />
      );
    }

    if (currentPath.startsWith('/tournament/')) {
      const id = currentPath.split('/')[2];
      const tournament = tournamentService.getTournamentById(id);
      if (!tournament || (!isAdmin && tournament.is_hidden)) {
        return (
          <div className="max-w-md mx-auto px-4 py-20 text-center space-y-3">
            <h2 className="text-2xl font-black font-display uppercase text-white">Tournament Not Available</h2>
            <p className="text-xs text-zinc-400">This tournament has concluded and was hidden from public view by the admin.</p>
            <button
              onClick={() => navigate('/tournaments')}
              className="text-xs font-bold text-[#5BD19B] underline uppercase"
            >
              Browse Open Tournaments
            </button>
          </div>
        );
      }

      return (
        <TournamentDetailsView
          tournament={tournament}
          user={user}
          navigate={navigate}
          onOpenRegistration={handleOpenRegistration}
          isRegistered={isUserRegistered(tournament.id)}
        />
      );
    }

    if (currentPath === '/dashboard/player') {
      return (
        <PlayerDashboard
          user={user}
          registrations={registrations}
          tournaments={visibleTournaments}
          navigate={navigate}
          onLogin={handleOpenLogin}
          onOpenAddCash={() => setIsAddCashOpen(true)}
        />
      );
    }

    if (currentPath === '/dashboard/organiser') {
      if (!isAdmin) {
        return (
          <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-2xl font-black font-display uppercase text-white">Admin Access Only</h2>
            <p className="text-xs text-zinc-400">
              The Organiser Portal is restricted to platform administrators. Please sign in with an Admin account.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="primary" size="sm" onClick={() => setIsLoginModalOpen(true)}>
                Sign In as Admin
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </div>
          </div>
        );
      }
      return (
        <OrganiserPortal
          tournaments={tournaments}
          onCreateTournament={handleCreateTournament}
          onUpdateRoom={handleUpdateRoom}
          navigate={navigate}
          user={user}
        />
      );
    }

    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-3">
        <h2 className="text-3xl font-black font-display uppercase text-white">404 - Page Not Found</h2>
        <p className="text-xs text-zinc-400">Looks like you ventured outside the arena lobby.</p>
        <button
          onClick={() => navigate('/')}
          className="text-xs font-bold text-[#5BD19B] underline uppercase font-display"
        >
          Return to Arena Home
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B131E] text-zinc-100 flex flex-col font-sans selection:bg-[#5BD19B] selection:text-black">
      {/* Real-Time Incoming Broadcast Alert Banner */}
      <BroadcastNotificationBanner
        alert={broadcastAlert}
        onClose={() => setBroadcastAlert(null)}
        onNavigateToTournament={(tId) => navigate(`/tournament/${tId}`)}
      />

      {/* Top Header */}
      <Navbar
        currentPath={currentPath}
        navigate={navigate}
        user={user}
        onLogin={handleOpenLogin}
        onRegister={() => navigate('/register')}
        onLogout={handleLogout}
        onlineCount={onlineCount}
        onOpenAddCash={() => setIsAddCashOpen(true)}
        onOpenUserSwitcher={() => setIsUserSwitcherOpen(true)}
        notifications={notifications}
        onMarkNotificationAsRead={handleMarkNotificationAsRead}
        onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
        onClearAllNotifications={handleClearAllNotifications}
        onDeleteNotification={handleDeleteNotification}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full">
        {renderView()}
      </main>

      {/* Mobile Sticky Bottom Nav */}
      <BottomNav
        currentPath={currentPath}
        navigate={navigate}
        registeredCount={registrations.length}
        isAdmin={isAdmin}
      />

      {/* Footer */}
      <Footer navigate={navigate} isAdmin={isAdmin} />

      {/* Registration Bottom Sheet Modal */}
      {registrationModalTournament && (
        <RegistrationModal
          tournament={registrationModalTournament}
          user={user}
          isOpen={Boolean(registrationModalTournament)}
          onClose={() => setRegistrationModalTournament(null)}
          onSubmit={handleCompleteRegistration}
        />
      )}

      {/* Add Cash Wallet Modal */}
      <AddCashModal
        isOpen={isAddCashOpen}
        user={user}
        onClose={() => setIsAddCashOpen(false)}
        onSuccess={(newBal) => {
          setUser(prev => prev ? { ...prev, wallet_balance: newBal } : null);
        }}
      />

      {/* Multiplayer User Switcher Modal */}
      <UserSwitcherModal
        isOpen={isUserSwitcherOpen}
        currentUser={user}
        onClose={() => setIsUserSwitcherOpen(false)}
        onSelectUser={handleSelectUser}
      />

      {/* Login Authentication Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLoginSubmit}
        onNavigateToRegister={() => {
          setIsLoginModalOpen(false);
          navigate('/register');
        }}
      />
    </div>
  );
}
