
import React, { useMemo } from 'react';

interface AIAvatarProps {
  isTalking: boolean;
  volume: number; // 0 to 1
  gender: 'boy' | 'girl';
}

const AIAvatar: React.FC<AIAvatarProps> = ({ isTalking, volume, gender }) => {
  // Map volume to mouth opening height (0 to 15 units)
  const mouthOpening = isTalking ? Math.max(2, volume * 18) : 0;
  
  // Cat colors based on "gender" (voice profile)
  const primaryColor = gender === 'girl' ? '#FEE2E2' : '#E0E7FF'; // Pinkish vs Bluish
  const secondaryColor = gender === 'girl' ? '#FCA5A5' : '#93C5FD';
  const earColor = gender === 'girl' ? '#FECACA' : '#BFDBFE';

  return (
    <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
      {/* Background Glow */}
      <div 
        className="absolute inset-0 rounded-full transition-all duration-300 ease-out blur-3xl opacity-20"
        style={{
          background: isTalking ? 'rgba(99, 102, 241, 0.8)' : 'rgba(99, 102, 241, 0.2)',
          transform: `scale(${1 + volume * 0.5})`
        }}
      ></div>

      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl relative z-10 overflow-visible">
        <defs>
          <linearGradient id="catGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
          <clipPath id="mouthClip">
            <rect x="80" y="135" width="40" height="30" rx="10" />
          </clipPath>
        </defs>

        {/* Ears with twitch animation */}
        <g className={isTalking ? 'animate-ear-twitch' : ''}>
          <path d="M50 80 L30 30 L80 60 Z" fill={earColor} />
          <path d="M150 80 L170 30 L120 60 Z" fill={earColor} />
        </g>

        {/* Head */}
        <circle cx="100" cy="100" r="75" fill="url(#catGradient)" />

        {/* Cheeks */}
        <circle cx="65" cy="125" r="15" fill="#FFB6C1" opacity="0.4" />
        <circle cx="135" cy="125" r="15" fill="#FFB6C1" opacity="0.4" />

        {/* Eyes with blinking */}
        <g className="animate-blink">
          <circle cx="70" cy="90" r="8" fill="#1F2937" />
          <circle cx="130" cy="90" r="8" fill="#1F2937" />
          <circle cx="73" cy="87" r="3" fill="white" />
          <circle cx="133" cy="87" r="3" fill="white" />
        </g>

        {/* Nose */}
        <path d="M95 115 L105 115 L100 122 Z" fill="#F472B6" />

        {/* Whiskers */}
        <g stroke="#94A3B8" strokeWidth="2" strokeLinecap="round">
          <line x1="60" y1="115" x2="30" y2="110" />
          <line x1="60" y1="125" x2="30" y2="125" />
          <line x1="140" y1="115" x2="170" y2="110" />
          <line x1="140" y1="125" x2="170" y2="125" />
        </g>

        {/* Lip-Syncing Mouth */}
        <g transform="translate(100, 135)">
          {/* Static upper lip part */}
          <path 
            d="M-15 0 C-15 8, -2 12, 0 12 C2 12, 15 8, 15 0" 
            fill="none" 
            stroke="#1F2937" 
            strokeWidth="3" 
            strokeLinecap="round" 
          />
          
          {/* Dynamic inner mouth (reactive to volume) */}
          <ellipse 
            cx="0" 
            cy={5 + mouthOpening/2} 
            rx="8" 
            ry={mouthOpening} 
            fill="#EF4444" 
            className="transition-all duration-75"
          />
        </g>
      </svg>

      {/* Floating status badge */}
      {isTalking && (
        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-bounce shadow-xl">
          MIAW!
        </div>
      )}

      <style>{`
        @keyframes ear-twitch {
          0%, 90%, 100% { transform: rotate(0deg); }
          95% { transform: rotate(-5deg); }
        }
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        .animate-ear-twitch {
          animation: ear-twitch 4s infinite;
          transform-origin: center;
        }
        .animate-blink {
          animation: blink 5s infinite;
          transform-origin: 100px 90px;
        }
      `}</style>
    </div>
  );
};

export default AIAvatar;
