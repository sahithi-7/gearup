import React from 'react';
import { BrandLogo } from './BrandLogo';
import { ShieldCheck, Zap, Award } from 'lucide-react';

export const Footer: React.FC<{ navigate: (path: string) => void; isAdmin?: boolean }> = ({ navigate, isAdmin = false }) => {
  return (
    <footer className="bg-[#080E17] border-t border-[#1F324B] pt-10 pb-28 md:pb-12 text-zinc-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3 md:col-span-2">
            <BrandLogo size="md" onClick={() => navigate('/')} />
            <p className="text-zinc-400 text-xs sm:text-sm max-w-md leading-relaxed">
              GearUp Esports is the premier competitive tournament ecosystem for mobile gamers.
              Register in seconds, receive verified Room IDs automatically, and compete for verified prize pools.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs text-zinc-300">
              <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-[#5BD19B]" /> 100% Anti-Cheat Verified</span>
              <span className="flex items-center gap-1"><Zap size={14} className="text-[#4D8EF7]" /> Instant Room Codes</span>
              <span className="flex items-center gap-1"><Award size={14} className="text-[#5BD19B]" /> Automated UPI Payouts</span>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-white uppercase text-sm mb-3 tracking-wider">Top Games</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => navigate('/tournaments')} className="hover:text-[#5BD19B] transition-colors">BGMI</button></li>
              <li><button onClick={() => navigate('/tournaments')} className="hover:text-[#5BD19B] transition-colors">Free Fire MAX</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white uppercase text-sm mb-3 tracking-wider">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => navigate('/tournaments')} className="hover:text-[#5BD19B] transition-colors">All Tournaments</button></li>
              <li><button onClick={() => navigate('/dashboard/player')} className="hover:text-[#5BD19B] transition-colors">Leaderboards</button></li>
              {isAdmin && (
                <li><button onClick={() => navigate('/dashboard/organiser')} className="hover:text-[#4D8EF7] transition-colors">Organiser Portal</button></li>
              )}
              <li><span className="text-zinc-500">Terms of Fair Play & Bans</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#1F324B]/60 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-4">
          <p>© 2026 GearUp Esports Platform. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-[#5BD19B] font-semibold">Real-Time Sync Active</span>
            <span>•</span>
            <span>Made for Competitive Gamers</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
