import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import type { Tournament, TournamentGame, FormatType, MatchStanding, User, Registration, PaymentRequest, PaymentConfig } from '../types';
import { tournamentService } from '../services/tournamentService';
import { socketService } from '../services/socketService';
import { soundFx } from '../utils/sound';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  Shield,
  Plus,
  Radio,
  Users,
  Trophy,
  CheckCircle2,
  Calendar,
  X,
  Send,
  PlayCircle,
  Flag,
  Lock,
  BellRing,
  Award,
  Crown,
  Eye,
  EyeOff,
  Search,
  Copy,
  Check,
  Trash2,
  Mail,
  Phone,
  Filter,
  RefreshCw,
  ExternalLink,
  UserCheck,
  IndianRupee,
  CreditCard,
  XCircle,
  Clock,
  QrCode,
  AlertTriangle
} from 'lucide-react';

interface OrganiserPortalProps {
  tournaments: Tournament[];
  onCreateTournament: (tournament: Omit<Tournament, 'id' | 'slots_filled'>) => void;
  onUpdateRoom: (tournamentId: string, credentials: { roomId: string; roomPassword: string; instructions?: string; isReleased: boolean }) => void;
  navigate: (path: string) => void;
  user?: User | null;
}

export const OrganiserPortal: React.FC<OrganiserPortalProps> = ({
  tournaments,
  onCreateTournament,
  onUpdateRoom,
  navigate,
  user
}) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'registrations' | 'payments' | 'create' | 'standings'>('manage');
  const [manageStatusFilter, setManageStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

  // Registrations Dashboard State
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>(() => tournamentService.getAllRegistrations());
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [regSearch, setRegSearch] = useState('');
  const [selectedTournamentFilter, setSelectedTournamentFilter] = useState<string>('ALL');
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAllUids, setCopiedAllUids] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<string | null>(null);

  // Payment Approvals State
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({ upi_id: '6303134462@axl', payee_name: 'GearUp Esports' });
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [approvingPaymentId, setApprovingPaymentId] = useState<string | null>(null);
  const [copiedUtrId, setCopiedUtrId] = useState<string | null>(null);
  const [copiedAdminUpi, setCopiedAdminUpi] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<PaymentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('Payment could not be verified in bank records');
  const [isRejecting, setIsRejecting] = useState(false);
  const [paymentActionMessage, setPaymentActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Edit Admin UPI Modal State
  const [isEditUpiModalOpen, setIsEditUpiModalOpen] = useState(false);
  const [editUpiId, setEditUpiId] = useState('6303134462@axl');
  const [editPayeeName, setEditPayeeName] = useState('GearUp Esports');
  const [editUpiQrPreview, setEditUpiQrPreview] = useState<string>('');
  const [isSavingUpiConfig, setIsSavingUpiConfig] = useState(false);
  const [editUpiError, setEditUpiError] = useState<string | null>(null);

  const openEditUpiModal = () => {
    setEditUpiId(paymentConfig.upi_id || '6303134462@axl');
    setEditPayeeName(paymentConfig.payee_name || 'GearUp Esports');
    setEditUpiError(null);
    setIsEditUpiModalOpen(true);
  };

  useEffect(() => {
    if (isEditUpiModalOpen && editUpiId.trim()) {
      const intentUrl = `upi://pay?pa=${encodeURIComponent(editUpiId.trim())}&pn=${encodeURIComponent(editPayeeName.trim() || 'GearUp Esports')}&cu=INR&tn=GearUp%20Wallet%20TopUp`;
      QRCode.toDataURL(intentUrl, {
        width: 220,
        margin: 1,
        color: {
          dark: '#0B131E',
          light: '#FFFFFF'
        }
      })
        .then(url => setEditUpiQrPreview(url))
        .catch(err => console.error('Failed to generate preview QR', err));
    }
  }, [isEditUpiModalOpen, editUpiId, editPayeeName]);

  const handleSaveUpiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUpi = editUpiId.trim();
    const cleanName = editPayeeName.trim() || 'GearUp Esports';

    if (!cleanUpi || !cleanUpi.includes('@')) {
      setEditUpiError('Please enter a valid UPI ID format (e.g. 6303134462@axl or yourname@okhdfcbank)');
      return;
    }

    setIsSavingUpiConfig(true);
    setEditUpiError(null);
    try {
      const res = await tournamentService.updatePaymentConfig({
        upi_id: cleanUpi,
        payee_name: cleanName
      });
      if (res.success && res.config) {
        setPaymentConfig(res.config);
        setIsEditUpiModalOpen(false);
        soundFx.playSuccess();
        setPaymentActionMessage({
          type: 'success',
          text: `Active UPI ID successfully updated to "${cleanUpi}" (${cleanName}). All dynamic player QR codes updated!`
        });
      } else {
        setEditUpiError(res.error || 'Failed to update payment settings');
      }
    } catch {
      setEditUpiError('Network error updating payment configuration');
    } finally {
      setIsSavingUpiConfig(false);
    }
  };

  const pendingPaymentsCount = useMemo(() => {
    if (!Array.isArray(paymentRequests)) return 0;
    return paymentRequests.filter(r => r.status === 'PENDING').length;
  }, [paymentRequests]);

  const approvedPaymentsTotal = useMemo(() => {
    if (!Array.isArray(paymentRequests)) return 0;
    return paymentRequests
      .filter(r => r.status === 'APPROVED')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [paymentRequests]);

  const filteredPaymentRequests = useMemo(() => {
    if (!Array.isArray(paymentRequests)) return [];
    return paymentRequests.filter(req => {
      if (paymentStatusFilter !== 'ALL' && req.status !== paymentStatusFilter) {
        return false;
      }
      if (paymentSearch.trim()) {
        const q = paymentSearch.toLowerCase();
        const matchUtr = req.utr_number?.toLowerCase().includes(q);
        const matchIgn = req.player_ign?.toLowerCase().includes(q);
        const matchUser = req.username?.toLowerCase().includes(q);
        const matchPhone = req.phone?.toLowerCase().includes(q);
        const matchAmount = String(req.amount).includes(q);
        if (!matchUtr && !matchIgn && !matchUser && !matchPhone && !matchAmount) {
          return false;
        }
      }
      return true;
    });
  }, [paymentRequests, paymentStatusFilter, paymentSearch]);

  const handleApprovePayment = async (req: PaymentRequest) => {
    setApprovingPaymentId(req.id);
    try {
      const res = await tournamentService.approvePaymentRequest(req.id);
      if (res.success) {
        soundFx.playSuccess();
        setPaymentActionMessage({
          type: 'success',
          text: `Approved ₹${req.amount} for ${req.player_ign || req.username}! Player wallet credited.`
        });
        setTimeout(() => setPaymentActionMessage(null), 4000);
        const updated = await tournamentService.getPaymentRequests();
        setPaymentRequests(updated);
      } else {
        setPaymentActionMessage({ type: 'error', text: res.error || 'Failed to approve payment' });
      }
    } finally {
      setApprovingPaymentId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    setIsRejecting(true);
    try {
      const res = await tournamentService.rejectPaymentRequest(rejectingRequest.id, rejectReason.trim());
      if (res.success) {
        setPaymentActionMessage({
          type: 'success',
          text: `Payment request for ${rejectingRequest.player_ign || rejectingRequest.username} has been rejected.`
        });
        setTimeout(() => setPaymentActionMessage(null), 4000);
        setRejectingRequest(null);
        const updated = await tournamentService.getPaymentRequests();
        setPaymentRequests(updated);
      }
    } finally {
      setIsRejecting(false);
    }
  };

  const refreshRegistrations = async () => {
    setIsLoadingRegistrations(true);
    try {
      const data = await tournamentService.fetchRegistrations();
      setAllRegistrations(data);
    } finally {
      setIsLoadingRegistrations(false);
    }
  };

  useEffect(() => {
    tournamentService.fetchRegistrations().then(data => {
      setAllRegistrations(data);
    }).catch(err => {
      console.error('Failed to fetch registrations:', err);
    });

    const unsub = tournamentService.subscribe(() => {
      setAllRegistrations(tournamentService.getAllRegistrations());
    });

    tournamentService.getPaymentConfig().then(cfg => {
      if (cfg) setPaymentConfig(cfg);
    });

    const unsubPaymentConfig = socketService.onPaymentConfigUpdated((cfg) => {
      if (cfg) setPaymentConfig(cfg);
    });

    tournamentService.getPaymentRequests().then(reqs => {
      setPaymentRequests(Array.isArray(reqs) ? reqs : []);
    });

    const unsubRequests = socketService.onPaymentRequestsUpdated((reqs) => {
      setPaymentRequests(Array.isArray(reqs) ? reqs : []);
    });

    return () => {
      unsub();
      unsubRequests();
      unsubPaymentConfig();
    };
  }, []);

  const filteredRegistrations = useMemo(() => {
    return allRegistrations.filter((reg) => {
      if (selectedTournamentFilter !== 'ALL' && reg.tournament_id !== selectedTournamentFilter) {
        return false;
      }
      if (selectedGameFilter !== 'ALL' && reg.game !== selectedGameFilter) {
        return false;
      }
      if (regSearch.trim()) {
        const q = regSearch.toLowerCase();
        const matchIgn = reg.player_ign?.toLowerCase().includes(q);
        const matchUid = reg.player_uid?.toLowerCase().includes(q);
        const matchPhone = reg.phone?.toLowerCase().includes(q);
        const matchEmail = reg.email?.toLowerCase().includes(q);
        const matchTeam = reg.team_name?.toLowerCase().includes(q);
        const matchTitle = reg.tournament_title?.toLowerCase().includes(q);
        const matchTeammates = reg.teammates?.some(
          t => t.name?.toLowerCase().includes(q) || t.uid?.toLowerCase().includes(q)
        );
        if (!matchIgn && !matchUid && !matchPhone && !matchEmail && !matchTeam && !matchTitle && !matchTeammates) {
          return false;
        }
      }
      return true;
    });
  }, [allRegistrations, selectedTournamentFilter, selectedGameFilter, regSearch]);

  const uniquePlayersCount = useMemo(() => {
    return new Set(allRegistrations.map(r => r.user_id || r.player_uid)).size;
  }, [allRegistrations]);

  const registeredTournamentsCount = useMemo(() => {
    return new Set(allRegistrations.map(r => r.tournament_id)).size;
  }, [allRegistrations]);

  const totalFilteredUidsCount = useMemo(() => {
    let count = 0;
    filteredRegistrations.forEach(r => {
      if (r.player_uid?.trim()) count++;
      if (Array.isArray(r.teammates)) {
        r.teammates.forEach(t => {
          if (t.uid?.trim()) count++;
        });
      }
    });
    return count;
  }, [filteredRegistrations]);

  const handleCopySingleUid = (uid: string, id: string) => {
    if (!uid) return;
    navigator.clipboard.writeText(uid);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllUids = () => {
    const uids: string[] = [];
    filteredRegistrations.forEach(r => {
      if (r.player_uid?.trim()) uids.push(r.player_uid.trim());
      if (Array.isArray(r.teammates)) {
        r.teammates.forEach(t => {
          if (t.uid?.trim()) uids.push(t.uid.trim());
        });
      }
    });
    if (uids.length === 0) return;
    navigator.clipboard.writeText(uids.join(', '));
    setCopiedAllUids(true);
    setTimeout(() => setCopiedAllUids(false), 2500);
  };

  const handleCancelRegistration = async (reg: Registration) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove participant "${reg.player_ign}" (${reg.player_uid}) from "${reg.tournament_title}"?\n\nThis will free up 1 slot in the tournament.`
    );
    if (!confirmed) return;

    setCancellingId(reg.id);
    try {
      const ok = await tournamentService.cancelRegistration(reg.id);
      if (ok) {
        setCancelSuccessMessage(`Successfully removed ${reg.player_ign} from ${reg.tournament_title}`);
        setTimeout(() => setCancelSuccessMessage(null), 3500);
        refreshRegistrations();
      }
    } catch (err) {
      console.error('Failed to cancel registration:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const activeCount = tournaments.filter(t => t.status !== 'COMPLETED').length;
  const completedCount = tournaments.filter(t => t.status === 'COMPLETED').length;
  const hiddenCompletedCount = tournaments.filter(t => t.status === 'COMPLETED' && t.is_hidden).length;
  const areCompletedHidden = completedCount > 0 && hiddenCompletedCount === completedCount;

  const filteredTournaments = tournaments.filter(t => {
    if (manageStatusFilter === 'ACTIVE') return t.status !== 'COMPLETED';
    if (manageStatusFilter === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  const handleToggleGlobalHide = async () => {
    setIsTogglingVisibility(true);
    try {
      await tournamentService.toggleHideCompleted(!areCompletedHidden);
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const handleToggleSingleVisibility = async (tournamentId: string, currentHidden: boolean) => {
    await tournamentService.toggleTournamentVisibility(tournamentId, !currentHidden);
  };

  const [deletingTournamentId, setDeletingTournamentId] = useState<string | null>(null);

  const handleDeleteTournament = async (tournament: Tournament) => {
    const confirmed = window.confirm(
      `⚠️ PERMANENT DELETION\n\nAre you sure you want to permanently delete the completed tournament:\n"${tournament.title}"?\n\nThis will remove the tournament, registered player lists, and room credentials permanently. This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingTournamentId(tournament.id);
    try {
      const res = await tournamentService.deleteTournament(tournament.id);
      if (res.success) {
        soundFx.playSuccess();
      } else {
        alert(res.error || 'Failed to delete tournament');
      }
    } finally {
      setDeletingTournamentId(null);
    }
  };

  const [selectedTournamentForRoom, setSelectedTournamentForRoom] = useState<Tournament | null>(null);
  const [selectedTournamentForStandings, setSelectedTournamentForStandings] = useState<Tournament | null>(null);

  // Room broadcast form state
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [instructions, setInstructions] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [registeredPlayers, setRegisteredPlayers] = useState<Registration[]>([]);
  const [dispatchSummary, setDispatchSummary] = useState<{ count: number; recipients: Registration[]; isReleased: boolean } | null>(null);
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false);

  // Create tournament form state
  const [newTitle, setNewTitle] = useState('');
  const [newGame, setNewGame] = useState<TournamentGame>('BGMI');
  const [newFormat, setNewFormat] = useState<FormatType>('Squad');
  const [newDate, setNewDate] = useState('2026-09-18');
  const [newTime, setNewTime] = useState('20:30');
  const [newEntryFee, setNewEntryFee] = useState(0);
  const [firstPrize, setFirstPrize] = useState(5000);
  const [secondPrize, setSecondPrize] = useState(3000);
  const [thirdPrize, setThirdPrize] = useState(2000);
  const [newSlotsTotal, setNewSlotsTotal] = useState(100);
  const [newMap, setNewMap] = useState('Erangel');
  const [newRules, setNewRules] = useState('1. Mobile only, no emulators.\n2. Room details unlock 15 mins prior.\n3. Top 3 claim prizes.');
  const [createSuccess, setCreateSuccess] = useState(false);

  // Edit existing tournament prizes modal state
  const [selectedTournamentForPrizes, setSelectedTournamentForPrizes] = useState<Tournament | null>(null);
  const [editFirstPrize, setEditFirstPrize] = useState(5000);
  const [editSecondPrize, setEditSecondPrize] = useState(3000);
  const [editThirdPrize, setEditThirdPrize] = useState(2000);
  const [prizesSaveSuccess, setPrizesSaveSuccess] = useState(false);
  const [isSavingPrizes, setIsSavingPrizes] = useState(false);

  // Standings editor form state
  const [standingsRows, setStandingsRows] = useState<MatchStanding[]>([
    { rank: 1, team_name: 'Soul Esports', player_names: 'Mortal, Viper, Regaltos, Aman', kills: 14, points: 29, prize_amount: 5000 },
    { rank: 2, team_name: 'GodLike', player_names: 'Jonathan, Neyoo, Zgod, Shadow', kills: 11, points: 21, prize_amount: 3000 },
    { rank: 3, team_name: 'Team Velocity', player_names: 'NinjaGamer99, Axe, Blaze, Neo', kills: 8, points: 16, prize_amount: 2000 }
  ]);
  const [standingsSuccess, setStandingsSuccess] = useState(false);

  const openRoomBroadcastModal = (tournament: Tournament) => {
    setSelectedTournamentForRoom(tournament);
    setRoomId(tournament.room_credential?.roomId || '');
    setRoomPassword(tournament.room_credential?.roomPassword || '');
    setInstructions(tournament.room_credential?.instructions || 'Join allocated squad slot within 10 mins.');
    setBroadcastSuccess(false);
    setDispatchSummary(null);
    tournamentService.fetchRegistrations().then(allRegs => {
      setRegisteredPlayers(allRegs.filter(r => r.tournament_id === tournament.id));
    });
  };

  const openEditPrizesModal = (t: Tournament) => {
    setSelectedTournamentForPrizes(t);
    const p1 = t.prize_breakdown?.[0]?.prize ?? 5000;
    const p2 = t.prize_breakdown?.[1]?.prize ?? 3000;
    const p3 = t.prize_breakdown?.[2]?.prize ?? 2000;
    setEditFirstPrize(p1);
    setEditSecondPrize(p2);
    setEditThirdPrize(p3);
    setPrizesSaveSuccess(false);
  };

  const handleSavePrizes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournamentForPrizes) return;
    setIsSavingPrizes(true);
    const updatedPrizes = [
      { rank: '1st Place', prize: Number(editFirstPrize) },
      { rank: '2nd Place', prize: Number(editSecondPrize) },
      { rank: '3rd Place', prize: Number(editThirdPrize) }
    ];
    await tournamentService.updateTournamentPrizes(selectedTournamentForPrizes.id, updatedPrizes);
    setIsSavingPrizes(false);
    setPrizesSaveSuccess(true);
    setTimeout(() => {
      setPrizesSaveSuccess(false);
      setSelectedTournamentForPrizes(null);
    }, 1500);
  };

  const handleBroadcastSubmit = async (e: React.FormEvent, releaseNow: boolean) => {
    e.preventDefault();
    if (!selectedTournamentForRoom) return;

    setIsSubmittingRoom(true);
    const result = await tournamentService.updateRoomCredentials(
      selectedTournamentForRoom.id,
      {
        roomId: roomId.trim(),
        roomPassword: roomPassword.trim(),
        instructions: instructions.trim(),
        isReleased: releaseNow
      },
      user?.id
    );
    setIsSubmittingRoom(false);

    if (result.success) {
      onUpdateRoom(selectedTournamentForRoom.id, {
        roomId: roomId.trim(),
        roomPassword: roomPassword.trim(),
        instructions: instructions.trim(),
        isReleased: releaseNow
      });
      setDispatchSummary({
        count: result.dispatched_count ?? 0,
        recipients: result.recipients || [],
        isReleased: releaseNow
      });
      setBroadcastSuccess(true);
    }
  };

  const handleStatusChange = async (tournamentId: string, status: Tournament['status']) => {
    await tournamentService.updateTournamentStatus(tournamentId, status);
  };

  const openStandingsEditor = (t: Tournament) => {
    setSelectedTournamentForStandings(t);
    if (t.standings && t.standings.length > 0) {
      setStandingsRows([...t.standings]);
    } else {
      const p1 = t.prize_breakdown?.[0]?.prize ?? 0;
      const p2 = t.prize_breakdown?.[1]?.prize ?? 0;
      const p3 = t.prize_breakdown?.[2]?.prize ?? 0;
      setStandingsRows([
        { rank: 1, team_name: 'Team Alpha', player_names: 'Player 1, Player 2', kills: 10, points: 25, prize_amount: p1 },
        { rank: 2, team_name: 'Team Bravo', player_names: 'Player 3, Player 4', kills: 7, points: 17, prize_amount: p2 },
        { rank: 3, team_name: 'Team Charlie', player_names: 'Player 5, Player 6', kills: 4, points: 11, prize_amount: p3 }
      ]);
    }
    setActiveTab('standings');
  };

  const handleSaveStandings = async () => {
    if (!selectedTournamentForStandings) return;
    await tournamentService.updateStandings(selectedTournamentForStandings.id, standingsRows);
    setStandingsSuccess(true);
    setTimeout(() => {
      setStandingsSuccess(false);
    }, 2000);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bannerUrl =
      newGame === 'BGMI'
        ? 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200'
        : newGame === 'Free Fire MAX'
        ? 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=1200'
        : 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=1200';

    const totalPrize = Number(firstPrize) + Number(secondPrize) + Number(thirdPrize);

    onCreateTournament({
      title: newTitle,
      game: newGame,
      format: newFormat,
      organiser_name: 'GearUp Official',
      date: newDate,
      time: newTime,
      entry_fee: Number(newEntryFee),
      prize_pool: totalPrize,
      slots_total: Number(newSlotsTotal),
      status: 'REGISTRATION_OPEN',
      banner_url: bannerUrl,
      map: newMap,
      rules: newRules,
      room_credential: {
        roomId: '',
        roomPassword: '',
        isReleased: false
      },
      prize_breakdown: [
        { rank: '1st Place', prize: Number(firstPrize) },
        { rank: '2nd Place', prize: Number(secondPrize) },
        { rank: '3rd Place', prize: Number(thirdPrize) }
      ]
    });

    setCreateSuccess(true);
    setTimeout(() => {
      setCreateSuccess(false);
      setActiveTab('manage');
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Organiser Header */}
      <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="blue" size="sm">
              <Shield size={12} /> {user?.is_admin ? 'ADMIN CONTROLS' : 'ORGANISER CONTROLS'}
            </Badge>
            <span className="text-xs font-bold text-[#5BD19B] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#5BD19B] animate-ping" /> Real-Time Sync Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display uppercase text-white tracking-tight">
            Tournament Management Console
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Host matches, broadcast room codes, update match statuses, and publish live leaderboards in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => setActiveTab('create')}
            className="text-xs"
          >
            <Plus size={16} /> Host New Tournament
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1F324B] gap-4 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('manage')}
          className={`pb-3 text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'manage'
              ? 'text-[#4D8EF7] border-[#4D8EF7]'
              : 'text-zinc-400 border-transparent hover:text-white'
          }`}
        >
          <Radio size={16} />
          <span>Tournaments ({tournaments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('registrations')}
          className={`pb-3 text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'registrations'
              ? 'text-[#5BD19B] border-[#5BD19B]'
              : 'text-zinc-400 border-transparent hover:text-white'
          }`}
        >
          <Users size={16} />
          <span>Registered Users ({allRegistrations.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 flex-shrink-0 relative ${
            activeTab === 'payments'
              ? 'text-amber-400 border-amber-400'
              : 'text-zinc-400 border-transparent hover:text-white'
          }`}
        >
          <IndianRupee size={16} />
          <span>Payment Approvals</span>
          {pendingPaymentsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-[#0B131E] leading-none shadow-[0_0_10px_rgba(251,191,36,0.5)]">
              {pendingPaymentsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`pb-3 text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'create'
              ? 'text-[#5BD19B] border-[#5BD19B]'
              : 'text-zinc-400 border-transparent hover:text-white'
          }`}
        >
          <Plus size={16} />
          <span>Create Tournament</span>
        </button>
        <button
          onClick={() => setActiveTab('standings')}
          className={`pb-3 text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'standings'
              ? 'text-[#5BD19B] border-[#5BD19B]'
              : 'text-zinc-400 border-transparent hover:text-white'
          }`}
        >
          <Trophy size={16} />
          <span>Live Leaderboard Editor</span>
        </button>
      </div>

      {/* Tab 1: Manage Tournaments & Broadcast Room IDs */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          {/* Admin Matches Filter & Control Bar */}
          <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-xs font-bold uppercase text-zinc-400 mr-1 hidden sm:inline">Status:</span>
              <button
                type="button"
                onClick={() => setManageStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors ${
                  manageStatusFilter === 'ALL'
                    ? 'bg-[#152234] text-[#4D8EF7] border border-[#4D8EF7]/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Matches ({tournaments.length})
              </button>
              <button
                type="button"
                onClick={() => setManageStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors ${
                  manageStatusFilter === 'ACTIVE'
                    ? 'bg-[#152234] text-[#5BD19B] border border-[#5BD19B]/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setManageStatusFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors ${
                  manageStatusFilter === 'COMPLETED'
                    ? 'bg-[#152234] text-amber-400 border border-amber-500/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Completed / Ended ({completedCount})
              </button>
            </div>

            {/* Admin Toggle Player Visibility for Completed Tournaments */}
            {completedCount > 0 && (
              <button
                type="button"
                disabled={isTogglingVisibility}
                onClick={handleToggleGlobalHide}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 border ml-auto ${
                  areCompletedHidden
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'bg-[#0B131E] text-zinc-300 border-[#1F324B] hover:text-white hover:border-[#5BD19B]/40'
                }`}
                title={areCompletedHidden ? 'Completed tournaments are hidden from normal users. Click to make visible to players.' : 'Completed tournaments are visible to players. Click to hide them from normal users.'}
              >
                {areCompletedHidden ? <EyeOff size={14} className="text-amber-400" /> : <Eye size={14} className="text-[#5BD19B]" />}
                <span>
                  {areCompletedHidden ? 'Hidden from Normal Users' : 'Visible to Players (Click to Hide)'}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  areCompletedHidden ? 'bg-amber-500/30 text-amber-200' : 'bg-[#152234] text-zinc-400'
                }`}>
                  {hiddenCompletedCount}/{completedCount} Hidden
                </span>
              </button>
            )}
          </div>

          {filteredTournaments.length === 0 ? (
            <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-10 text-center max-w-md mx-auto space-y-3">
              <EyeOff size={32} className="mx-auto text-zinc-500" />
              <h3 className="text-lg font-bold font-display uppercase text-white">No Tournaments Found</h3>
              <p className="text-xs text-zinc-400">
                No tournaments match the selected filter tab.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTournaments.map(tournament => {
                const isRoomReleased = tournament.room_credential?.isReleased;

                return (
                  <div
                    key={tournament.id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 shadow-lg transition-colors ${
                      tournament.status === 'COMPLETED'
                        ? 'bg-[#0E1724] border-zinc-700/60 opacity-90'
                        : 'bg-[#111C2B] border-[#1F324B] hover:border-[#4D8EF7]/50'
                    }`}
                  >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="blue" size="sm">{tournament.game}</Badge>
                        <Badge variant="neutral" size="sm">{tournament.format}</Badge>
                      </div>
                      
                      {/* Status indicator & Admin Player Visibility Toggle */}
                      <div className="flex items-center gap-1.5">
                        {tournament.status === 'COMPLETED' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleSingleVisibility(tournament.id, Boolean(tournament.is_hidden))}
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 transition-colors ${
                                tournament.is_hidden
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                  : 'bg-[#5BD19B]/15 text-[#5BD19B] border-[#5BD19B]/30 hover:bg-[#5BD19B]/25'
                              }`}
                              title={tournament.is_hidden ? 'Hidden from normal users. Click to make visible to players.' : 'Visible to players. Click to hide from normal users.'}
                            >
                              {tournament.is_hidden ? <EyeOff size={10} /> : <Eye size={10} />}
                              <span>{tournament.is_hidden ? 'Hidden' : 'Public'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={deletingTournamentId === tournament.id}
                              onClick={() => handleDeleteTournament(tournament)}
                              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/30 flex items-center gap-1 transition-colors"
                              title="Permanently delete this completed tournament"
                            >
                              <Trash2 size={10} />
                              <span>{deletingTournamentId === tournament.id ? 'Deleting...' : 'Delete'}</span>
                            </button>
                          </>
                        )}
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                          tournament.status === 'LIVE'
                            ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                            : tournament.status === 'COMPLETED'
                            ? 'bg-zinc-700/50 text-zinc-300 border-zinc-600'
                            : isRoomReleased
                            ? 'bg-[#5BD19B]/20 text-[#5BD19B] border-[#5BD19B]/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {tournament.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <h3
                      onClick={() => navigate(`/tournament/${tournament.id}`)}
                      className="text-base font-bold font-display uppercase text-white hover:text-[#5BD19B] cursor-pointer"
                    >
                      {tournament.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-2">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {tournament.date} • {tournament.time}</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {tournament.slots_filled}/{tournament.slots_total} slots</span>
                      <span className="flex items-center gap-1"><Trophy size={12} className="text-[#5BD19B]" /> ₹{tournament.prize_pool}</span>
                    </div>

                    {isRoomReleased && tournament.room_credential && (
                      <div className="mt-3 bg-[#0B131E] p-2.5 rounded-xl border border-[#1F324B] text-xs flex items-center justify-between">
                        <span className="text-zinc-400">
                          Lobby: <strong className="text-white font-mono">{tournament.room_credential.roomId}</strong>
                        </span>
                        <span className="text-zinc-400">
                          Pass: <strong className="text-[#5BD19B] font-mono">{tournament.room_credential.roomPassword}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-[#1F324B] space-y-2">
                    {/* Status Toggle Quick Buttons */}
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span className="text-[10px] uppercase font-bold">Match State:</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(tournament.id, 'REGISTRATION_OPEN')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                            tournament.status === 'REGISTRATION_OPEN' ? 'bg-[#5BD19B] text-[#0B131E]' : 'bg-[#152234] text-zinc-400 hover:text-white'
                          }`}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(tournament.id, 'LIVE')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                            tournament.status === 'LIVE' ? 'bg-red-500 text-white animate-pulse' : 'bg-[#152234] text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-0.5"><PlayCircle size={10} /> Live</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(tournament.id, 'COMPLETED')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                            tournament.status === 'COMPLETED' ? 'bg-zinc-600 text-white' : 'bg-[#152234] text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-0.5"><Flag size={10} /> End</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setSelectedTournamentFilter(tournament.id);
                          setActiveTab('registrations');
                        }}
                        className="text-xs py-2 text-[#5BD19B] hover:text-[#5BD19B] border-[#1F324B] hover:border-[#5BD19B]/40"
                      >
                        <Users size={13} />
                        <span>Players ({tournament.slots_filled})</span>
                      </Button>

                      <Button
                        variant={isRoomReleased ? 'outline-blue' : 'blue'}
                        size="sm"
                        fullWidth
                        onClick={() => openRoomBroadcastModal(tournament)}
                        className="text-xs py-2"
                      >
                        <Radio size={13} />
                        <span>{isRoomReleased ? 'Update Room' : 'Broadcast'}</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => openEditPrizesModal(tournament)}
                        className="text-xs py-2 text-amber-400 hover:text-amber-300 border-[#1F324B]"
                      >
                        <Trophy size={13} />
                        <span>Edit Prizes</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => openStandingsEditor(tournament)}
                        className="text-xs py-2"
                      >
                        <Award size={13} className="text-[#5BD19B]" />
                        <span>Standings</span>
                      </Button>
                    </div>

                    {tournament.status === 'COMPLETED' && (
                      <div className="pt-2.5 border-t border-[#1F324B]/70 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <span className="text-[11px] font-medium italic">Finished match record</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={deletingTournamentId === tournament.id}
                          onClick={() => handleDeleteTournament(tournament)}
                          className="text-xs py-1 px-3 bg-red-500/10 border-red-500/40 text-red-300 hover:bg-red-500/20 hover:text-white flex items-center gap-1.5 transition-colors"
                          title="Permanently delete completed tournament from database"
                        >
                          <Trash2 size={13} />
                          <span>{deletingTournamentId === tournament.id ? 'Deleting...' : 'Delete Tournament'}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      )}

      {/* Tab: Registered Users / Admin Roster Dashboard */}
      {activeTab === 'registrations' && (
        <div className="space-y-6">
          {/* Top KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#111C2B] border border-[#1F324B] rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase text-zinc-400 tracking-wider">
                    Total Registrations
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-display text-white mt-1">
                    {allRegistrations.length}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#5BD19B]/10 border border-[#5BD19B]/30 flex items-center justify-center text-[#5BD19B]">
                  <Users size={20} />
                </div>
              </div>
              <div className="text-[11px] text-[#5BD19B] mt-2 font-medium flex items-center gap-1">
                <span>All recorded tournament entries</span>
              </div>
            </div>

            <div className="bg-[#111C2B] border border-[#1F324B] rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase text-zinc-400 tracking-wider">
                    Unique Players
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-display text-[#4D8EF7] mt-1">
                    {uniquePlayersCount}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#4D8EF7]/10 border border-[#4D8EF7]/30 flex items-center justify-center text-[#4D8EF7]">
                  <UserCheck size={20} />
                </div>
              </div>
              <div className="text-[11px] text-zinc-400 mt-2 font-medium">
                Distinct gamer accounts
              </div>
            </div>

            <div className="bg-[#111C2B] border border-[#1F324B] rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase text-zinc-400 tracking-wider">
                    Active Tournaments
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-display text-purple-400 mt-1">
                    {registeredTournamentsCount} <span className="text-xs text-zinc-500 font-normal">/ {tournaments.length}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Trophy size={20} />
                </div>
              </div>
              <div className="text-[11px] text-zinc-400 mt-2 font-medium">
                Tournaments with registrations
              </div>
            </div>

            <div className="bg-[#111C2B] border border-[#1F324B] rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase text-zinc-400 tracking-wider">
                    Filtered Matches
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-display text-amber-400 mt-1">
                    {filteredRegistrations.length}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Filter size={20} />
                </div>
              </div>
              <div className="text-[11px] text-zinc-400 mt-2 font-medium">
                Matching current search & filters
              </div>
            </div>
          </div>

          {/* Success Notification Banner */}
          {cancelSuccessMessage && (
            <div className="bg-[#5BD19B]/15 border border-[#5BD19B]/40 rounded-xl p-3.5 text-[#5BD19B] text-xs font-bold flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{cancelSuccessMessage}</span>
              </div>
              <button onClick={() => setCancelSuccessMessage(null)} className="text-zinc-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Controls Bar: Search, Dropdowns, Game Filter, Quick Copy All UIDs */}
          <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  placeholder="Search player IGN, Game UID, phone, email, team or tournament..."
                  className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#5BD19B] transition-colors"
                />
                {regSearch && (
                  <button
                    onClick={() => setRegSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Tournament Selector Dropdown */}
              <div className="w-full lg:w-72">
                <select
                  value={selectedTournamentFilter}
                  onChange={(e) => setSelectedTournamentFilter(e.target.value)}
                  className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#5BD19B] truncate"
                >
                  <option value="ALL">All Tournaments ({allRegistrations.length})</option>
                  {tournaments.map((t) => {
                    const count = allRegistrations.filter(r => r.tournament_id === t.id).length;
                    return (
                      <option key={t.id} value={t.id}>
                        {t.title} ({count} registered)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAllUids}
                  disabled={filteredRegistrations.length === 0}
                  className="text-xs whitespace-nowrap py-2.5"
                  title="Copy all player UIDs in current view separated by comma (for creating custom lobby)"
                >
                  {copiedAllUids ? (
                    <>
                      <Check size={14} className="text-[#5BD19B]" />
                      <span className="text-[#5BD19B]">Copied {totalFilteredUidsCount} UIDs!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy All UIDs ({totalFilteredUidsCount})</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshRegistrations}
                  disabled={isLoadingRegistrations}
                  className="text-xs py-2.5 px-3"
                  title="Refresh registrations list"
                >
                  <RefreshCw size={14} className={isLoadingRegistrations ? 'animate-spin text-[#5BD19B]' : ''} />
                </Button>
              </div>
            </div>

            {/* Game Filter Pills & Active Summary */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1F324B]">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-xs font-bold uppercase text-zinc-400 mr-1 hidden sm:inline">Game:</span>
                <button
                  type="button"
                  onClick={() => setSelectedGameFilter('ALL')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold uppercase transition-colors ${
                    selectedGameFilter === 'ALL'
                      ? 'bg-[#152234] text-[#5BD19B] border border-[#5BD19B]/40'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All Games
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGameFilter('BGMI')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold uppercase transition-colors ${
                    selectedGameFilter === 'BGMI'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  BGMI
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGameFilter('Free Fire MAX')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold uppercase transition-colors ${
                    selectedGameFilter === 'Free Fire MAX'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Free Fire MAX
                </button>
              </div>

              <div className="text-xs text-zinc-400 flex items-center gap-2">
                <span>Showing <strong className="text-white">{filteredRegistrations.length}</strong> of {allRegistrations.length} entries</span>
                {(selectedTournamentFilter !== 'ALL' || selectedGameFilter !== 'ALL' || regSearch) && (
                  <button
                    onClick={() => {
                      setSelectedTournamentFilter('ALL');
                      setSelectedGameFilter('ALL');
                      setRegSearch('');
                    }}
                    className="text-xs text-[#5BD19B] hover:underline font-bold"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Roster Table / Card View */}
          {filteredRegistrations.length === 0 ? (
            <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-12 text-center max-w-lg mx-auto space-y-3">
              <Users size={40} className="mx-auto text-zinc-600" />
              <h3 className="text-lg font-bold font-display uppercase text-white">No Registrations Found</h3>
              <p className="text-xs text-zinc-400">
                {allRegistrations.length === 0
                  ? 'No players have registered for any tournament yet. As players register, their in-game name, UID, contact details, and tournament selection will appear here in real time.'
                  : 'No player registrations match your search and filter criteria. Try adjusting or clearing your filters.'}
              </p>
              {(selectedTournamentFilter !== 'ALL' || selectedGameFilter !== 'ALL' || regSearch) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTournamentFilter('ALL');
                    setSelectedGameFilter('ALL');
                    setRegSearch('');
                  }}
                  className="mt-2 text-xs"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] overflow-hidden shadow-xl">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1F324B] bg-[#0B131E]/60 text-zinc-400 uppercase font-mono tracking-wider text-[11px]">
                      <th className="py-3.5 px-4 font-bold">#</th>
                      <th className="py-3.5 px-4 font-bold">Player & Team</th>
                      <th className="py-3.5 px-4 font-bold">In-Game UID</th>
                      <th className="py-3.5 px-4 font-bold">Tournament</th>
                      <th className="py-3.5 px-4 font-bold">Contact</th>
                      <th className="py-3.5 px-4 font-bold">Registered At</th>
                      <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F324B]/50">
                    {filteredRegistrations.map((reg, idx) => {
                      const isCancelling = cancellingId === reg.id;
                      const initials = (reg.player_ign || 'P').slice(0, 2).toUpperCase();

                      return (
                        <tr key={reg.id} className="hover:bg-[#152234]/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-zinc-500 font-bold">
                            {idx + 1}
                          </td>

                          {/* Player IGN & Team */}
                          <td className="py-3.5 px-4">
                            {reg.team_name ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 rounded bg-[#5BD19B]/20 text-[#5BD19B] border border-[#5BD19B]/40 text-[10px] font-mono uppercase font-bold">
                                    TEAM
                                  </span>
                                  <span className="font-bold text-white text-sm">
                                    {reg.team_name}
                                  </span>
                                </div>
                                <div className="space-y-0.5 pl-1 text-[11px]">
                                  <div className="flex items-center gap-1 text-zinc-300">
                                    <Crown size={11} className="text-amber-400 flex-shrink-0" />
                                    <span className="text-zinc-400">Leader:</span>
                                    <span className="font-bold text-white">{reg.player_ign}</span>
                                  </div>
                                  {reg.teammates?.map((tm, tIdx) => (
                                    <div key={tIdx} className="flex items-center gap-1 text-zinc-400">
                                      <span className="text-[10px] font-mono text-zinc-500">P{tIdx + 2}:</span>
                                      <span className="text-zinc-200">{tm.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4D8EF7] to-[#5BD19B] flex items-center justify-center text-white font-black font-display text-xs shadow-sm flex-shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-sm">
                                    {reg.player_ign}
                                  </div>
                                  <div className="text-[11px] text-zinc-400">
                                    Solo Player
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Game UID with 1-click copy */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {/* Leader UID */}
                              <div className="flex items-center gap-1">
                                {reg.teammates && reg.teammates.length > 0 && (
                                  <span className="text-[10px] font-mono text-amber-400 w-5">P1:</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleCopySingleUid(reg.player_uid, `${reg.id}-p1`)}
                                  className={`group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-mono text-xs border transition-all ${
                                    copiedId === `${reg.id}-p1` || copiedId === reg.id
                                      ? 'bg-[#5BD19B]/20 text-[#5BD19B] border-[#5BD19B]/50'
                                      : 'bg-[#0B131E] text-zinc-200 border-[#1F324B] hover:border-[#5BD19B]/50 hover:text-white'
                                  }`}
                                  title="Click to copy Leader UID"
                                >
                                  <span>{reg.player_uid}</span>
                                  {copiedId === `${reg.id}-p1` || copiedId === reg.id ? (
                                    <Check size={11} className="text-[#5BD19B]" />
                                  ) : (
                                    <Copy size={11} className="text-zinc-500 group-hover:text-zinc-300" />
                                  )}
                                </button>
                              </div>

                              {/* Teammates' UIDs */}
                              {reg.teammates?.map((tm, tIdx) => (
                                <div key={tIdx} className="flex items-center gap-1">
                                  <span className="text-[10px] font-mono text-zinc-500 w-5">P{tIdx + 2}:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopySingleUid(tm.uid, `${reg.id}-p${tIdx + 2}`)}
                                    className={`group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-mono text-xs border transition-all ${
                                      copiedId === `${reg.id}-p${tIdx + 2}`
                                        ? 'bg-[#5BD19B]/20 text-[#5BD19B] border-[#5BD19B]/50'
                                        : 'bg-[#0B131E] text-zinc-200 border-[#1F324B] hover:border-[#5BD19B]/50 hover:text-white'
                                    }`}
                                    title={`Click to copy P${tIdx + 2} UID`}
                                  >
                                    <span>{tm.uid}</span>
                                    {copiedId === `${reg.id}-p${tIdx + 2}` ? (
                                      <Check size={11} className="text-[#5BD19B]" />
                                    ) : (
                                      <Copy size={11} className="text-zinc-500 group-hover:text-zinc-300" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Tournament Title & Game */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div>
                              <div
                                onClick={() => navigate(`/tournament/${reg.tournament_id}`)}
                                className="font-bold text-white hover:text-[#5BD19B] cursor-pointer truncate flex items-center gap-1"
                                title={reg.tournament_title}
                              >
                                <span>{reg.tournament_title}</span>
                                <ExternalLink size={10} className="text-zinc-500 flex-shrink-0" />
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Badge
                                  variant={reg.game === 'BGMI' ? 'amber' : 'danger'}
                                  size="sm"
                                  className="text-[10px] py-0 px-1.5"
                                >
                                  {reg.game}
                                </Badge>
                              </div>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="py-3.5 px-4 text-zinc-300">
                            <div className="space-y-0.5">
                              {reg.phone && (
                                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                                  <Phone size={11} className="text-zinc-500" />
                                  <span>{reg.phone}</span>
                                </div>
                              )}
                              {reg.email && (
                                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                                  <Mail size={11} className="text-zinc-500" />
                                  <span className="truncate max-w-[150px]" title={reg.email}>{reg.email}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Registered Timestamp */}
                          <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                            {reg.registered_at ? new Date(reg.registered_at).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Recent'}
                          </td>

                          {/* Action: Cancel / Remove Registration */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              disabled={isCancelling}
                              onClick={() => handleCancelRegistration(reg)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/30"
                              title="Remove player from tournament (frees up slot)"
                            >
                              {isCancelling ? (
                                <RefreshCw size={14} className="animate-spin text-red-400" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Cards Layout */}
              <div className="md:hidden divide-y divide-[#1F324B]">
                {filteredRegistrations.map((reg, idx) => {
                  const isCopied = copiedId === reg.id;
                  const isCancelling = cancellingId === reg.id;
                  const initials = (reg.player_ign || 'P').slice(0, 2).toUpperCase();

                  return (
                    <div key={reg.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4D8EF7] to-[#5BD19B] flex items-center justify-center text-white font-black font-display text-xs shadow-sm flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            {reg.team_name ? (
                              <div>
                                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-[#5BD19B]/20 text-[#5BD19B] text-[9px] font-mono font-bold">
                                    TEAM
                                  </span>
                                  <span>{reg.team_name}</span>
                                </div>
                                <div className="text-[11px] text-zinc-400 mt-0.5">
                                  Leader: <strong className="text-white">{reg.player_ign}</strong>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="font-bold text-white text-sm">
                                  #{idx + 1} {reg.player_ign}
                                </div>
                                <div className="text-xs text-zinc-400">
                                  Solo Player
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isCancelling}
                          onClick={() => handleCancelRegistration(reg)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-zinc-700/50"
                          title="Remove registration"
                        >
                          {isCancelling ? (
                            <RefreshCw size={14} className="animate-spin text-red-400" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>

                      {/* Team Roster Sub-Card on mobile */}
                      {Array.isArray(reg.teammates) && reg.teammates.length > 0 && (
                        <div className="bg-[#111C2B] p-2.5 rounded-xl border border-[#1F324B]/70 space-y-1 text-xs">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block mb-1">
                            Team Roster ({reg.teammates.length + 1} Players):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            <div className="flex items-center justify-between bg-[#0B131E] px-2 py-1 rounded">
                              <span className="text-zinc-300 font-bold flex items-center gap-1">
                                <Crown size={10} className="text-amber-400" /> P1: {reg.player_ign}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopySingleUid(reg.player_uid, `${reg.id}-p1`)}
                                className="font-mono text-[10px] text-[#5BD19B] flex items-center gap-1"
                              >
                                <span>{reg.player_uid}</span>
                                {copiedId === `${reg.id}-p1` ? <Check size={10} /> : <Copy size={10} />}
                              </button>
                            </div>
                            {reg.teammates.map((tm, tIdx) => (
                              <div key={tIdx} className="flex items-center justify-between bg-[#0B131E] px-2 py-1 rounded">
                                <span className="text-zinc-300">
                                  P{tIdx + 2}: {tm.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopySingleUid(tm.uid, `${reg.id}-p${tIdx + 2}`)}
                                  className="font-mono text-[10px] text-[#5BD19B] flex items-center gap-1"
                                >
                                  <span>{tm.uid}</span>
                                  {copiedId === `${reg.id}-p${tIdx + 2}` ? <Check size={10} /> : <Copy size={10} />}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-[#0B131E] p-2.5 rounded-xl border border-[#1F324B] space-y-1.5 text-xs">
                        {(!reg.teammates || reg.teammates.length === 0) && (
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 font-mono text-[11px]">In-Game UID:</span>
                            <button
                              type="button"
                              onClick={() => handleCopySingleUid(reg.player_uid, reg.id)}
                              className="font-mono font-bold text-white flex items-center gap-1 hover:text-[#5BD19B]"
                            >
                              <span>{reg.player_uid}</span>
                              {isCopied ? <Check size={12} className="text-[#5BD19B]" /> : <Copy size={12} />}
                            </button>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 font-mono text-[11px]">Tournament:</span>
                          <span className="text-white font-bold truncate max-w-[200px]">{reg.tournament_title}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 font-mono text-[11px]">Game:</span>
                          <Badge variant={reg.game === 'BGMI' ? 'amber' : 'danger'} size="sm">
                            {reg.game}
                          </Badge>
                        </div>
                        {reg.phone && (
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 font-mono text-[11px]">Phone:</span>
                            <span className="text-zinc-300 font-mono">{reg.phone}</span>
                          </div>
                        )}
                        {reg.email && (
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 font-mono text-[11px]">Email:</span>
                            <span className="text-zinc-300 truncate max-w-[180px]">{reg.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Payment Approvals (UPI QR & 12-Digit UTR Verification) */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#111C2B] border border-[#1F324B] rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase text-zinc-400 tracking-wider">
                    Pending Verification
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-display text-amber-400 mt-1">
                    {pendingPaymentsCount}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock size={20} />
                </div>
              </div>
              <div className="text-[11px] text-amber-300 mt-2 font-medium">
                Awaiting bank deposit check
              </div>
            </div>

            <div className="bg-[#111C2B] border border-[#1F324B] rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase text-zinc-400 tracking-wider">
                    Approved Total
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-display text-[#5BD19B] mt-1">
                    ₹{approvedPaymentsTotal.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#5BD19B]/10 border border-[#5BD19B]/30 flex items-center justify-center text-[#5BD19B]">
                  <IndianRupee size={20} />
                </div>
              </div>
              <div className="text-[11px] text-zinc-400 mt-2 font-medium">
                Credited to gamer wallets
              </div>
            </div>

            <div className="bg-[#111C2B] border border-[#1F324B] rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase text-zinc-400 tracking-wider">
                    Total Submissions
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-display text-[#4D8EF7] mt-1">
                    {paymentRequests.length}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#4D8EF7]/10 border border-[#4D8EF7]/30 flex items-center justify-center text-[#4D8EF7]">
                  <CreditCard size={20} />
                </div>
              </div>
              <div className="text-[11px] text-zinc-400 mt-2 font-medium">
                All-time UTR submissions
              </div>
            </div>

            <div className="bg-[#111C2B] border border-[#1F324B] rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(paymentConfig.upi_id);
                    setCopiedAdminUpi(true);
                    setTimeout(() => setCopiedAdminUpi(false), 2000);
                  }}
                  className="text-left group focus:outline-none"
                  title="Click to copy UPI ID"
                >
                  <span className="text-[10px] sm:text-xs font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1 group-hover:text-purple-300 transition-colors">
                    Active UPI ID {copiedAdminUpi ? <Check size={11} className="text-[#5BD19B]" /> : <Copy size={11} className="text-zinc-500 group-hover:text-purple-300" />}
                  </span>
                  <div className="text-sm font-black font-mono text-white mt-1 truncate max-w-[140px]" title={paymentConfig.upi_id}>
                    {paymentConfig.upi_id}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={openEditUpiModal}
                  className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/25 hover:border-purple-500/50 transition-colors flex items-center justify-center text-purple-400 cursor-pointer"
                  title="Click to change UPI ID or Payee Name"
                >
                  <QrCode size={20} />
                </button>
              </div>
              <div className="text-[11px] text-zinc-400 mt-2 font-medium flex items-center justify-between">
                <span className="truncate max-w-[110px]">{copiedAdminUpi ? 'Copied to clipboard!' : (paymentConfig.payee_name || 'GearUp Esports')}</span>
                <button
                  type="button"
                  onClick={openEditUpiModal}
                  className="text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer text-xs"
                >
                  Manage UPI
                </button>
              </div>
            </div>
          </div>

          {/* Action Message Alert Banner */}
          {paymentActionMessage && (
            <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between animate-fadeIn ${
              paymentActionMessage.type === 'success'
                ? 'bg-[#5BD19B]/15 border-[#5BD19B]/40 text-[#5BD19B]'
                : 'bg-red-500/15 border-red-500/40 text-red-400'
            }`}>
              <div className="flex items-center gap-2">
                {paymentActionMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{paymentActionMessage.text}</span>
              </div>
              <button onClick={() => setPaymentActionMessage(null)} className="text-zinc-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Controls Bar: Search, Status Filter Pills, Refresh */}
          <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Search by 12-digit UTR, player IGN, username, phone or amount..."
                  className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#5BD19B] transition-colors"
                />
                {paymentSearch && (
                  <button
                    onClick={() => setPaymentSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Configure UPI & QR */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openEditUpiModal}
                  className="text-xs py-2.5 px-3 flex-shrink-0 border-purple-500/40 text-purple-300 hover:bg-purple-500/20"
                  title="Configure official UPI ID and QR code"
                >
                  <QrCode size={14} />
                  <span className="hidden sm:inline ml-1">Configure UPI & QR</span>
                </Button>

                {/* Refresh */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const reqs = await tournamentService.getPaymentRequests();
                    setPaymentRequests(reqs);
                  }}
                  className="text-xs py-2.5 px-3 flex-shrink-0"
                  title="Refresh payment requests"
                >
                  <RefreshCw size={14} />
                  <span className="hidden sm:inline ml-1">Refresh</span>
                </Button>
              </div>
            </div>

            {/* Filter Pills & Counter */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1F324B]">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-xs font-bold uppercase text-zinc-400 mr-1 hidden sm:inline">Status:</span>
                <button
                  type="button"
                  onClick={() => setPaymentStatusFilter('PENDING')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold uppercase transition-colors flex items-center gap-1.5 ${
                    paymentStatusFilter === 'PENDING'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>Pending ({pendingPaymentsCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatusFilter('APPROVED')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold uppercase transition-colors ${
                    paymentStatusFilter === 'APPROVED'
                      ? 'bg-[#5BD19B]/20 text-[#5BD19B] border border-[#5BD19B]/40'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Approved ({paymentRequests.filter(r => r.status === 'APPROVED').length})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatusFilter('REJECTED')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold uppercase transition-colors ${
                    paymentStatusFilter === 'REJECTED'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Rejected ({paymentRequests.filter(r => r.status === 'REJECTED').length})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatusFilter('ALL')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold uppercase transition-colors ${
                    paymentStatusFilter === 'ALL'
                      ? 'bg-[#152234] text-white border border-zinc-500/40'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All ({paymentRequests.length})
                </button>
              </div>

              <div className="text-xs text-zinc-400">
                Showing <strong className="text-white">{filteredPaymentRequests.length}</strong> entries
              </div>
            </div>
          </div>

          {/* Submissions Table / Cards */}
          {filteredPaymentRequests.length === 0 ? (
            <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-12 text-center max-w-lg mx-auto space-y-3">
              <CreditCard size={40} className="mx-auto text-zinc-600" />
              <h3 className="text-lg font-bold font-display uppercase text-white">No Payment Submissions</h3>
              <p className="text-xs text-zinc-400">
                {paymentStatusFilter === 'PENDING'
                  ? 'There are no pending UTR verification requests. When players scan your UPI QR code and submit their 12-digit UTR, their proofs will appear here for 1-click approval.'
                  : 'No payment requests match the current filter.'}
              </p>
            </div>
          ) : (
            <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] overflow-hidden shadow-xl">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1F324B] bg-[#0B131E]/60 text-zinc-400 uppercase font-mono tracking-wider text-[11px]">
                      <th className="py-3.5 px-4 font-bold">#</th>
                      <th className="py-3.5 px-4 font-bold">Player</th>
                      <th className="py-3.5 px-4 font-bold">Amount</th>
                      <th className="py-3.5 px-4 font-bold">12-Digit UPI UTR</th>
                      <th className="py-3.5 px-4 font-bold">Submitted Time</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                      <th className="py-3.5 px-4 font-bold text-right">Verification Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F324B]/50">
                    {filteredPaymentRequests.map((req, idx) => {
                      const isCopied = copiedUtrId === req.id;
                      const isApproving = approvingPaymentId === req.id;
                      const initials = (req.player_ign || req.username || 'P').slice(0, 2).toUpperCase();

                      return (
                        <tr key={req.id} className="hover:bg-[#152234]/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-zinc-500 font-bold">
                            {idx + 1}
                          </td>

                          {/* Player info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4D8EF7] to-[#5BD19B] flex items-center justify-center text-white font-black font-display text-xs shadow-sm flex-shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-white text-sm">
                                  {req.player_ign || req.username}
                                </div>
                                <div className="text-[11px] text-zinc-400">
                                  {req.phone ? `Phone: ${req.phone}` : `@${req.username}`}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4">
                            <span className="text-sm font-black font-display text-[#5BD19B]">
                              ₹{req.amount}
                            </span>
                          </td>

                          {/* 12-Digit UTR with 1-click copy */}
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(req.utr_number);
                                setCopiedUtrId(req.id);
                                setTimeout(() => setCopiedUtrId(null), 2000);
                              }}
                              className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs border transition-all ${
                                isCopied
                                  ? 'bg-[#5BD19B]/20 text-[#5BD19B] border-[#5BD19B]/50'
                                  : 'bg-[#0B131E] text-white border-[#1F324B] hover:border-[#5BD19B]/50'
                              }`}
                              title="Click to copy 12-digit UTR (search in GPay/PhonePe to verify)"
                            >
                              <span className="font-bold">{req.utr_number}</span>
                              {isCopied ? (
                                <Check size={12} className="text-[#5BD19B]" />
                              ) : (
                                <Copy size={12} className="text-zinc-500 group-hover:text-zinc-300" />
                              )}
                            </button>
                          </td>

                          {/* Timestamp */}
                          <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                            {req.submitted_at ? new Date(req.submitted_at).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Recent'}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {req.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <Clock size={11} className="animate-spin" /> Pending Check
                              </span>
                            )}
                            {req.status === 'APPROVED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#5BD19B]/20 text-[#5BD19B] border border-[#5BD19B]/40">
                                <CheckCircle2 size={11} /> Approved
                              </span>
                            )}
                            {req.status === 'REJECTED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/40" title={req.rejection_reason}>
                                <XCircle size={11} /> Declined
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            {req.status === 'PENDING' ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={isApproving}
                                  onClick={() => handleApprovePayment(req)}
                                  className="text-xs py-1.5 px-3 bg-[#5BD19B] text-[#0B131E] font-bold"
                                >
                                  {isApproving ? (
                                    <span>Crediting...</span>
                                  ) : (
                                    <>
                                      <Check size={13} />
                                      <span>Approve ₹{req.amount}</span>
                                    </>
                                  )}
                                </Button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingRequest(req);
                                    setRejectReason('Payment could not be verified in bank records');
                                  }}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors"
                                  title="Reject payment request"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            ) : req.status === 'APPROVED' ? (
                              <span className="text-[11px] text-zinc-400 font-mono">
                                Wallet Credited
                              </span>
                            ) : (
                              <span className="text-[11px] text-zinc-500 truncate max-w-[120px] inline-block" title={req.rejection_reason}>
                                {req.rejection_reason}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-[#1F324B]">
                {filteredPaymentRequests.map((req, idx) => {
                  const isCopied = copiedUtrId === req.id;
                  const isApproving = approvingPaymentId === req.id;
                  const initials = (req.player_ign || req.username || 'P').slice(0, 2).toUpperCase();

                  return (
                    <div key={req.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4D8EF7] to-[#5BD19B] flex items-center justify-center text-white font-black font-display text-xs shadow-sm flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">
                              #{idx + 1} {req.player_ign || req.username}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {req.phone || `@${req.username}`}
                            </div>
                          </div>
                        </div>

                        <span className="text-base font-black font-display text-[#5BD19B]">
                          ₹{req.amount}
                        </span>
                      </div>

                      <div className="bg-[#0B131E] p-2.5 rounded-xl border border-[#1F324B] space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 font-mono text-[11px]">12-Digit UTR:</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(req.utr_number);
                              setCopiedUtrId(req.id);
                              setTimeout(() => setCopiedUtrId(null), 2000);
                            }}
                            className="font-mono font-bold text-white flex items-center gap-1 hover:text-[#5BD19B]"
                          >
                            <span>{req.utr_number}</span>
                            {isCopied ? <Check size={12} className="text-[#5BD19B]" /> : <Copy size={12} />}
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 font-mono text-[11px]">Status:</span>
                          <span className={`font-bold ${
                            req.status === 'APPROVED' ? 'text-[#5BD19B]' : req.status === 'PENDING' ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 font-mono text-[11px]">Submitted:</span>
                          <span className="text-zinc-400 font-mono text-[11px]">
                            {req.submitted_at ? new Date(req.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </span>
                        </div>
                      </div>

                      {req.status === 'PENDING' && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="primary"
                            fullWidth
                            size="sm"
                            disabled={isApproving}
                            onClick={() => handleApprovePayment(req)}
                            className="text-xs py-2 bg-[#5BD19B] text-[#0B131E] font-bold"
                          >
                            {isApproving ? 'Crediting...' : `✓ Approve ₹${req.amount}`}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRejectingRequest(req);
                              setRejectReason('Payment could not be verified in bank records');
                            }}
                            className="text-xs py-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject Payment Request Dialog */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0F1A28] border border-[#1F324B] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F324B]">
              <h3 className="text-base font-bold font-display uppercase text-white flex items-center gap-2">
                <XCircle size={18} className="text-red-400" /> Decline Payment Proof
              </h3>
              <button onClick={() => setRejectingRequest(null)} className="text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="bg-[#0B131E] p-3 rounded-xl border border-[#1F324B] text-xs space-y-1">
              <p className="text-zinc-400">Player: <strong className="text-white">{rejectingRequest.player_ign || rejectingRequest.username}</strong></p>
              <p className="text-zinc-400">Amount: <strong className="text-[#5BD19B]">₹{rejectingRequest.amount}</strong></p>
              <p className="text-zinc-400 font-mono">UTR: <strong className="text-white">{rejectingRequest.utr_number}</strong></p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">
                Reason for Rejection:
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. UTR not found in bank statement"
                className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                fullWidth
                size="sm"
                onClick={() => setRejectingRequest(null)}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                fullWidth
                size="sm"
                disabled={isRejecting}
                onClick={handleConfirmReject}
                className="bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30"
              >
                {isRejecting ? 'Declining...' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Create Tournament */}
      {activeTab === 'create' && (
        <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-5 sm:p-8 max-w-2xl mx-auto shadow-xl">
          <h2 className="text-xl font-black font-display uppercase text-white mb-2">
            Host a New Tournament
          </h2>
          <p className="text-xs text-zinc-400 mb-6">
            Tournaments created here will immediately reflect live across the entire website via WebSocket.
          </p>

          {createSuccess ? (
            <div className="py-10 text-center space-y-3">
              <CheckCircle2 size={40} className="text-[#5BD19B] mx-auto animate-bounce" />
              <h3 className="text-xl font-black font-display uppercase text-white">Tournament Created!</h3>
              <p className="text-xs text-zinc-300">Published to the arena. Players can now register.</p>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Tournament Title</label>
                <input
                  required
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. BGMI MEGA WAR SERIES"
                  className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Game</label>
                  <select
                    value={newGame}
                    onChange={(e) => setNewGame(e.target.value as TournamentGame)}
                    className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]"
                  >
                    <option value="BGMI">BGMI</option>
                    <option value="Free Fire MAX">Free Fire MAX</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Format</label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value as FormatType)}
                    className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]"
                  >
                    <option value="Solo">Solo</option>
                    <option value="Duo">Duo</option>
                    <option value="Squad">Squad</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Date</label>
                  <input
                    required
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Time (IST)</label>
                  <input
                    required
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Entry Fee (₹)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={newEntryFee}
                    onChange={(e) => setNewEntryFee(Number(e.target.value))}
                    className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Total Slots</label>
                  <input
                    required
                    type="number"
                    min="2"
                    value={newSlotsTotal}
                    onChange={(e) => setNewSlotsTotal(Number(e.target.value))}
                    className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]"
                  />
                </div>
              </div>

              {/* Manual Prize Breakdown: 1st, 2nd, 3rd Place */}
              <div className="bg-[#0B131E] border border-[#1F324B] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-[#5BD19B] tracking-wider flex items-center gap-1.5 font-display">
                    <Trophy size={14} /> Manual Prize Distribution
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-300">
                    Total Prize Pool: ₹{(Number(firstPrize) + Number(secondPrize) + Number(thirdPrize)).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-amber-400 mb-1 flex items-center gap-1">
                      🥇 1st Place (₹)
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={firstPrize}
                      onChange={(e) => setFirstPrize(Number(e.target.value))}
                      placeholder="5000"
                      className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1 flex items-center gap-1">
                      🥈 2nd Place (₹)
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={secondPrize}
                      onChange={(e) => setSecondPrize(Number(e.target.value))}
                      placeholder="3000"
                      className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-amber-600 mb-1 flex items-center gap-1">
                      🥉 3rd Place (₹)
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={thirdPrize}
                      onChange={(e) => setThirdPrize(Number(e.target.value))}
                      placeholder="2000"
                      className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Map Name</label>
                <input
                  required
                  type="text"
                  value={newMap}
                  onChange={(e) => setNewMap(e.target.value)}
                  placeholder="e.g. Erangel, Bermuda, Ascent"
                  className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5BD19B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Rules & Notes</label>
                <textarea
                  rows={3}
                  value={newRules}
                  onChange={(e) => setNewRules(e.target.value)}
                  className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#5BD19B]"
                />
              </div>

              <Button type="submit" variant="primary" fullWidth size="lg">
                Publish Tournament to Live Site
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Tab 3: Live Standings / Scoreboard Editor */}
      {activeTab === 'standings' && (
        <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-5 sm:p-8 max-w-4xl mx-auto shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1F324B]">
            <div>
              <h2 className="text-xl font-black font-display uppercase text-white flex items-center gap-2">
                <Trophy size={20} className="text-[#5BD19B]" /> Live Match Standings Editor
              </h2>
              <p className="text-xs text-zinc-400">
                Publish points and kills. Pushes real-time updates directly to all participants viewing the tournament.
              </p>
            </div>

            {/* Select Tournament dropdown */}
            <select
              value={selectedTournamentForStandings?.id || tournaments[0]?.id || ''}
              onChange={(e) => {
                const t = tournaments.find(x => x.id === e.target.value);
                if (t) openStandingsEditor(t);
              }}
              className="bg-[#0B131E] border border-[#1F324B] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#5BD19B]"
            >
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          {standingsSuccess && (
            <div className="p-3 rounded-xl bg-[#5BD19B]/20 border border-[#5BD19B]/40 text-[#5BD19B] text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} /> Standings broadcasted live to all players in the tournament!
            </div>
          )}

          {/* Standings Rows Editor */}
          <div className="space-y-3">
            {standingsRows.map((row, idx) => (
              <div key={idx} className="bg-[#0B131E] p-3.5 rounded-xl border border-[#1F324B] grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-1 text-center font-bold text-[#5BD19B]">
                  #{row.rank}
                </div>
                <div className="sm:col-span-4">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Team / Player</label>
                  <input
                    type="text"
                    value={row.team_name}
                    onChange={(e) => {
                      const updated = [...standingsRows];
                      updated[idx].team_name = e.target.value;
                      setStandingsRows(updated);
                    }}
                    className="w-full bg-[#111C2B] border border-[#1F324B] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Kills</label>
                  <input
                    type="number"
                    value={row.kills}
                    onChange={(e) => {
                      const updated = [...standingsRows];
                      updated[idx].kills = Number(e.target.value);
                      setStandingsRows(updated);
                    }}
                    className="w-full bg-[#111C2B] border border-[#1F324B] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Total Pts</label>
                  <input
                    type="number"
                    value={row.points}
                    onChange={(e) => {
                      const updated = [...standingsRows];
                      updated[idx].points = Number(e.target.value);
                      setStandingsRows(updated);
                    }}
                    className="w-full bg-[#111C2B] border border-[#1F324B] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Prize (₹)</label>
                  <input
                    type="number"
                    value={row.prize_amount || 0}
                    onChange={(e) => {
                      const updated = [...standingsRows];
                      updated[idx].prize_amount = Number(e.target.value);
                      setStandingsRows(updated);
                    }}
                    className="w-full bg-[#111C2B] border border-[#1F324B] rounded-lg px-2.5 py-1.5 text-xs text-[#5BD19B] font-bold"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const nextRank = standingsRows.length + 1;
                setStandingsRows([
                  ...standingsRows,
                  { rank: nextRank, team_name: `Team ${nextRank}`, kills: 0, points: 0, prize_amount: 0 }
                ]);
              }}
              className="text-xs"
            >
              + Add Standing Row
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveStandings}
              className="text-xs ml-auto"
            >
              <Send size={14} /> Broadcast Standings Live
            </Button>
          </div>
        </div>
      )}

      {/* Broadcast Room ID Modal */}
      {selectedTournamentForRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-lg bg-[#0F1A28] border-t sm:border border-[#1F324B] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F324B] mb-4">
              <div>
                <span className="text-[10px] font-bold text-[#4D8EF7] tracking-wider uppercase font-display flex items-center gap-1.5">
                  <Shield size={12} /> {user?.is_admin ? 'Admin' : 'Organiser'} Match Control
                </span>
                <h3 className="text-lg font-black font-display uppercase text-white">
                  Add & Send Room ID & Password
                </h3>
              </div>
              <button
                onClick={() => setSelectedTournamentForRoom(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#152234]"
              >
                <X size={18} />
              </button>
            </div>

            {broadcastSuccess ? (
              <div className="py-4 text-center space-y-3">
                <CheckCircle2 size={40} className="text-[#5BD19B] mx-auto animate-bounce" />
                <div>
                  <h4 className="text-lg font-black font-display uppercase text-white">
                    {dispatchSummary?.isReleased ? 'Credentials Dispatched to Registered Players!' : 'Credentials Saved as Draft!'}
                  </h4>
                  <p className="text-xs text-zinc-300 mt-1">
                    {dispatchSummary?.isReleased
                      ? `Successfully sent Room ID & Password to ${dispatchSummary.count} registered player(s).`
                      : 'Room credentials stored securely. They will not be visible to players until published.'}
                  </p>
                </div>

                {dispatchSummary?.isReleased && dispatchSummary.recipients.length > 0 && (
                  <div className="bg-[#0B131E] border border-[#1F324B] rounded-xl p-3 text-left max-h-40 overflow-y-auto space-y-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      Recipients ({dispatchSummary.recipients.length}):
                    </span>
                    <div className="space-y-1.5">
                      {dispatchSummary.recipients.map((rec, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-[#111C2B] p-2 rounded-lg border border-[#1F324B]">
                          <div>
                            <span className="font-bold text-white">{rec.player_ign}</span>
                            <span className="text-zinc-500 text-[10px] ml-1.5">UID: {rec.player_uid}</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#5BD19B] flex items-center gap-1">
                            <BellRing size={11} /> Sent
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    variant="primary"
                    fullWidth
                    size="md"
                    onClick={() => {
                      setSelectedTournamentForRoom(null);
                      setBroadcastSuccess(false);
                      setDispatchSummary(null);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => handleBroadcastSubmit(e, true)} className="space-y-3.5">
                {/* Target Tournament Banner */}
                <div className="bg-[#0B131E] p-3 rounded-xl border border-[#1F324B] text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Target Tournament</span>
                    <p className="font-bold text-white font-display text-sm truncate">
                      {selectedTournamentForRoom.title}
                    </p>
                  </div>
                  <Badge variant="blue" size="sm">{selectedTournamentForRoom.game}</Badge>
                </div>

                {/* Targeted Registered Players Preview */}
                <div className="bg-[#0B131E]/70 p-3 rounded-xl border border-[#1F324B] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                      <Users size={13} className="text-[#5BD19B]" />
                      Registered Players ({registeredPlayers.length})
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#5BD19B]">
                      {registeredPlayers.length > 0 ? 'Will receive credentials' : 'No registered users yet'}
                    </span>
                  </div>

                  {registeredPlayers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {registeredPlayers.map((p, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-[#152234] border border-[#1F324B] text-[11px] text-white font-medium flex items-center gap-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5BD19B]" />
                          {p.player_ign} {p.team_name ? `(${p.team_name})` : ''}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-400">
                      When players register for this {selectedTournamentForRoom.game} tournament, credentials will be sent to them.
                    </p>
                  )}
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">
                      Room / Lobby ID <span className="text-red-400">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      placeholder="e.g. 882914 or CUSTOM-ROOM-4"
                      className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#4D8EF7] font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">
                      Room Password <span className="text-red-400">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      placeholder="e.g. GEARUP123"
                      className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-[#5BD19B] focus:outline-none focus:border-[#4D8EF7] font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">
                    Slot Instructions / Match Notes
                  </label>
                  <input
                    type="text"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Join your allocated squad slot within 10 mins"
                    className="w-full bg-[#0B131E] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#4D8EF7]"
                  />
                </div>

                {/* Dual Action Buttons */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    disabled={isSubmittingRoom}
                    onClick={(e) => handleBroadcastSubmit(e, false)}
                    className="text-xs"
                  >
                    <Lock size={13} />
                    <span>Save Draft (Unreleased)</span>
                  </Button>

                  <Button
                    type="submit"
                    variant="blue"
                    size="md"
                    disabled={isSubmittingRoom}
                    className="text-xs"
                  >
                    {isSubmittingRoom ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Send to {registeredPlayers.length} Registered</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Edit Prize Distribution */}
      {selectedTournamentForPrizes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0F1A28] border border-[#1F324B] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1F324B] mb-4">
              <div>
                <span className="text-[10px] font-bold text-[#5BD19B] tracking-wider uppercase font-display flex items-center gap-1.5">
                  <Trophy size={13} /> Prize Management
                </span>
                <h3 className="text-lg font-black font-display uppercase text-white">
                  Edit Prize Distribution
                </h3>
              </div>
              <button
                onClick={() => setSelectedTournamentForPrizes(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#152234] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {prizesSaveSuccess ? (
              <div className="py-8 text-center space-y-3 animate-fadeIn">
                <div className="w-12 h-12 rounded-full bg-[#5BD19B]/20 text-[#5BD19B] flex items-center justify-center mx-auto border border-[#5BD19B]/40">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-base font-bold text-white font-display uppercase">Prizes Updated Successfully!</h4>
                <p className="text-xs text-zinc-400">Total prize pool and 1st, 2nd, 3rd place prizes have been saved.</p>
              </div>
            ) : (
              <form onSubmit={handleSavePrizes} className="space-y-4">
                <div className="bg-[#0B131E] p-3 rounded-xl border border-[#1F324B] text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Tournament</span>
                    <p className="font-bold text-white font-display text-sm truncate">
                      {selectedTournamentForPrizes.title}
                    </p>
                  </div>
                  <Badge variant="blue" size="sm">{selectedTournamentForPrizes.game}</Badge>
                </div>

                <div className="space-y-3 bg-[#0B131E] border border-[#1F324B] rounded-xl p-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-amber-400 mb-1 flex items-center justify-between">
                      <span>🥇 1st Place Prize (₹)</span>
                      <span className="text-[10px] text-zinc-400">Winner</span>
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={editFirstPrize}
                      onChange={(e) => setEditFirstPrize(Number(e.target.value))}
                      className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1 flex items-center justify-between">
                      <span>🥈 2nd Place Prize (₹)</span>
                      <span className="text-[10px] text-zinc-400">Runner Up</span>
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={editSecondPrize}
                      onChange={(e) => setEditSecondPrize(Number(e.target.value))}
                      className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-amber-600 mb-1 flex items-center justify-between">
                      <span>🥉 3rd Place Prize (₹)</span>
                      <span className="text-[10px] text-zinc-400">2nd Runner Up</span>
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={editThirdPrize}
                      onChange={(e) => setEditThirdPrize(Number(e.target.value))}
                      className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div className="pt-2 border-t border-[#1F324B] flex items-center justify-between text-xs">
                    <span className="font-bold uppercase text-zinc-400">Total Prize Pool:</span>
                    <span className="text-sm font-black font-display text-[#5BD19B]">
                      ₹{(Number(editFirstPrize) + Number(editSecondPrize) + Number(editThirdPrize)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    fullWidth
                    onClick={() => setSelectedTournamentForPrizes(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    fullWidth
                    disabled={isSavingPrizes}
                  >
                    {isSavingPrizes ? 'Saving...' : 'Save Prize Distribution'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Edit UPI & QR Details */}
      {isEditUpiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0F1A28] border border-[#1F324B] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#1F324B] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white font-display uppercase tracking-wide">
                    Configure Official UPI & QR
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Receive direct UPI payments into your bank account
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditUpiModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#1F324B]/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {editUpiError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{editUpiError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUpiConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span>Official UPI ID (VPA) *</span>
                  <span className="text-[10px] text-purple-400">GPay / PhonePe / Paytm / BHIM</span>
                </label>
                <input
                  required
                  type="text"
                  value={editUpiId}
                  onChange={(e) => setEditUpiId(e.target.value.trim())}
                  placeholder="e.g. 6303134462@axl"
                  className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-purple-400"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Players will send entry fee & wallet top-up payments directly to this UPI address.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-300 mb-1.5">
                  Payee Display Name
                </label>
                <input
                  type="text"
                  value={editPayeeName}
                  onChange={(e) => setEditPayeeName(e.target.value)}
                  placeholder="e.g. GearUp Esports"
                  className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-purple-400"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Shown to players as the verified recipient name in their UPI payment apps.
                </p>
              </div>

              {/* Live Scannable QR Code Preview */}
              <div className="bg-[#0B131E] border border-[#1F324B] rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
                {editUpiQrPreview ? (
                  <div className="p-2 bg-white rounded-xl shadow-md flex-shrink-0">
                    <img src={editUpiQrPreview} alt="Live QR Preview" className="w-28 h-28" />
                  </div>
                ) : (
                  <div className="w-28 h-28 bg-[#111C2B] rounded-xl border border-dashed border-zinc-700 flex items-center justify-center text-zinc-500 flex-shrink-0">
                    <QrCode size={30} />
                  </div>
                )}
                <div className="space-y-1.5 text-center sm:text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5BD19B] bg-[#5BD19B]/10 px-2 py-0.5 rounded border border-[#5BD19B]/30">
                    Live Scannable QR Preview
                  </span>
                  <div className="text-xs text-zinc-300 font-medium">
                    Test scan with your Google Pay, PhonePe, or Paytm app camera to verify.
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono break-all line-clamp-2">
                    pa={editUpiId}&pn={editPayeeName}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#1F324B]">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => setIsEditUpiModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  disabled={isSavingUpiConfig}
                >
                  {isSavingUpiConfig ? 'Saving...' : 'Save & Update QR'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
