import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Phone, Video, Plus, Mic, Image as ImageIcon, Paperclip, Send, Volume2, MicOff, Grid, VideoOff, Play, Pause, PhoneMissed, Camera, Voicemail } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

type Stage = 
  | 'chat_typing'       // Initial state: Keyboard open, typing allowed
  | 'chat_sent'         // Message sent, keyboard closed, waiting for interaction
  | 'banner_visible'    // Interaction happened, banner showing
  | 'call_fullscreen'   // Banner clicked, full screen call
  | 'black_screen';     // Final state

type Message = {
  id: number;
  text?: string;
  type: 'text' | 'audio' | 'missed_call';
  duration?: string;
  isMe: boolean;
};

// --- Assets & Constants ---

const TARGET_MESSAGE = "Bleib noch da und melde dich, falls Chris auftaucht.";

const INITIAL_MESSAGES: Message[] = [
  { id: 1, type: 'missed_call', isMe: false }, // 1. Mailbox/Verpasster anruf
  { id: 2, type: 'audio', duration: '0:35', isMe: true }, // 2. Sprachnachricht (blau)
  { id: 3, text: "Die melden sich", isMe: true, type: 'text' }, // 3. Die melden sich (blau)
  { id: 4, text: "Wann bist du im Büro?", isMe: false, type: 'text' }, // 4. Wann bist du im Büro? (grau)
  { id: 5, text: "Dauert noch etwas, 15 min - soll ich dir Kaffee mitbringen?", isMe: true, type: 'text' }, // 5. Dauert noch etwas... (blau)
  { id: 6, text: "Wollten die die Unterlagen nicht heute schicken?", isMe: false, type: 'text' }, // 6. Wollten die... (grau)
  { id: 7, text: "Danke", isMe: true, type: 'text' }, // 7. Danke (blau)
];

const PROFILE_IMAGE = "https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/uploads/c26c9a0b-d84f-461a-b022-59c5af2fba7c/1764787172031-cf9e4c1f/1a4a146a-1c82-48a8-95c6-d090207172f4.png";

// Static waveform bars to prevent re-render jitter/movement
const STATIC_WAVEFORM = [40, 70, 45, 90, 55, 80, 35, 60, 85, 50, 75, 40, 65, 45, 50];

// --- Components ---

// 1. iOS Status Bar (Simulated) - NO TIME as requested
const StatusBar = ({ light = false }: { light?: boolean }) => (
  <div className={cn("w-full h-12 flex justify-between items-end px-6 pb-2 text-sm font-medium z-50 absolute top-0 left-0 right-0", light ? "text-white" : "text-black")}>
    <span className="opacity-0">9:41</span>
    <div className="flex items-center gap-1.5">
      <div className="h-3 w-3 bg-current rounded-full opacity-20" />
      <div className="h-3 w-3 bg-current rounded-full opacity-20" />
      <div className="h-3 w-3 bg-current rounded-full opacity-20" />
      <div className="w-6 h-3 border border-current rounded-[4px] relative ml-1">
        <div className="absolute inset-[1px] bg-current rounded-[2px] w-[60%]" />
      </div>
    </div>
  </div>
);

// 2. Audio Message Bubble (Static Waveform)
const AudioBubble = ({ duration, isMe }: { duration?: string, isMe: boolean }) => (
  <div className={cn(
    "flex items-center gap-3 p-3 rounded-2xl min-w-[160px]",
    isMe ? "bg-[#007AFF] text-white rounded-tr-sm" : "bg-[#E9E9EB] text-black rounded-tl-sm"
  )}>
    <button className={cn("h-8 w-8 flex items-center justify-center rounded-full shrink-0", isMe ? "bg-white/20 text-white" : "bg-black/10 text-blue-500")}>
      <Play size={14} className="fill-current ml-0.5" />
    </button>
    <div className="flex-1 flex flex-col justify-center gap-1">
      {/* Static waveform */}
      <div className="h-4 w-full flex items-center gap-[2px] opacity-80">
         {STATIC_WAVEFORM.map((height, i) => (
           <div key={i} className="w-[2px] bg-current rounded-full" style={{ height: `${height}%` }} />
         ))}
      </div>
      <span className="text-[10px] opacity-80 font-medium">{duration}</span>
    </div>
  </div>
);

// 3. Voicemail/Missed Call Bubble
const VoicemailBubble = () => (
  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#E9E9EB] text-black rounded-tl-sm self-start max-w-[85%]">
    <div className="h-9 w-9 flex items-center justify-center bg-white rounded-full shrink-0 shadow-sm border border-gray-100">
      <PhoneMissed size={18} className="text-[#FF3B30]" />
    </div>
    <div className="flex flex-col leading-snug">
      <span className="font-normal text-black text-xs leading-tight mb-1">Mailbox: Der Anrufer hat keine Nachricht hinterlassen:</span>
      <span className="font-bold text-black text-sm">Mara Hermann</span>
      <span className="text-[11px] text-gray-500 font-medium">1 Versuch</span>
    </div>
  </div>
);

// 4. Keyboard + Input Container
const KeyboardWithInput = ({ 
  onKeyPress, 
  onSend, 
  typedText 
}: { 
  onKeyPress: () => void, 
  onSend: () => void,
  typedText: string 
}) => {
  const rows = [
    ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['y', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="absolute bottom-0 left-0 w-full z-40 flex flex-col bg-[#D1D5DB]"
    >
      {/* Input Bar sitting ON TOP of keys */}
      <div className="w-full bg-[#F9F9F9] border-b border-gray-300 p-2 px-3 flex items-end gap-3 min-h-[50px]">
        <div className="h-8 w-8 flex items-center justify-center text-gray-400 shrink-0 mb-0.5">
          <Plus size={24} className="text-[#8E8E93]" />
        </div>
        
        <div className="flex-1 bg-white border border-[#E0E0E0] rounded-[18px] min-h-[34px] px-4 py-1.5 flex items-center text-[17px] shadow-sm mb-0.5">
          {typedText || <span className="text-gray-300">Nachricht</span>}
        </div>

        {typedText.length > 0 ? (
          <button onClick={onSend} className="h-8 w-8 bg-[#007AFF] rounded-full flex items-center justify-center text-white shrink-0 mb-0.5 transition-all">
            <Send size={14} className="ml-0.5" />
          </button>
        ) : (
           <div className="h-8 w-8 flex items-center justify-center text-gray-400 shrink-0 gap-3 mb-0.5">
             <Camera size={24} className="text-[#8E8E93]" />
             <Mic size={24} className="text-[#8E8E93]" />
           </div>
        )}
      </div>

      {/* Keyboard Keys */}
      <div className="pb-8 pt-2 px-1 w-full">
        <div className="flex flex-col gap-2">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1.5 px-1">
              {row.map((key) => (
                <button
                  key={key}
                  onClick={onKeyPress}
                  className="bg-white h-[42px] rounded-[5px] shadow-[0_1px_0_rgba(0,0,0,0.3)] flex items-center justify-center text-[22px] font-normal tracking-tight text-black font-[system-ui]"
                  style={{ width: rowIndex === 1 ? '9%' : '9%' }}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
          
          <div className="flex justify-center gap-1.5 px-1 mt-1">
            <button className="bg-[#B3B6BE] h-[42px] rounded-[5px] w-[12%] flex items-center justify-center shadow-[0_1px_0_rgba(0,0,0,0.3)] font-medium text-sm text-black">123</button>
            <button onClick={onKeyPress} className="bg-white h-[42px] rounded-[5px] w-[55%] shadow-[0_1px_0_rgba(0,0,0,0.3)] flex items-center justify-center text-sm text-gray-500">Leertaste</button>
            <button onClick={onSend} className="bg-[#B3B6BE] h-[42px] rounded-[5px] w-[20%] flex items-center justify-center font-medium shadow-[0_1px_0_rgba(0,0,0,0.3)] text-sm text-black">Return</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// 5. Incoming Call Banner (Turquoise)
const CallBanner = ({ onClick }: { onClick: () => void }) => (
  <motion.div
    initial={{ y: -100, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="absolute top-20 left-4 right-4 h-24 bg-gradient-to-r from-[#29D9D5] to-[#24C6DC] rounded-2xl shadow-2xl z-50 flex items-center px-4 gap-3 cursor-pointer"
    onClick={onClick}
  >
    <div className="flex-1 text-white">
      <div className="flex items-center gap-2 mb-1">
        <Phone size={14} className="fill-current text-white/80" />
        <span className="text-sm text-white/80">Eingehender Anruf</span>
      </div>
      <div className="font-bold text-2xl tracking-wide">JOHANNA STERN</div>
    </div>
    <div className="flex gap-3">
      <button className="w-12 h-12 rounded-full bg-[#FF3B30] flex items-center justify-center text-white shadow-md">
        <Phone size={22} className="rotate-[135deg]" />
      </button>
      <button className="w-12 h-12 rounded-full bg-[#30D158] flex items-center justify-center text-white shadow-md">
        <Phone size={22} />
      </button>
    </div>
  </motion.div>
);

// 6. Full Screen Call (Turquoise)
const FullScreenCall = () => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="absolute inset-0 z-50 flex flex-col items-center pt-24 pb-12 px-8 bg-gradient-to-b from-[#29D9D5] to-[#24C6DC] text-white"
  >
    <StatusBar light />
    
    <div className="flex flex-col items-center gap-4 mt-8">
      <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-medium text-white">JS</div>
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-3xl font-medium tracking-tight">JOHANNA STERN</h1>
        <span className="text-white/80 text-lg">Anruf</span>
      </div>
    </div>

    <div className="mt-auto w-full max-w-[300px] grid grid-cols-3 gap-x-8 gap-y-8 place-items-center mb-16">
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><Volume2 size={28} /></div>
        <span className="text-xs">Audio</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><VideoOff size={28} /></div>
        <span className="text-xs">Video</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><MicOff size={28} /></div>
        <span className="text-xs">Stumm</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><Grid size={28} /></div>
        <span className="text-xs">Ziffernblock</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><Phone size={28} className="rotate-[135deg]" /></div>
        <span className="text-xs">Ende</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><Grid size={28} /></div>
        <span className="text-xs">Kontakte</span>
      </div>
    </div>

    <button className="w-20 h-20 rounded-full bg-[#FF3B30] flex items-center justify-center shadow-lg mb-8">
      <Phone size={36} className="text-white rotate-[135deg]" />
    </button>
  </motion.div>
);

export function IPhoneSimulation() {
  const [stage, setStage] = useState<Stage>('chat_typing');
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);

  // Scroll to bottom ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Double tap detection
  const lastTapRef = useRef<number>(0);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
       messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    // Delay slightly to ensure rendering is done
    setTimeout(scrollToBottom, 100);
  }, [messages, stage]);

  // Handle typing effect
  const handleKeyPress = () => {
    if (stage !== 'chat_typing') return;
    
    const nextCharIndex = inputText.length;
    if (nextCharIndex < TARGET_MESSAGE.length) {
      setInputText(TARGET_MESSAGE.slice(0, nextCharIndex + 1));
    }
  };

  // Handle sending message
  const handleSend = () => {
    if (inputText.length === 0) return;
    setMessages([...messages, { id: Date.now(), text: inputText, isMe: true, type: 'text' }]);
    setInputText("");
    setStage('chat_sent');
  };

  // Handle interaction in lower third to show banner
  const handleLowerThirdClick = () => {
    if (stage === 'chat_sent') {
      setStage('banner_visible');
    }
  };

  // Handle banner click
  const handleBannerClick = () => {
    setStage('call_fullscreen');
  };

  // Auto transition to black screen
  useEffect(() => {
    if (stage === 'call_fullscreen') {
      const timer = setTimeout(() => {
        setStage('black_screen');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  // Handle double tap on black screen to restart
  const handleBlackScreenTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // milliseconds

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected - reset everything
      setStage('chat_typing');
      setInputText("");
      setMessages(INITIAL_MESSAGES);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <div className="w-full h-full bg-white flex flex-col font-sans overflow-hidden">
      {/* iPhone Frame Container - Removed extra wrappers/constraints */}
      <div className="relative w-full h-full bg-white overflow-hidden">
        
        {/* Black Screen State */}
        {stage === 'black_screen' && (
          <div
            className="absolute inset-0 bg-black z-[100] cursor-pointer"
            onClick={handleBlackScreenTap}
          />
        )}

        {/* Full Screen Call State */}
        <AnimatePresence>
          {stage === 'call_fullscreen' && <FullScreenCall />}
        </AnimatePresence>

        {/* Main Messenger UI */}
        <div className="flex flex-col h-full bg-white relative">
          <StatusBar />
          
          {/* Header */}
          <div className="h-24 pt-10 pb-2 px-4 flex items-center justify-between bg-[#F5F5F5]/90 backdrop-blur-xl border-b border-gray-200 z-30 absolute top-0 left-0 right-0">
            <div className="flex items-center gap-1 text-[#007AFF]">
              <ChevronLeft size={26} />
              <span className="text-lg"></span>
            </div>
            
            <div className="flex flex-col items-center flex-1 mx-4">
              <div className="relative">
                <img src={PROFILE_IMAGE} alt="Mara" className="w-10 h-10 rounded-full object-cover" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-gray-300 border-2 border-white rounded-full" />
              </div>
              <div className="flex flex-col items-center -mt-0.5">
                <span className="text-xs font-semibold">Mara Hermann</span>
                <span className="text-[10px] text-gray-400">Offline</span>
              </div>
            </div>

            <div className="flex items-center gap-5 text-[#007AFF]">
              <Phone size={20} className="fill-current" />
              <Video size={24} className="fill-current" />
            </div>
          </div>

          {/* Messages Area - Increased spacing/gap to fill screen as requested */}
          <div 
            className="flex-1 bg-white p-4 overflow-y-auto pt-28 flex flex-col gap-6 scrollbar-hide" 
            onClick={handleLowerThirdClick}
            style={{ paddingBottom: stage === 'chat_typing' ? '320px' : '100px' }}
          >
             {/* Date Separator */}
            <div className="text-center text-xs text-gray-400 font-medium py-2">Heute</div>
            
            {messages.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex w-full", msg.isMe ? "justify-end" : "justify-start")}
              >
                {msg.type === 'text' && (
                  <div className={cn("max-w-[80%] px-3.5 py-2 rounded-[18px] text-[16px] leading-snug", 
                    msg.isMe 
                      ? "bg-[#007AFF] text-white rounded-tr-sm" 
                      : "bg-[#E9E9EB] text-black rounded-tl-sm"
                  )}>
                    {msg.text}
                  </div>
                )}
                
                {msg.type === 'audio' && (
                  <AudioBubble duration={msg.duration} isMe={msg.isMe} />
                )}

                {msg.type === 'missed_call' && (
                  <VoicemailBubble />
                )}
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Call Banner Overlay */}
          <AnimatePresence>
            {stage === 'banner_visible' && (
              <CallBanner onClick={handleBannerClick} />
            )}
          </AnimatePresence>

          {/* Static Input Area (Visible when keyboard is hidden) */}
          {stage !== 'chat_typing' && (
             <div className="bg-[#F9F9F9] border-t border-gray-200 p-2 px-3 flex items-end gap-3 pb-8 absolute bottom-0 left-0 right-0 z-20">
                <div className="h-8 w-8 flex items-center justify-center text-gray-400 shrink-0 mb-0.5">
                   <Plus size={24} className="text-[#8E8E93]" />
                </div>
                <div className="flex-1 bg-white border border-[#E0E0E0] rounded-[18px] min-h-[34px] px-4 py-1.5 flex items-center text-[17px] shadow-sm mb-0.5 text-gray-400">
                   Nachricht
                </div>
                <div className="h-8 w-8 flex items-center justify-center text-gray-400 shrink-0 gap-3 mb-0.5">
                   <Camera size={24} className="text-[#8E8E93]" />
                   <Mic size={24} className="text-[#8E8E93]" />
                </div>
             </div>
          )}
        </div>

        {/* Virtual Keyboard with Attached Input - Slides up together */}
        <AnimatePresence>
          {stage === 'chat_typing' && (
            <KeyboardWithInput 
              onKeyPress={handleKeyPress} 
              onSend={handleSend}
              typedText={inputText}
            />
          )}
        </AnimatePresence>

        {/* Invisible Overlay for "Lower Third" Click Detection when not typing */}
        {stage === 'chat_sent' && (
          <div 
            className="absolute bottom-0 left-0 right-0 h-[33%] z-20 cursor-pointer bg-transparent"
            onClick={handleLowerThirdClick}
          />
        )}
      </div>
    </div>
  );
}

export default IPhoneSimulation;