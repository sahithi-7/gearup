import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, User } from '../../types';
import { tournamentService } from '../../services/tournamentService';
import { socketService } from '../../services/socketService';
import { soundFx } from '../../utils/sound';
import { Send, ShieldCheck, Megaphone, User as UserIcon, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';

interface LobbyChatProps {
  tournamentId: string;
  user: User | null;
  onLoginPrompt?: () => void;
}

export const LobbyChat: React.FC<LobbyChatProps> = ({
  tournamentId,
  user,
  onLoginPrompt
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch initial messages and join socket room
  useEffect(() => {
    let isMounted = true;
    socketService.joinTournament(tournamentId);

    tournamentService.fetchChatMessages(tournamentId).then(msgs => {
      if (isMounted && msgs) {
        setMessages(msgs);
        setTimeout(scrollToBottom, 100);
      }
    });

    const unsubscribe = socketService.onChatMessage((newMsg) => {
      if (newMsg.tournament_id === tournamentId) {
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.user_id !== user?.id) {
          soundFx.playChatPop();
        }
        setTimeout(scrollToBottom, 50);
      }
    });

    return () => {
      isMounted = false;
      socketService.leaveTournament(tournamentId);
      unsubscribe();
    };
  }, [tournamentId, user?.id]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    if (!user) {
      if (onLoginPrompt) onLoginPrompt();
      return;
    }

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const isOrganiser = user.role === 'ORGANISER';
      const shouldBeAnnouncement = isOrganiser && isAnnouncement;

      // Send via service (which calls REST API and emits to socket room)
      await tournamentService.sendChatMessage(tournamentId, {
        user_id: user.id,
        username: user.in_game_name || user.username,
        role: user.role,
        message: text,
        is_announcement: shouldBeAnnouncement
      });

      // Optimistic local add if not already received from socket
      const optimisticMsg: ChatMessage = {
        id: `msg-opt-${Date.now()}`,
        tournament_id: tournamentId,
        user_id: user.id,
        username: user.in_game_name || user.username,
        role: user.role,
        message: text,
        timestamp: new Date().toISOString(),
        is_announcement: shouldBeAnnouncement
      };
      setMessages(prev => {
        if (prev.some(m => m.message === text && m.user_id === user.id)) return prev;
        return [...prev, optimisticMsg];
      });
      setTimeout(scrollToBottom, 50);
    } finally {
      setIsSending(false);
      setIsAnnouncement(false);
    }
  };

  const handleQuickReaction = (quickText: string) => {
    setInputText(quickText);
  };

  return (
    <div className="bg-[#111C2B] rounded-2xl border border-[#1F324B] overflow-hidden flex flex-col h-[520px] shadow-xl">
      {/* Chat Header */}
      <div className="p-4 bg-[#0B131E] border-b border-[#1F324B] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#5BD19B]/20 text-[#5BD19B] flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black font-display uppercase text-white flex items-center gap-2">
              Match Lobby Live Chat
              <span className="w-2 h-2 rounded-full bg-[#5BD19B] animate-ping" />
            </h3>
            <p className="text-[11px] text-zinc-400">
              Live discussion between players and match organizers
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-[#5BD19B] bg-[#5BD19B]/10 px-2 py-0.5 rounded border border-[#5BD19B]/30 font-mono">
            {messages.length} Messages
          </span>
        </div>
      </div>

      {/* Messages List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-zinc-400">
            <UserIcon size={32} className="text-zinc-600 mb-1" />
            <p className="text-sm font-bold text-zinc-300 font-display uppercase">Lobby is quiet</p>
            <p className="text-xs max-w-xs">Be the first to say hello or ask the organizer questions about slot allotments!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = user?.id === msg.user_id;
            const isOrganiser = msg.role === 'ORGANISER';
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (msg.is_announcement) {
              return (
                <div
                  key={msg.id}
                  className="bg-gradient-to-r from-amber-500/15 via-[#152234] to-amber-500/15 border border-amber-500/40 rounded-xl p-3.5 my-2 shadow-lg"
                >
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold uppercase font-display mb-1">
                    <Megaphone size={14} className="animate-bounce" />
                    <span>Official Organiser Announcement</span>
                    <span className="text-zinc-500 text-[10px] ml-auto font-mono">{timeStr}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-100 leading-relaxed font-semibold">
                    {msg.message}
                  </p>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-1 px-1">
                  <span className={`font-bold ${isOrganiser ? 'text-[#4D8EF7]' : isMe ? 'text-[#5BD19B]' : 'text-zinc-300'}`}>
                    {msg.username}
                  </span>
                  {isOrganiser && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#4D8EF7]/20 text-[#4D8EF7] border border-[#4D8EF7]/30 flex items-center gap-0.5">
                      <ShieldCheck size={10} /> HOST
                    </span>
                  )}
                  <span className="text-zinc-500 text-[10px] font-mono">{timeStr}</span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    isMe
                      ? 'bg-[#5BD19B] text-[#0B131E] font-medium rounded-tr-none shadow-md'
                      : isOrganiser
                      ? 'bg-[#182a44] text-white border border-[#4D8EF7]/40 rounded-tl-none shadow-md'
                      : 'bg-[#152234] text-zinc-200 border border-[#1F324B] rounded-tl-none'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reactions Bar */}
      <div className="px-3 py-1.5 bg-[#0B131E]/60 border-t border-[#1F324B] flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
        <span className="text-[10px] uppercase font-bold text-zinc-400 flex-shrink-0">Quick:</span>
        {['Ready! 🔥', 'Slot Confirmed 👍', 'Room ID please! 🔑', 'GGs 🎯'].map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleQuickReaction(chip)}
            className="px-2 py-0.5 rounded-full bg-[#152234] hover:bg-[#1f324b] text-[11px] text-zinc-300 hover:text-white flex-shrink-0 border border-[#1F324B] transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSendMessage} className="p-3 bg-[#0B131E] border-t border-[#1F324B] space-y-2">
        {user?.role === 'ORGANISER' && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-amber-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnnouncement}
                onChange={(e) => setIsAnnouncement(e.target.checked)}
                className="rounded bg-[#111C2B] border-[#1F324B] text-amber-500 focus:ring-0"
              />
              <span className="font-bold flex items-center gap-1">
                <Megaphone size={12} /> Post as Official Announcement
              </span>
            </label>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={user ? "Type your message in lobby..." : "Sign in to chat in lobby..."}
            disabled={!user || isSending}
            className="flex-1 bg-[#111C2B] border border-[#1F324B] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#5BD19B] transition-colors disabled:opacity-50"
          />

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!user || !inputText.trim() || isSending}
            className="px-4 py-2.5 flex-shrink-0"
          >
            <Send size={15} />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
