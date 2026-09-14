import React, { useEffect, useState } from 'react';
import type { MatchStanding } from '../../types';
import { socketService } from '../../services/socketService';
import { tournamentService } from '../../services/tournamentService';
import { Trophy, Swords, Target } from 'lucide-react';

interface LeaderboardTableProps {
  tournamentId: string;
  initialStandings?: MatchStanding[];
  prizePool: number;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  tournamentId,
  initialStandings,
  prizePool
}) => {
  const [standings, setStandings] = useState<MatchStanding[]>(initialStandings || []);

  useEffect(() => {
    let isMounted = true;
    tournamentService.fetchStandings(tournamentId).then(data => {
      if (isMounted && data && data.length > 0) {
        setStandings(data);
      }
    });

    const unsubscribe = socketService.onStandingsUpdated((payload) => {
      if (payload.tournament_id === tournamentId) {
        setStandings(payload.standings);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [tournamentId]);

  if (!standings || standings.length === 0) {
    return (
      <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#152234] border border-[#1F324B] flex items-center justify-center mx-auto text-zinc-400">
          <Trophy size={22} className="text-zinc-500" />
        </div>
        <h4 className="text-base font-bold font-display uppercase text-white">
          Standings Pending Match Conclusion
        </h4>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
          The organizer will publish the verified scores, kills, and points table here once the custom room battle concludes.
        </p>
      </div>
    );
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center font-black font-display text-xs shadow-md">
          🥇 1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-7 h-7 rounded-lg bg-slate-300/20 text-slate-200 border border-slate-300/40 flex items-center justify-center font-black font-display text-xs shadow-md">
          🥈 2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-7 h-7 rounded-lg bg-amber-700/20 text-amber-500 border border-amber-700/40 flex items-center justify-center font-black font-display text-xs shadow-md">
          🥉 3
        </span>
      );
    }
    return (
      <span className="w-7 h-7 rounded-lg bg-[#152234] text-zinc-400 flex items-center justify-center font-bold font-mono text-xs">
        #{rank}
      </span>
    );
  };

  return (
    <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-[#0B131E] border-b border-[#1F324B] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#5BD19B]/20 text-[#5BD19B] flex items-center justify-center">
            <Trophy size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black font-display uppercase text-white flex items-center gap-2">
              Official Match Scoreboard
              <span className="text-[10px] bg-[#5BD19B]/20 text-[#5BD19B] px-2 py-0.5 rounded font-mono font-bold">
                LIVE SYNC
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Verified kill points, placement score, and cash payout awards
            </p>
          </div>
        </div>

        <div className="hidden sm:block text-right">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Total Pool</span>
          <p className="text-sm font-black font-display text-[#5BD19B]">₹{prizePool.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0e1724] text-zinc-400 uppercase font-display tracking-wider text-[10px] border-b border-[#1F324B]">
            <tr>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Team Name</th>
              <th className="py-3 px-4 text-center">
                <span className="flex items-center justify-center gap-1">
                  <Target size={12} /> Kills
                </span>
              </th>
              <th className="py-3 px-4 text-center">
                <span className="flex items-center justify-center gap-1">
                  <Swords size={12} /> Pts
                </span>
              </th>
              <th className="py-3 px-4 text-right">Prize Payout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F324B]/50 font-medium">
            {standings.map((row) => (
              <tr
                key={row.rank}
                className={`hover:bg-[#152234]/50 transition-colors ${
                  row.rank <= 3 ? 'bg-[#152234]/20' : ''
                }`}
              >
                <td className="py-3 px-4 font-bold">{getRankBadge(row.rank)}</td>
                <td className="py-3 px-4">
                  <p className="font-bold text-white font-display text-sm tracking-wide">{row.team_name}</p>
                </td>
                <td className="py-3 px-4 text-center font-mono font-bold text-zinc-200">
                  {row.kills}
                </td>
                <td className="py-3 px-4 text-center font-mono font-black text-[#5BD19B] text-sm">
                  {row.points}
                </td>
                <td className="py-3 px-4 text-right font-bold">
                  {row.prize_amount && row.prize_amount > 0 ? (
                    <span className="text-[#5BD19B] font-display font-black text-sm">
                      ₹{row.prize_amount.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-zinc-500">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
