import React, { useState } from 'react';
import type { Tournament, GameType, FormatType, User } from '../types';
import { TournamentCard } from '../components/tournaments/TournamentCard';
import { GameFilterBar } from '../components/tournaments/GameFilterBar';
import { Search, X, SlidersHorizontal } from 'lucide-react';

interface MarketplaceViewProps {
  tournaments: Tournament[];
  user: User | null;
  navigate: (path: string) => void;
  onOpenRegistration: (tournament: Tournament) => void;
  isUserRegistered: (tournamentId: string) => boolean;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  tournaments,
  user,
  navigate,
  onOpenRegistration,
  isUserRegistered
}) => {
  const [search, setSearch] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameType>('All');
  const [selectedFormat, setSelectedFormat] = useState<FormatType | 'All'>('All');
  const [feeType, setFeeType] = useState<'All' | 'FREE' | 'PAID'>('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  // Compute game and status counts
  const counts: Record<string, number> = {};
  let activeCount = 0;
  let completedCount = 0;

  tournaments.forEach(t => {
    counts[t.game] = (counts[t.game] || 0) + 1;
    if (t.status === 'COMPLETED') {
      completedCount += 1;
    } else {
      activeCount += 1;
    }
  });

  // Filter tournaments
  const filtered = tournaments.filter(t => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.game.toLowerCase().includes(search.toLowerCase()) ||
      t.organiser_name.toLowerCase().includes(search.toLowerCase());

    const matchesGame = selectedGame === 'All' || t.game === selectedGame;
    const matchesFormat = selectedFormat === 'All' || t.format === selectedFormat;
    const matchesFee =
      feeType === 'All' ||
      (feeType === 'FREE' && t.entry_fee === 0) ||
      (feeType === 'PAID' && t.entry_fee > 0);

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? t.status !== 'COMPLETED'
        : t.status === 'COMPLETED';

    return matchesSearch && matchesGame && matchesFormat && matchesFee && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
      {/* Title & Search Area */}
      <div>
        <h1 className="text-2xl sm:text-4xl font-black font-display text-white uppercase tracking-tight mb-2">
          Tournament Arena
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400">
          Find and join open tournaments. Filter by your game, squad size, or entry fee.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tournament, game, or host..."
          className="w-full bg-[#111C2B] border border-[#1F324B] rounded-xl py-3 pl-11 pr-10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#5BD19B] transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Game Filter Bar */}
      <GameFilterBar
        selectedGame={selectedGame}
        onSelectGame={setSelectedGame}
        tournamentCounts={counts}
      />

      {/* Secondary Filters Bar (Status, Format, Fee, and Hide Completed) */}
      <div className="space-y-3 pt-2 pb-1 border-b border-[#1F324B]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-zinc-400 uppercase mr-1 hidden sm:inline">Status:</span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-[#152234] text-[#5BD19B] border border-[#5BD19B]/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Matches ({tournaments.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                statusFilter === 'ACTIVE'
                  ? 'bg-[#152234] text-[#4D8EF7] border border-[#4D8EF7]/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Active ({activeCount})
            </button>
            {completedCount > 0 && (
              <button
                onClick={() => setStatusFilter('COMPLETED')}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                  statusFilter === 'COMPLETED'
                    ? 'bg-[#152234] text-amber-400 border border-amber-500/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Completed ({completedCount})
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Format Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-zinc-400 uppercase mr-1 hidden sm:inline">Format:</span>
            {(['All', 'Solo', 'Duo', 'Squad'] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                  selectedFormat === fmt
                    ? 'bg-[#152234] text-[#5BD19B] border border-[#5BD19B]/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Fee Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase mr-1 hidden sm:inline">Entry:</span>
            {(['All', 'FREE', 'PAID'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFeeType(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                  feeType === type
                    ? 'bg-[#152234] text-[#4D8EF7] border border-[#4D8EF7]/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold">
        <div className="flex items-center gap-2">
          <span>Showing {filtered.length} matches</span>
        </div>
        {(search || selectedGame !== 'All' || selectedFormat !== 'All' || feeType !== 'All' || statusFilter !== 'ALL') && (
          <button
            onClick={() => {
              setSearch('');
              setSelectedGame('All');
              setSelectedFormat('All');
              setFeeType('All');
              setStatusFilter('ALL');
            }}
            className="text-[#5BD19B] hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-10 text-center max-w-md mx-auto space-y-3">
          <SlidersHorizontal size={32} className="mx-auto text-zinc-500" />
          <h3 className="text-lg font-bold font-display uppercase text-white">No Tournaments Found</h3>
          <p className="text-xs text-zinc-400">
            No matches found for your current filter combinations. Try selecting another game or resetting your search.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
            <button
              onClick={() => {
                setSearch('');
                setSelectedGame('All');
                setSelectedFormat('All');
                setFeeType('All');
                setStatusFilter('ALL');
              }}
              className="text-xs font-bold text-[#5BD19B] underline px-2 py-1"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filtered.map(tournament => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              isRegistered={user ? isUserRegistered(tournament.id) : false}
              onClick={() => navigate(`/tournament/${tournament.id}`)}
              onRegisterClick={() => onOpenRegistration(tournament)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
