import type { Tournament, Registration, ChatMessage, MatchStanding, WalletTransaction, User, Role, AppNotification, RoomUpdateResult, SentEmail, RegistrationResult, PaymentRequest, PaymentConfig, TeamMember } from '../types';
import { INITIAL_TOURNAMENTS } from '../data/mockData';
import { socketService } from './socketService';

const TOURNAMENTS_STORAGE_KEY = 'gearup_tournaments_v1';
const REGISTRATIONS_STORAGE_KEY = 'gearup_registrations_v1';

type Listener = () => void;
const listeners: Set<Listener> = new Set();

const notifyListeners = () => {
  listeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error('[Service] Listener callback error', e);
    }
  });
};

// In-memory cache synced with backend / localStorage
let cachedTournaments: Tournament[] = [];
let cachedRegistrations: Registration[] = [];

const loadInitial = () => {
  try {
    const rawT = localStorage.getItem(TOURNAMENTS_STORAGE_KEY);
    cachedTournaments = rawT ? JSON.parse(rawT) : INITIAL_TOURNAMENTS;

    if (Array.isArray(cachedTournaments)) {
      cachedTournaments = cachedTournaments.map(t => {
        const pool = Number(t.prize_pool) || (
          Array.isArray(t.prize_breakdown)
            ? t.prize_breakdown.reduce((sum, p) => sum + (Number(p.prize) || 0), 0)
            : 0
        );
        return {
          ...t,
          prize_pool: pool,
          prize_breakdown: Array.isArray(t.prize_breakdown) ? t.prize_breakdown : []
        };
      });
    }

    const rawR = localStorage.getItem(REGISTRATIONS_STORAGE_KEY);
    cachedRegistrations = rawR ? JSON.parse(rawR) : [];
  } catch {
    cachedTournaments = INITIAL_TOURNAMENTS;
    cachedRegistrations = [];
  }
};

loadInitial();

// Initialize socket listeners to keep local cache live
if (typeof window !== 'undefined') {
  socketService.init();

  socketService.onTournamentCreated((newTourney) => {
    const exists = cachedTournaments.some(t => t.id === newTourney.id);
    if (!exists) {
      cachedTournaments = [newTourney, ...cachedTournaments];
      localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
      notifyListeners();
    }
  });

  socketService.onTournamentUpdated((updated) => {
    const idx = cachedTournaments.findIndex(t => t.id === updated.id);
    if (idx !== -1) {
      cachedTournaments[idx] = updated;
    } else {
      cachedTournaments.unshift(updated);
    }
    localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
    notifyListeners();
  });

  socketService.onTournamentDeleted(({ id }) => {
    cachedTournaments = cachedTournaments.filter(t => t.id !== id);
    cachedRegistrations = cachedRegistrations.filter(r => r.tournament_id !== id);
    localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
    localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(cachedRegistrations));
    notifyListeners();
  });

  socketService.onTournamentRegistered((payload) => {
    const idx = cachedTournaments.findIndex(t => t.id === payload.tournamentId);
    if (idx !== -1) {
      cachedTournaments[idx].slots_filled = payload.slots_filled;
      localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
      notifyListeners();
    }
  });

  socketService.onStandingsUpdated((payload) => {
    const idx = cachedTournaments.findIndex(t => t.id === payload.tournament_id);
    if (idx !== -1) {
      cachedTournaments[idx].standings = payload.standings;
      localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
      notifyListeners();
    }
  });

  socketService.onRegistrationsUpdated((regs) => {
    cachedRegistrations = regs;
    localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(cachedRegistrations));
    notifyListeners();
  });

  // Cross-tab storage event listener
  window.addEventListener('storage', (e) => {
    if (e.key === TOURNAMENTS_STORAGE_KEY || e.key === REGISTRATIONS_STORAGE_KEY) {
      loadInitial();
      notifyListeners();
    }
  });
}

export const tournamentService = {
  async fetchUsers(requesterId: string): Promise<User[]> {
    const res = await fetch('/api/users', {
      headers: { 'x-user-id': requesterId }
    });
    if (!res.ok) throw new Error('Unable to load users');
    return res.json();
  },

  async registerUser(data: {
    username: string;
    email: string;
    password?: string;
    in_game_name?: string;
    phone?: string;
    role: Role;
  }): Promise<User> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Unable to register user');
    return result;
  },

  async loginUser(credentials: { identifier: string; password: string }): Promise<User> {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Invalid credentials');
    return result.user;
  },

  async updateUserRole(requesterId: string, userId: string, role: Role): Promise<User> {
    const res = await fetch(`/api/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': requesterId },
      body: JSON.stringify({ role })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Unable to update user role');
    return result;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getTournaments(): Tournament[] {
    return cachedTournaments;
  },

  getTournamentById(id: string): Tournament | null {
    return cachedTournaments.find(t => t.id === id) || null;
  },

  async fetchTournaments(): Promise<Tournament[]> {
    try {
      const res = await fetch('/api/tournaments');
      if (res.ok) {
        const data = await res.json();
        cachedTournaments = data;
        localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(data));
        notifyListeners();
        return data;
      }
    } catch {
      // Backend offline, fallback to cached
    }
    return cachedTournaments;
  },

  async createTournament(data: Omit<Tournament, 'id' | 'slots_filled'>): Promise<Tournament> {
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const created: Tournament = await res.json();
        cachedTournaments = [created, ...cachedTournaments.filter(t => t.id !== created.id)];
        localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
        notifyListeners();
        return created;
      }
    } catch {
      // Offline fallback
    }

    const fallback: Tournament = {
      ...data,
      id: `t-${Date.now()}`,
      slots_filled: 0,
      standings: []
    };
    cachedTournaments = [fallback, ...cachedTournaments];
    localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
    notifyListeners();
    return fallback;
  },

  async updateRoomCredentials(
    tournamentId: string,
    credentials: { roomId: string; roomPassword: string; instructions?: string; isReleased: boolean },
    requesterId?: string
  ): Promise<RoomUpdateResult> {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/room`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(requesterId ? { 'x-user-id': requesterId } : {})
        },
        body: JSON.stringify(credentials)
      });
      if (res.ok) {
        const data = await res.json();
        const updated = data.tournament || data;
        const index = cachedTournaments.findIndex(t => t.id === tournamentId);
        if (index !== -1) {
          cachedTournaments[index] = updated;
          localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
          notifyListeners();
        }
        return {
          success: true,
          tournament: updated,
          dispatched_count: data.dispatched_count,
          recipients: data.recipients
        };
      }
    } catch {
      // Offline fallback
    }

    const index = cachedTournaments.findIndex(t => t.id === tournamentId);
    if (index === -1) return { success: false };

    const updatedTournament: Tournament = {
      ...cachedTournaments[index],
      status: credentials.isReleased ? 'ROOM_RELEASED' : cachedTournaments[index].status,
      room_credential: {
        ...credentials,
        releasedAt: credentials.isReleased ? new Date().toISOString() : cachedTournaments[index].room_credential?.releasedAt
      }
    };
    cachedTournaments[index] = updatedTournament;
    localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
    notifyListeners();

    const registered = cachedRegistrations.filter(r => r.tournament_id === tournamentId);
    return {
      success: true,
      tournament: updatedTournament,
      dispatched_count: credentials.isReleased ? registered.length : 0,
      recipients: credentials.isReleased ? registered : []
    };
  },

  async updateTournamentStatus(tournamentId: string, status: Tournament['status']): Promise<boolean> {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated = await res.json();
        const idx = cachedTournaments.findIndex(t => t.id === tournamentId);
        if (idx !== -1) {
          cachedTournaments[idx] = updated;
          notifyListeners();
        }
        return true;
      }
    } catch {
      // Offline fallback
    }

    const idx = cachedTournaments.findIndex(t => t.id === tournamentId);
    if (idx !== -1) {
      cachedTournaments[idx].status = status;
      notifyListeners();
      return true;
    }
    return false;
  },

  async updateTournamentPrizes(
    tournamentId: string,
    prizes: { rank: string; prize: number }[]
  ): Promise<Tournament | null> {
    const totalPool = prizes.reduce((acc, p) => acc + (Number(p.prize) || 0), 0);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/prizes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prize_pool: totalPool,
          prize_breakdown: prizes
        })
      });
      if (res.ok) {
        const data = await res.json();
        const updated = data.tournament || data;
        const idx = cachedTournaments.findIndex(t => t.id === tournamentId);
        if (idx !== -1) {
          cachedTournaments[idx] = updated;
          localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
          notifyListeners();
        }
        return updated;
      }
    } catch {
      // Offline fallback
    }

    const idx = cachedTournaments.findIndex(t => t.id === tournamentId);
    if (idx !== -1) {
      cachedTournaments[idx].prize_breakdown = prizes;
      cachedTournaments[idx].prize_pool = totalPool;
      localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
      notifyListeners();
      return cachedTournaments[idx];
    }
    return null;
  },

  async registerForTournament(
    tournamentId: string,
    playerData: {
      user_id: string;
      player_ign: string;
      player_uid: string;
      phone: string;
      team_name?: string;
      teammates?: TeamMember[];
      email?: string;
    }
  ): Promise<RegistrationResult> {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData)
      });
      const result = await res.json();
      if (res.ok && result.registration) {
        cachedRegistrations = [result.registration, ...cachedRegistrations];
        localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(cachedRegistrations));
        const tIndex = cachedTournaments.findIndex(t => t.id === tournamentId);
        if (tIndex !== -1) {
          cachedTournaments[tIndex].slots_filled += 1;
          localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
        }
        notifyListeners();
        return result;
      }
      return result;
    } catch {
      // Offline fallback
    }

    const tourneyIndex = cachedTournaments.findIndex(t => t.id === tournamentId);
    if (tourneyIndex === -1) return { success: false, message: 'Tournament not found' };

    const tournament = cachedTournaments[tourneyIndex];
    if (tournament.slots_filled >= tournament.slots_total) {
      return { success: false, message: 'Tournament slots are already full' };
    }

    const existing = cachedRegistrations.find(
      r => r.tournament_id === tournamentId && r.user_id === playerData.user_id
    );
    if (existing) {
      return { success: false, message: 'You are already registered for this tournament' };
    }

    const newRegistration: Registration = {
      id: `reg-${Date.now()}`,
      tournament_id: tournament.id,
      tournament_title: tournament.title,
      game: tournament.game,
      user_id: playerData.user_id,
      email: playerData.email,
      player_ign: playerData.player_ign,
      player_uid: playerData.player_uid,
      phone: playerData.phone,
      team_name: playerData.team_name,
      teammates: playerData.teammates,
      registered_at: new Date().toISOString(),
      status: 'CONFIRMED'
    };

    cachedTournaments[tourneyIndex] = {
      ...tournament,
      slots_filled: tournament.slots_filled + 1
    };
    cachedRegistrations = [newRegistration, ...cachedRegistrations];

    localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
    localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(cachedRegistrations));
    notifyListeners();

    return {
      success: true,
      message: 'Registration successful! Confirmation SMS and email queued.',
      registration: newRegistration
    };
  },

  async fetchRegistrations(userId?: string): Promise<Registration[]> {
    try {
      const url = userId ? `/api/registrations?userId=${userId}` : '/api/registrations';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        cachedRegistrations = data;
        localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(data));
        notifyListeners();
        return data;
      }
    } catch {
      // Offline
    }
    return userId ? cachedRegistrations.filter(r => r.user_id === userId) : cachedRegistrations;
  },

  getAllRegistrations(): Registration[] {
    return cachedRegistrations;
  },

  async cancelRegistration(registrationId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/registrations/${registrationId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        cachedRegistrations = cachedRegistrations.filter(r => r.id !== registrationId);
        localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(cachedRegistrations));
        notifyListeners();
        return true;
      }
    } catch {
      // offline fallback
    }
    cachedRegistrations = cachedRegistrations.filter(r => r.id !== registrationId);
    localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(cachedRegistrations));
    notifyListeners();
    return true;
  },

  getUserRegistrations(userId: string): Registration[] {
    return cachedRegistrations.filter(r => r.user_id === userId);
  },

  isUserRegistered(tournamentId: string, userId: string): boolean {
    return cachedRegistrations.some(r => r.tournament_id === tournamentId && r.user_id === userId);
  },

  // Live Chat API
  async fetchChatMessages(tournamentId: string): Promise<ChatMessage[]> {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/chat`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return [];
  },

  async sendChatMessage(tournamentId: string, data: {
    user_id: string;
    username: string;
    role: string;
    message: string;
    is_announcement?: boolean;
  }): Promise<ChatMessage | null> {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback via socket
      socketService.sendChatMessage({ ...data, tournament_id: tournamentId });
    }
    return null;
  },

  // Standings API
  async fetchStandings(tournamentId: string): Promise<MatchStanding[]> {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/standings`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    const t = this.getTournamentById(tournamentId);
    return t?.standings || [];
  },

  async updateStandings(tournamentId: string, standings: MatchStanding[]): Promise<boolean> {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/standings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ standings })
      });
      if (res.ok) return true;
    } catch {
      // fallback
    }
    const idx = cachedTournaments.findIndex(t => t.id === tournamentId);
    if (idx !== -1) {
      cachedTournaments[idx].standings = standings;
      localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
      notifyListeners();
      return true;
    }
    return false;
  },

  // Wallet API
  async getWallet(userId: string): Promise<{ balance: number; transactions: WalletTransaction[] }> {
    try {
      const res = await fetch(`/api/wallet/${userId}`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return { balance: 0, transactions: [] };
  },

  async topupWallet(userId: string, amount: number, paymentMethod: string): Promise<{ success: boolean; balance: number }> {
    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount, paymentMethod })
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, balance: data.balance };
      }
    } catch {
      // fallback
    }
    return { success: true, balance: 0 + amount };
  },

  async getPaymentConfig(): Promise<PaymentConfig> {
    try {
      const res = await fetch('/api/payment-config');
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return { upi_id: '6303134462@axl', payee_name: 'GearUp Esports' };
  },

  async updatePaymentConfig(config: PaymentConfig): Promise<{ success: boolean; config?: PaymentConfig; error?: string }> {
    try {
      const res = await fetch('/api/payment-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, config: data.config };
      }
      return { success: false, error: data.error || 'Failed to update payment settings' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error updating payment configuration';
      return { success: false, error: msg };
    }
  },

  async submitUtr(data: { userId: string; amount: number; utr_number: string }): Promise<{ success: boolean; message?: string; error?: string; request?: PaymentRequest }> {
    try {
      const res = await fetch('/api/wallet/submit-utr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (res.ok) {
        return { success: true, message: result.message, request: result.request };
      }
      return { success: false, error: result.error || 'Failed to submit UTR' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error submitting UTR';
      return { success: false, error: msg };
    }
  },

  async getPaymentRequests(status?: string, userId?: string): Promise<PaymentRequest[]> {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (userId) params.append('userId', userId);
      const url = `/api/wallet/requests${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
    } catch {
      // fallback
    }
    return [];
  },

  async approvePaymentRequest(requestId: string): Promise<{ success: boolean; new_balance?: number; error?: string }> {
    try {
      const res = await fetch(`/api/wallet/requests/${requestId}/approve`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (res.ok) {
        notifyListeners();
        return { success: true, new_balance: data.new_balance };
      }
      return { success: false, error: data.error || 'Failed to approve request' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error approving request';
      return { success: false, error: msg };
    }
  },

  async rejectPaymentRequest(requestId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/wallet/requests/${requestId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (res.ok) {
        notifyListeners();
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to reject request' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error rejecting request';
      return { success: false, error: msg };
    }
  },

  // In-App Notifications API
  async fetchNotifications(userId: string): Promise<AppNotification[]> {
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline
    }
    return [];
  },

  async markNotificationAsRead(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT'
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async clearAllNotifications(userId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/notifications/clear-all?userId=${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async deleteNotification(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async fetchSentEmails(recipient?: string): Promise<SentEmail[]> {
    try {
      const url = recipient ? `/api/emails?recipient=${encodeURIComponent(recipient)}` : '/api/emails';
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Failed to fetch sent emails:', err);
    }
    return [];
  },

  async toggleHideCompleted(hide?: boolean): Promise<{ success: boolean; hide_completed: boolean; tournaments: Tournament[] }> {
    try {
      const res = await fetch('/api/tournaments/toggle-hide-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hide })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tournaments)) {
          cachedTournaments = data.tournaments;
          localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
          notifyListeners();
        }
        return data;
      }
    } catch {
      // fallback
    }

    const currentHidden = cachedTournaments.some(t => t.status === 'COMPLETED' && t.is_hidden);
    const newHide = hide !== undefined ? hide : !currentHidden;
    cachedTournaments = cachedTournaments.map(t => {
      if (t.status === 'COMPLETED') {
        return { ...t, is_hidden: newHide };
      }
      return t;
    });
    localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
    notifyListeners();
    return { success: true, hide_completed: newHide, tournaments: cachedTournaments };
  },

  async toggleTournamentVisibility(tournamentId: string, is_hidden: boolean): Promise<{ success: boolean; tournament?: Tournament }> {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden })
      });
      if (res.ok) {
        const data = await res.json();
        const idx = cachedTournaments.findIndex(t => t.id === tournamentId);
        if (idx !== -1 && data.tournament) {
          cachedTournaments[idx] = data.tournament;
          localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
          notifyListeners();
        }
        return data;
      }
    } catch {
      // fallback
    }

    const idx = cachedTournaments.findIndex(t => t.id === tournamentId);
    if (idx !== -1) {
      cachedTournaments[idx].is_hidden = is_hidden;
      localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
      notifyListeners();
      return { success: true, tournament: cachedTournaments[idx] };
    }
    return { success: false };
  },

  async deleteTournament(tournamentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        cachedTournaments = cachedTournaments.filter(t => t.id !== tournamentId);
        cachedRegistrations = cachedRegistrations.filter(r => r.tournament_id !== tournamentId);
        localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
        localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(cachedRegistrations));
        notifyListeners();
        return { success: true };
      }
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || 'Failed to delete tournament' };
    } catch {
      // Offline fallback
    }

    cachedTournaments = cachedTournaments.filter(t => t.id !== tournamentId);
    cachedRegistrations = cachedRegistrations.filter(r => r.tournament_id !== tournamentId);
    localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(cachedTournaments));
    localStorage.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(cachedRegistrations));
    notifyListeners();
    return { success: true };
  },

  resetToDefaults(): void {
    localStorage.removeItem(TOURNAMENTS_STORAGE_KEY);
    localStorage.removeItem(REGISTRATIONS_STORAGE_KEY);
    loadInitial();
    notifyListeners();
  }
};
