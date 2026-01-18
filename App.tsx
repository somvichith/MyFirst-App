
import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import VoiceConversation from './components/VoiceConversation';
import ChatInterface from './components/ChatInterface';
import VisionAnalyzer from './components/VisionAnalyzer';
import ImageGenerator from './components/ImageGenerator';
import ClothSwapper from './components/ClothSwapper';
import { AppTab, Language } from './types';
import { translations } from './services/translations';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.VOICE);
  const [lang, setLang] = useState<Language>(Language.KHMER);
  const [isMuted, setIsMuted] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const t = translations[lang];
  const musicUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; 

  useEffect(() => {
    const handleFirstInteraction = () => {
      setHasInteracted(true);
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.debug("Play blocked:", e));
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.volume = 0.15;
      if (!isMuted && hasInteracted) {
        audioRef.current.play().catch(err => console.debug("Audio play failed:", err));
      }
    }
  }, [isMuted, hasInteracted]);

  const toggleMute = () => setIsMuted(!isMuted);

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.VOICE: return <VoiceConversation lang={lang} t={t} />;
      case AppTab.CHAT: return <ChatInterface lang={lang} t={t} />;
      case AppTab.VISION: return <VisionAnalyzer lang={lang} t={t} />;
      case AppTab.IMAGE: return <ImageGenerator lang={lang} t={t} />;
      case AppTab.CLOTH_SWAP: return <ClothSwapper lang={lang} t={t} />;
      default: return <VoiceConversation lang={lang} t={t} />;
    }
  };

  return (
    <>
      <audio ref={audioRef} src={musicUrl} loop preload="auto" crossOrigin="anonymous" />
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMuted={isMuted} 
        onToggleMute={toggleMute}
        lang={lang}
        setLang={setLang}
        t={t}
      >
        <div className="h-full">
          {renderContent()}
        </div>
      </Layout>
    </>
  );
};

export default App;
