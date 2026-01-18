
import React, { useEffect, useState, useRef } from 'react';

interface AIAvatarProps {
  isTalking: boolean;
  volume: number; // 0 to 1
  gender: 'boy' | 'girl';
}

const AIAvatar: React.FC<AIAvatarProps> = ({ isTalking, volume, gender }) => {
  const [blink, setBlink] = useState(false);
  const [sway, setSway] = useState(0);

  // Random Blinking logic
  useEffect(() => {
    const triggerBlink = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
      setTimeout(triggerBlink, Math.random() * 4000 + 1500);
    };
    const timeout = setTimeout(triggerBlink, 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Natural sway motion
  useEffect(() => {
    let frame: number;
    const animate = (time: number) => {
      setSway(Math.sin(time / 1200) * 1.2);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Mouth animation logic
  const mouthHeight = isTalking ? Math.max(2, volume * 18) : 0;
  const mouthWidth = isTalking ? 7 + volume * 3 : 9;

  return (
    <div className="relative w-64 h-64 mx-auto perspective-1000 select-none">
      {/* Glow Behind Avatar */}
      <div className={`absolute inset-0 rounded-full bg-indigo-500/10 blur-[80px] transition-opacity duration-1000 ${isTalking ? 'opacity-100' : 'opacity-40'}`}></div>
      
      <div 
        className="w-full h-full relative transition-transform duration-300 ease-out flex items-center justify-center"
        style={{ transform: `rotateY(${sway}deg) translateY(${Math.sin(Date.now() / 2500) * 3}px)` }}
      >
        <svg 
          viewBox="0 0 200 200" 
          className="w-full h-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.3)]"
        >
          <defs>
            <radialGradient id="cuteSkin" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fff1f1" />
              <stop offset="100%" stopColor="#fee2e2" />
            </radialGradient>
            <linearGradient id="outfitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={gender === 'girl' ? "#a855f7" : "#4f46e5"} />
              <stop offset="100%" stopColor={gender === 'girl' ? "#7e22ce" : "#3730a3"} />
            </linearGradient>
            <filter id="blush">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
            </filter>
          </defs>

          {/* Torso & Professional Cute Outfit */}
          <g transform="translate(0, 10)">
            <path d="M 50 190 Q 50 160 70 155 L 130 155 Q 150 160 150 190 Z" fill="url(#outfitGrad)" />
            <path d="M 70 155 L 100 185 L 130 155 Z" fill="#ffffff" opacity="0.9" />
            <circle cx="100" cy="180" r="1.5" fill={gender === 'girl' ? "#7e22ce" : "#4f46e5"} />
            <circle cx="100" cy="190" r="1.5" fill={gender === 'girl' ? "#7e22ce" : "#4f46e5"} />
          </g>

          {/* Neck */}
          <rect x="92" y="140" width="16" height="18" fill="#fee2e2" />

          {/* Head Shape */}
          <path d="M 70 95 Q 70 40 100 40 Q 130 40 130 95 Q 130 145 100 150 Q 70 145 70 95" fill="url(#cuteSkin)" />
          
          {/* Blush */}
          <circle cx="82" cy="115" r="7" fill="#fecaca" opacity="0.5" filter="url(#blush)" />
          <circle cx="118" cy="115" r="7" fill="#fecaca" opacity="0.5" filter="url(#blush)" />

          {/* Hair Styling */}
          <g>
            {gender === 'girl' ? (
              <path 
                d="M 65 100 Q 60 25 100 25 Q 140 25 135 100 Q 145 140 130 160 Q 120 120 115 100 Q 115 55 100 55 Q 85 55 85 100 Q 80 120 70 160 Q 55 140 65 100" 
                fill="#4a3728" 
              />
            ) : (
              <path 
                d="M 68 95 Q 68 35 100 32 Q 132 35 132 95 Q 130 80 115 75 Q 100 75 85 75 Q 70 80 68 95" 
                fill="#2d1b0d" 
              />
            )}
          </g>

          {/* Large Expressive Eyes */}
          <g>
            {blink ? (
              <g stroke="#8d6e63" strokeWidth="2" strokeLinecap="round">
                <path d="M 78 95 Q 85 95 92 95" />
                <path d="M 108 95 Q 115 95 122 95" />
              </g>
            ) : (
              <g>
                <ellipse cx="85" cy="95" rx="7" ry="6" fill="white" />
                <ellipse cx="115" cy="95" rx="7" ry="6" fill="white" />
                <circle cx="85" cy="95" r="5" fill="#5c4033" />
                <circle cx="115" cy="95" r="5" fill="#5c4033" />
                <circle cx="87" cy="93" r="1.8" fill="white" />
                <circle cx="117" cy="93" r="1.8" fill="white" />
              </g>
            )}
          </g>

          {/* Small Cute Nose */}
          <path d="M 98 112 Q 100 115 102 112" fill="none" stroke="#fca5a5" strokeWidth="1.2" strokeLinecap="round" />

          {/* Mouth */}
          <g transform="translate(100, 132)">
            {isTalking ? (
              <ellipse 
                cx="0" 
                cy="0" 
                rx={mouthWidth} 
                ry={mouthHeight / 2} 
                fill="#991b1b" 
              />
            ) : (
              <path 
                d="M -7 -1 Q 0 3 7 -1" 
                fill="none" 
                stroke="#b91c1c" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
              />
            )}
          </g>
        </svg>
      </div>

      <style>{`
        @keyframes gentlePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.01); }
        }
        .perspective-1000 {
          perspective: 1000px;
        }
        .w-full.h-full.relative {
          animation: gentlePulse 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AIAvatar;
