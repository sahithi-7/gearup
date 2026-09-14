import React from 'react';
import type { GameType } from '../../types';
import { Gamepad2, Flame, ShieldAlert } from 'lucide-react';

interface GameFilterBarProps {
  selectedGame: GameType;
  onSelectGame: (game: GameType) => void;
  tournamentCounts?: Record<string, number>;
}

export const GameFilterBar: React.FC<GameFilterBarProps> = ({
  selectedGame,
  onSelectGame,
  tournamentCounts = {}
}) => {
  const games: { id: GameType; name: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { id: 'All', name: 'All Games', icon: Gamepad2 },
    { id: 'BGMI', name: 'BGMI', icon: Flame },
    { id: 'Free Fire MAX', name: 'Free Fire MAX', icon: ShieldAlert },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth">
        {games.map(game => {
          const Icon = game.icon;
          const isSelected = selectedGame === game.id;
          const count = game.id === 'All'
            ? Object.values(tournamentCounts).reduce((a, b) => a + b, 0)
            : tournamentCounts[game.id] || 0;

          return (
            <button
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-all duration-200 border select-none ${
                isSelected
                  ? 'bg-[#5BD19B] text-[#0B131E] border-[#5BD19B] shadow-[0_0_15px_rgba(91,209,155,0.35)] scale-[1.02]'
                  : 'bg-[#111C2B] text-zinc-300 border-[#1F324B] hover:border-[#5BD19B]/40 hover:text-white'
              }`}
            >
              <Icon size={16} className={isSelected ? 'text-[#0B131E]' : 'text-[#5BD19B]'} />
              <span>{game.name}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected ? 'bg-[#0B131E] text-[#5BD19B]' : 'bg-[#152234] text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
