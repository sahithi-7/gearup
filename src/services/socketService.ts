import { io, Socket } from 'socket.io-client';
import type { Tournament, BroadcastAlert, ChatMessage, MatchStanding, Registration, PaymentRequest, PaymentConfig } from '../types';

type EventCallback<T> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private usersCountListeners: Set<EventCallback<number>> = new Set();
  private tournamentCreatedListeners: Set<EventCallback<Tournament>> = new Set();
  private tournamentUpdatedListeners: Set<EventCallback<Tournament>> = new Set();
  private tournamentDeletedListeners: Set<EventCallback<{ id: string }>> = new Set();
  private tournamentRegisteredListeners: Set<EventCallback<{ tournamentId: string; slots_filled: number; slots_total: number }>> = new Set();
  private registrationsUpdatedListeners: Set<EventCallback<Registration[]>> = new Set();
  private paymentRequestsUpdatedListeners: Set<EventCallback<PaymentRequest[]>> = new Set();
  private paymentConfigUpdatedListeners: Set<EventCallback<PaymentConfig>> = new Set();
  private walletUpdatedListeners: Set<EventCallback<{ userId: string; balance: number }>> = new Set();
  private roomBroadcastListeners: Set<EventCallback<BroadcastAlert>> = new Set();
  private roomCredentialsSentListeners: Set<EventCallback<BroadcastAlert>> = new Set();
  private chatMessageListeners: Set<EventCallback<ChatMessage>> = new Set();
  private standingsUpdatedListeners: Set<EventCallback<{ tournament_id: string; standings: MatchStanding[] }>> = new Set();

  private isConnectedState = false;

  init(): Socket {
    if (this.socket) return this.socket;

    // Connect to same origin, which Vite proxies to port 3001
    this.socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.isConnectedState = true;
      console.log('[Socket] Connected to real-time server with ID:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      this.isConnectedState = false;
      console.log('[Socket] Disconnected from real-time server');
    });

    this.socket.on('users:count', (count: number) => {
      this.usersCountListeners.forEach(cb => cb(count));
    });

    this.socket.on('tournament:created', (tournament: Tournament) => {
      this.tournamentCreatedListeners.forEach(cb => cb(tournament));
    });

    this.socket.on('tournament:updated', (tournament: Tournament) => {
      this.tournamentUpdatedListeners.forEach(cb => cb(tournament));
    });

    this.socket.on('tournament:deleted', (data: { id: string }) => {
      this.tournamentDeletedListeners.forEach(cb => cb(data));
    });

    this.socket.on('tournament:registered', (payload: { tournamentId: string; slots_filled: number; slots_total: number }) => {
      this.tournamentRegisteredListeners.forEach(cb => cb(payload));
    });

    this.socket.on('registrations:updated', (registrations: Registration[]) => {
      this.registrationsUpdatedListeners.forEach(cb => cb(registrations));
    });

    this.socket.on('payment:requests_updated', (requests: PaymentRequest[]) => {
      this.paymentRequestsUpdatedListeners.forEach(cb => cb(requests));
    });

    this.socket.on('payment:config_updated', (config: PaymentConfig) => {
      this.paymentConfigUpdatedListeners.forEach(cb => cb(config));
    });

    this.socket.on('wallet:updated', (payload: { userId: string; balance: number }) => {
      this.walletUpdatedListeners.forEach(cb => cb(payload));
    });

    this.socket.on('room:broadcast', (alert: BroadcastAlert) => {
      this.roomBroadcastListeners.forEach(cb => cb(alert));
    });

    this.socket.on('room:credentials_sent', (alert: BroadcastAlert) => {
      this.roomCredentialsSentListeners.forEach(cb => cb(alert));
    });

    this.socket.on('chat:message', (msg: ChatMessage) => {
      this.chatMessageListeners.forEach(cb => cb(msg));
    });

    this.socket.on('standings:updated', (payload: { tournament_id: string; standings: MatchStanding[] }) => {
      this.standingsUpdatedListeners.forEach(cb => cb(payload));
    });

    return this.socket;
  }

  isConnected(): boolean {
    return this.isConnectedState;
  }

  joinTournament(tournamentId: string): void {
    this.init().emit('join_tournament', tournamentId);
  }

  leaveTournament(tournamentId: string): void {
    this.init().emit('leave_tournament', tournamentId);
  }

  sendChatMessage(data: {
    tournament_id: string;
    user_id: string;
    username: string;
    role: string;
    message: string;
    is_announcement?: boolean;
  }): void {
    this.init().emit('send_chat', data);
  }

  registerUser(userId: string): void {
    this.init().emit('register_user', userId);
  }

  unregisterUser(userId: string): void {
    this.init().emit('unregister_user', userId);
  }

  onUsersCount(cb: EventCallback<number>): () => void {
    this.usersCountListeners.add(cb);
    return () => this.usersCountListeners.delete(cb);
  }

  onTournamentCreated(cb: EventCallback<Tournament>): () => void {
    this.tournamentCreatedListeners.add(cb);
    return () => this.tournamentCreatedListeners.delete(cb);
  }

  onTournamentUpdated(cb: EventCallback<Tournament>): () => void {
    this.tournamentUpdatedListeners.add(cb);
    return () => this.tournamentUpdatedListeners.delete(cb);
  }

  onTournamentDeleted(cb: EventCallback<{ id: string }>): () => void {
    this.tournamentDeletedListeners.add(cb);
    return () => this.tournamentDeletedListeners.delete(cb);
  }

  onTournamentRegistered(cb: EventCallback<{ tournamentId: string; slots_filled: number; slots_total: number }>): () => void {
    this.tournamentRegisteredListeners.add(cb);
    return () => this.tournamentRegisteredListeners.delete(cb);
  }

  onRoomBroadcast(cb: EventCallback<BroadcastAlert>): () => void {
    this.roomBroadcastListeners.add(cb);
    return () => this.roomBroadcastListeners.delete(cb);
  }

  onRoomCredentialsSent(cb: EventCallback<BroadcastAlert>): () => void {
    this.roomCredentialsSentListeners.add(cb);
    return () => this.roomCredentialsSentListeners.delete(cb);
  }

  onChatMessage(cb: EventCallback<ChatMessage>): () => void {
    this.chatMessageListeners.add(cb);
    return () => this.chatMessageListeners.delete(cb);
  }

  onStandingsUpdated(cb: EventCallback<{ tournament_id: string; standings: MatchStanding[] }>): () => void {
    this.standingsUpdatedListeners.add(cb);
    return () => this.standingsUpdatedListeners.delete(cb);
  }

  onRegistrationsUpdated(cb: EventCallback<Registration[]>): () => void {
    this.registrationsUpdatedListeners.add(cb);
    return () => this.registrationsUpdatedListeners.delete(cb);
  }

  onPaymentRequestsUpdated(cb: EventCallback<PaymentRequest[]>): () => void {
    this.paymentRequestsUpdatedListeners.add(cb);
    return () => this.paymentRequestsUpdatedListeners.delete(cb);
  }

  onPaymentConfigUpdated(cb: EventCallback<PaymentConfig>): () => void {
    this.paymentConfigUpdatedListeners.add(cb);
    return () => this.paymentConfigUpdatedListeners.delete(cb);
  }

  onWalletUpdated(cb: EventCallback<{ userId: string; balance: number }>): () => void {
    this.walletUpdatedListeners.add(cb);
    return () => this.walletUpdatedListeners.delete(cb);
  }
}

export const socketService = new SocketService();
