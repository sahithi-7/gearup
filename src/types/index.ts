export type Role = 'PLAYER' | 'ORGANISER' | 'ADMIN';

export type TournamentStatus = 'REGISTRATION_OPEN' | 'ROOM_RELEASED' | 'LIVE' | 'COMPLETED';

export type TournamentGame = 'BGMI' | 'Free Fire MAX';

export type GameType = TournamentGame | 'All';

export type FormatType = 'Solo' | 'Duo' | 'Squad';

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  role: Role;
  is_admin?: boolean;
  in_game_name?: string;
  phone?: string;
  wallet_balance: number;
}

export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface RegisterUserData {
  username: string;
  email: string;
  password?: string;
  in_game_name?: string;
  phone?: string;
  role?: Role;
}

export interface RoomCredential {
  roomId: string;
  roomPassword: string;
  releasedAt?: string;
  instructions?: string;
  isReleased: boolean;
}

export interface PrizeBreakdown {
  rank: string;
  prize: number;
}

export interface MatchStanding {
  rank: number;
  team_name: string;
  player_names?: string;
  kills: number;
  points: number;
  prize_amount?: number;
}

export interface Tournament {
  id: string;
  title: string;
  game: TournamentGame;
  format: FormatType;
  organiser_name: string;
  date: string;
  time: string;
  entry_fee: number;
  prize_pool: number;
  slots_total: number;
  slots_filled: number;
  status: TournamentStatus;
  banner_url: string;
  map: string;
  rules: string;
  room_credential?: RoomCredential;
  prize_breakdown: PrizeBreakdown[];
  standings?: MatchStanding[];
  is_hidden?: boolean;
}

export interface TeamMember {
  name: string;
  uid: string;
}

export interface Registration {
  id: string;
  tournament_id: string;
  tournament_title: string;
  game: string;
  user_id: string;
  email?: string;
  player_ign: string;
  player_uid: string;
  phone: string;
  team_name?: string;
  teammates?: TeamMember[];
  registered_at: string;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED';
}

export interface ChatMessage {
  id: string;
  tournament_id: string;
  user_id: string;
  username: string;
  role: Role;
  message: string;
  timestamp: string;
  is_announcement?: boolean;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'DEPOSIT' | 'ENTRY_FEE' | 'PRIZE_PAYOUT' | 'PRIZE' | 'WITHDRAWAL';
  amount: number;
  description: string;
  timestamp: string;
  status: 'COMPLETED' | 'PENDING' | 'REJECTED';
}

export interface BroadcastAlert {
  tournament_id: string;
  tournament_title: string;
  game: string;
  roomId: string;
  roomPassword: string;
  instructions?: string;
  timestamp: string;
  recipients_count?: number;
  registered_user_ids?: string[];
}

export interface AppNotification {
  id: string;
  user_id: string;
  tournament_id: string;
  tournament_title: string;
  game: string;
  type: 'ROOM_CREDENTIALS' | 'SYSTEM';
  title: string;
  message: string;
  roomId?: string;
  roomPassword?: string;
  instructions?: string;
  timestamp: string;
  read: boolean;
}

export interface RoomUpdateResult {
  success: boolean;
  tournament?: Tournament;
  dispatched_count?: number;
  recipients?: Registration[];
}

export interface SentEmail {
  id: string;
  type: 'TOURNAMENT_REGISTRATION' | 'ACCOUNT_REGISTRATION';
  recipient: string;
  subject: string;
  tournament_id?: string;
  tournament_title?: string;
  player_ign?: string;
  timestamp: string;
  preview_url?: string | null;
  status: 'SENT' | 'FAILED';
  local_preview_url: string;
}

export interface RegistrationResult {
  success: boolean;
  message: string;
  registration?: Registration;
  wallet_balance?: number;
  email_sent?: boolean;
  email?: string;
  preview_url?: string | null;
}

export interface PaymentRequest {
  id: string;
  user_id: string;
  username: string;
  player_ign: string;
  phone?: string;
  amount: number;
  utr_number: string;
  payment_method: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submitted_at: string;
  approved_at?: string;
  rejection_reason?: string;
}

export interface PaymentConfig {
  upi_id: string;
  payee_name: string;
}
