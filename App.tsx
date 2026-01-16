
import React, { useState, useRef, useEffect } from 'react';
import Layout from './components/Layout';
import VoiceConversation from './components/VoiceConversation';
import ChatInterface from './components/ChatInterface';
import VisionAnalyzer from './components/VisionAnalyzer';
import ImageGenerator from './components/ImageGenerator';
import { AppTab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.VOICE);
  const [isMuted, setIsMuted] = useState(true); // Default muted
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Background music setup
  const musicUrl = "https://assets.mixkit.co/music/preview/mixkit-lo-fi-night-chill-loop-617.mp3";

  useEffect(() => {
    const handleFirstInteraction = () => {
      setHasInteracted(true);
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.volume = 0.25;
      if (!isMuted && hasInteracted) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [isMuted, hasInteracted]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.VOICE:
        return <VoiceConversation />;
      case AppTab.CHAT:
        return <ChatInterface />;
      case AppTab.VISION:
        return <VisionAnalyzer />;
      case AppTab.IMAGE:
        return <ImageGenerator />;
      default:
        return <VoiceConversation />;
    }
  };

  return (
    <>
      <audio 
        ref={audioRef} 
        src={musicUrl} 
        loop 
        preload="auto"
        crossOrigin="anonymous"
      />
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMuted={isMuted} 
        onToggleMute={toggleMute}
      >
        <div className="h-full">
          {renderContent()}
        </div>
      </Layout>
    </>
  );
};

export default App;
