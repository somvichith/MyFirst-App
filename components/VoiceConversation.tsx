
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { decode, decodeAudioData, encode, createBlob } from '../services/audioUtils';
import AIAvatar from './AIAvatar';

interface VoiceConversationProps {
  lang: string;
  t: any;
}

type VoiceOption = {
  id: 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede';
  label: string;
  gender: 'boy' | 'girl';
  desc: string;
};

const VoiceConversation: React.FC<VoiceConversationProps> = ({ lang, t }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption['id']>('Kore');
  const [speed, setSpeed] = useState<number>(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isTalking, setIsTalking] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const voices: VoiceOption[] = [
    { id: 'Kore', label: 'Kore', gender: 'girl', desc: 'Gentle & Calm' },
    { id: 'Aoede', label: 'Aoede', gender: 'girl', desc: 'Clear & Bright' },
    { id: 'Zephyr', label: 'Zephyr', gender: 'boy', desc: 'Professional' },
    { id: 'Puck', label: 'Puck', gender: 'boy', desc: 'Energetic' },
    { id: 'Charon', label: 'Charon', gender: 'boy', desc: 'Deep & Mature' },
    { id: 'Fenrir', label: 'Fenrir', gender: 'boy', desc: 'Rugged & Bold' },
  ];

  const currentVoiceObj = voices.find(v => v.id === selectedVoice)!;

  const cleanup = useCallback(() => {
    setIsActive(false);
    setIsConnecting(false);
    setIsTalking(false);
    setCurrentVolume(0);
    
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
    }

    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    
    if (audioContextRef.current) audioContextRef.current.close();
    if (inputContextRef.current) inputContextRef.current.close();
    
    audioContextRef.current = null;
    inputContextRef.current = null;
    analyserRef.current = null;
    nextStartTimeRef.current = 0;
  }, []);

  const updateLipSync = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    const normalizedVolume = Math.min(average / 128, 1);
    
    setCurrentVolume(normalizedVolume);
    setIsTalking(normalizedVolume > 0.05);

    animationFrameRef.current = requestAnimationFrame(updateLipSync);
  }, []);

  const startSession = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      // 1. Verify Environment Variables (Crucial for Netlify)
      const apiKey = process.env.API_KEY;
      if (!apiKey || apiKey === 'undefined') {
        throw new Error("API_KEY_MISSING");
      }

      // 2. Request Microphone Access First
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MEDIA_NOT_SUPPORTED");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
        throw new Error("MIC_DENIED");
      });
      streamRef.current = stream;

      // 3. Initialize Audio Contexts
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      inputContextRef.current = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = new AudioCtx({ sampleRate: 24000 });
      
      // Ensure contexts are resumed (Required for many modern browsers)
      await inputContextRef.current.resume();
      await audioContextRef.current.resume();
      
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      analyser.connect(audioContextRef.current.destination);
      
      const ai = new GoogleGenAI({ apiKey: apiKey });

      // Robust speed instruction mapping
      let speedInstruction = "at a perfectly natural conversation pace";
      if (speed <= 0.6) speedInstruction = "extremely slowly, pausing between every few words as if talking to someone learning a new language";
      else if (speed < 0.9) speedInstruction = "deliberately and slowly with clear enunciation";
      else if (speed > 1.7) speedInstruction = "very rapidly and energetically, speaking as fast as possible while remaining intelligible";
      else if (speed > 1.2) speedInstruction = "at a brisk, fast-paced clip";

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            updateLipSync();
            
            const source = inputContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                try {
                  session.sendRealtimeInput({ media: pcmBlob });
                } catch (e) {
                  console.error("Data stream interrupted", e);
                }
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = audioContextRef.current!;
              if (!ctx) return;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(analyserRef.current!);
              
              source.onended = () => sourcesRef.current.delete(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch (e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('AI Service Error:', e);
            setError("AI connection failed. Ensure your API key is correctly configured in Netlify.");
            cleanup();
          },
          onclose: () => cleanup()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } }
          },
          systemInstruction: `You are សំ វិចិត្រ (Som Vichith), a friendly and helpful AI assistant. Your voice personality is ${currentVoiceObj.desc}. MANDATORY: Speak ${speedInstruction}. Keep your responses warm, human-like, and culturally appropriate for Cambodia.`,
        }
      });
      
    } catch (error: any) {
      console.error('Start Session Logic Failed:', error);
      
      let friendlyError = "Failed to start the session.";
      if (error.message === "API_KEY_MISSING") {
        friendlyError = "API Key not found. Please set API_KEY in your Netlify environment variables.";
      } else if (error.message === "MIC_DENIED") {
        friendlyError = "Microphone access denied. Please allow microphone permissions in your browser.";
      } else if (error.message === "MEDIA_NOT_SUPPORTED") {
        friendlyError = "Your browser does not support microphone access.";
      }
      
      setError(friendlyError);
      setIsConnecting(false);
      cleanup();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto px-6 space-y-6 overflow-y-auto py-10 scrollbar-hide">
      
      {/* Avatar Section */}
      <div className="relative mb-2 shrink-0">
        <AIAvatar 
          isTalking={isTalking} 
          volume={currentVolume} 
          gender={currentVoiceObj.gender} 
        />
        {isActive && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-500/30 animate-pulse">
            Live
          </div>
        )}
      </div>

      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black tracking-tight uppercase">{t.liveTalk}</h2>
        <p className="text-gray-500 text-xs italic">Currently using: <span className="text-indigo-400 font-bold">{selectedVoice}</span></p>
      </div>

      <div className="relative flex flex-col items-center shrink-0">
        <button
          onClick={isActive ? cleanup : startSession}
          disabled={isConnecting}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl relative z-10 ${
            isActive 
              ? 'bg-red-500 hover:bg-red-600 shadow-red-500/40' 
              : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/40'
          }`}
        >
          {isConnecting ? (
            <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
          ) : isActive ? (
            <i className="fa-solid fa-stop text-2xl"></i>
          ) : (
            <i className="fa-solid fa-microphone text-2xl"></i>
          )}
        </button>
        
        {isActive && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 pointer-events-none">
            <div className="absolute inset-0 border-2 border-indigo-500/40 rounded-full animate-ping"></div>
            <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full animate-ping [animation-delay:0.5s]"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 px-6 py-4 rounded-2xl text-red-400 text-xs text-center flex items-center gap-3 max-w-sm animate-fadeIn">
          <i className="fa-solid fa-circle-exclamation text-lg"></i>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Settings Panel */}
      <div className="w-full max-w-lg bg-gray-800/40 border border-gray-700/50 rounded-3xl p-6 space-y-6">
        <div className="flex justify-between items-center cursor-pointer group" onClick={() => setShowSettings(!showSettings)}>
          <h4 className="text-xs font-black text-gray-300 uppercase tracking-widest flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/40 transition-colors">
              <i className="fa-solid fa-sliders text-indigo-400"></i>
            </div>
            {t.settings}
          </h4>
          <i className={`fa-solid fa-chevron-${showSettings ? 'up' : 'down'} text-[10px] text-gray-500`}></i>
        </div>

        {showSettings && (
          <div className="space-y-8 animate-fadeIn">
            {/* Voice Grid */}
            <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block px-1">Select Voice Personality</label>
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {voices.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    disabled={isActive}
                    className={`flex flex-col items-start p-3 rounded-2xl border transition-all text-left relative overflow-hidden group/card ${
                      selectedVoice === v.id 
                        ? 'bg-indigo-600/10 border-indigo-500 shadow-lg' 
                        : 'bg-gray-900/50 border-gray-700/50 text-gray-500 hover:border-gray-600'
                    } ${isActive ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <i className={`fa-solid ${v.gender === 'boy' ? 'fa-mars text-blue-400' : 'fa-venus text-pink-400'} text-xs`}></i>
                      {selectedVoice === v.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
                    </div>
                    <span className={`text-xs font-black uppercase ${selectedVoice === v.id ? 'text-indigo-400' : 'text-gray-400'}`}>{v.label}</span>
                    <span className="text-[9px] text-gray-600 font-medium">{v.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Speed Control */}
            <div className="space-y-4">
              <div className="flex justify-between items-end px-1">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">{t.speed}</span>
                  <span className="text-xs font-bold text-gray-300">
                    {speed < 0.9 ? 'Slow & Clear' : speed > 1.2 ? 'Fast & Energetic' : 'Natural Pace'}
                  </span>
                </div>
                <span className="text-sm font-black text-indigo-400 font-mono">{speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                disabled={isActive}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
              />
            </div>

            {isActive && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                <i className="fa-solid fa-circle-info text-amber-500 text-sm"></i>
                <p className="text-[10px] text-amber-200/70 font-medium">To apply new voice or speed settings, please stop and restart the session.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceConversation;
