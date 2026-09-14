import React from 'react';
import type { Tournament, User } from '../types';
import { Button } from '../components/common/Button';
import { ArrowRight } from 'lucide-react';

interface HomeViewProps {
  tournaments?: Tournament[];
  user: User | null;
  navigate: (path: string) => void;
  onOpenRegistration?: (tournament: Tournament) => void;
  isUserRegistered?: (tournamentId: string) => boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  user,
  navigate,
}) => {
  const isAdmin = Boolean(user?.is_admin || user?.role === 'ADMIN');

  return (
    <div className="space-y-8 sm:space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 sm:pt-16 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 border-b border-[#1F324B]/50">
        {/* Neon Glow Blobs in brand mint & blue */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-[#5BD19B]/15 rounded-full blur-[90px] sm:blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[250px] sm:w-[450px] h-[250px] sm:h-[450px] bg-[#4D8EF7]/15 rounded-full blur-[90px] sm:blur-[130px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111C2B] border border-[#1F324B] text-[11px] sm:text-xs font-bold font-display uppercase tracking-wider text-[#5BD19B] mb-5 shadow-[0_0_20px_rgba(91,209,155,0.2)]">
            <span className="w-2 h-2 rounded-full bg-[#5BD19B] animate-ping" />
            <span>Competitive Mobile Esports</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-display tracking-tight text-white uppercase leading-[1.1] mb-4 sm:mb-6">
            Compete. Dominate. <br />
            <span className="text-[#5BD19B] drop-shadow-[0_0_25px_rgba(91,209,155,0.4)]">
              Win Real Prizes.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-zinc-300 max-w-xl mx-auto mb-6 sm:mb-8 leading-relaxed font-sans">
            Join daily verified tournaments for <strong className="text-white">BGMI</strong> and{' '}
            <strong className="text-white">Free Fire MAX</strong>.
            Instant room codes delivered directly to your device.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigate('/tournaments')}
              className="sm:w-auto text-sm sm:text-base py-3 sm:py-3.5"
            >
              <span>Browse All Tournaments</span>
              <ArrowRight size={18} />
            </Button>
            {isAdmin && (
              <Button
                variant="outline-blue"
                size="lg"
                fullWidth
                onClick={() => navigate('/dashboard/organiser')}
                className="sm:w-auto text-sm sm:text-base py-3 sm:py-3.5"
              >
                <span>Host a Tournament</span>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* How It Works 3-Step Guide */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="bg-[#111C2B] rounded-3xl border border-[#1F324B] p-6 sm:p-10 relative overflow-hidden">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h3 className="text-xl sm:text-2xl font-black font-display text-white uppercase tracking-tight mb-2">
              How GearUp Works
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              Simple 3-step match participation designed for mobile gamers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0B131E] p-5 rounded-2xl border border-[#1F324B] relative">
              <div className="w-10 h-10 rounded-xl bg-[#5BD19B]/15 text-[#5BD19B] flex items-center justify-center font-display font-black text-lg mb-3">
                1
              </div>
              <h4 className="text-base font-bold font-display uppercase text-white mb-1">
                Choose & Register
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Browse free or paid tournaments for your favorite game. Enter your IGN and phone number in seconds.
              </p>
            </div>

            <div className="bg-[#0B131E] p-5 rounded-2xl border border-[#1F324B] relative">
              <div className="w-10 h-10 rounded-xl bg-[#4D8EF7]/15 text-[#4D8EF7] flex items-center justify-center font-display font-black text-lg mb-3">
                2
              </div>
              <h4 className="text-base font-bold font-display uppercase text-white mb-1">
                Get Room ID & Password
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                15 minutes before match time, the credentials unlock in your dashboard and are sent via SMS.
              </p>
            </div>

            <div className="bg-[#0B131E] p-5 rounded-2xl border border-[#1F324B] relative">
              <div className="w-10 h-10 rounded-xl bg-[#5BD19B]/15 text-[#5BD19B] flex items-center justify-center font-display font-black text-lg mb-3">
                3
              </div>
              <h4 className="text-base font-bold font-display uppercase text-white mb-1">
                Compete & Win Prizes
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Join the custom lobby, play fair, and win cash prizes paid straight to your verified UPI handle.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
