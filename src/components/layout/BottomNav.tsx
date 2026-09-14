import React from 'react';
import { Home, Trophy, Swords, Shield } from 'lucide-react';

interface BottomNavProps {
  currentPath: string;
  navigate: (path: string) => void;
  registeredCount?: number;
  isAdmin?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentPath,
  navigate,
  registeredCount = 0,
  isAdmin = false
}) => {
  const navItems = [
    {
      label: 'Home',
      path: '/',
      icon: Home
    },
    {
      label: 'Tournaments',
      path: '/tournaments',
      icon: Trophy
    },
    {
      label: 'My Matches',
      path: '/dashboard/player',
      icon: Swords,
      badge: registeredCount > 0 ? registeredCount : undefined
    },
    ...(isAdmin ? [{
      label: 'Organiser',
      path: '/dashboard/organiser',
      icon: Shield
    }] : [])
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B131E]/95 backdrop-blur-xl border-t border-[#1F324B] px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className={`grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} gap-1`}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
          const isOrganiser = item.path === '/dashboard/organiser';
          const activeColor = isOrganiser ? 'text-[#4D8EF7]' : 'text-[#5BD19B]';
          const activeBg = isOrganiser ? 'bg-[#4D8EF7]/10' : 'bg-[#5BD19B]/10';

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 relative ${
                isActive ? `${activeColor} ${activeBg}` : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <Icon size={20} className={isActive ? 'scale-110 transition-transform' : ''} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#5BD19B] text-[#0B131E] font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-display font-bold mt-1 tracking-tight">
                {item.label}
              </span>
              {isActive && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${isOrganiser ? 'bg-[#4D8EF7]' : 'bg-[#5BD19B]'}`} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
