
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { decode, decodeAudioData, encode, createBlob } from '../services/audioUtils';

const VoiceConversation: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [voice, setVoice] = useState<'Zephyr' | 'Kore'>('Zephyr'); // Zephyr (Male), Kore (Female)
  const [speed, setSpeed] = useState<number>(1.0);
  const [showSettings, setShowSettings] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    setIsActive(false);
    setIsConnecting(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
    }

    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    
    if (audioContextRef.current) audioContextRef.current.close();
    if (inputContextRef.current) inputContextRef.current.close();
    
    audioContextRef.current = null;
    inputContextRef.current = null;
    nextStartTimeRef.current = 0;
  }, []);

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Map speed value to a verbal instruction for the model
      let speedInstruction = "at a normal pace";
      if (speed < 0.8) speedInstruction = "very slowly and clearly";
      else if (speed < 1.0) speedInstruction = "slightly slowly";
      else if (speed > 1.5) speedInstruction = "very quickly";
      else if (speed > 1.0) speedInstruction = "slightly fast";

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            
            const source = inputContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = audioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.onended = () => sourcesRef.current.delete(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => console.error('Live API Error:', e),
          onclose: () => cleanup()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
          },
          systemInstruction: `You are សំ វិចិត្រ in Voice Mode. Be conversational, enthusiastic, and helpful. You should speak ${speedInstruction}. Keep responses brief but meaningful.`,
        }
      });
      
      sessionRef.current = await sessionPromise;
    } catch (error) {
      console.error('Failed to start session:', error);
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-6 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Live Conversation</h2>
        <p className="text-gray-400">Speak naturally with សំ វិចិត្រ in real-time.</p>
      </div>

      <div className="relative flex flex-col items-center">
        {/* Animated Rings */}
        <div className={`absolute inset-0 flex items-center justify-center -z-10`}>
          <div className={`w-40 h-40 rounded-full border border-indigo-500/30 ${isActive ? 'animate-ping' : ''}`}></div>
          <div className={`absolute w-40 h-40 rounded-full border border-purple-500/20 ${isActive ? 'animate-ping [animation-delay:0.5s]' : ''}`}></div>
        </div>

        <button
          onClick={isActive ? cleanup : startSession}
          disabled={isConnecting}
          className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${
            isActive 
              ? 'bg-red-500 hover:bg-red-600 shadow-red-500/40' 
              : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/40'
          }`}
        >
          {isConnecting ? (
            <i className="fa-solid fa-spinner fa-spin text-4xl"></i>
          ) : isActive ? (
            <i className="fa-solid fa-stop text-4xl"></i>
          ) : (
            <i className="fa-solid fa-microphone text-4xl"></i>
          )}
        </button>
      </div>

      {/* Settings Panel */}
      <div className="w-full bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 space-y-6">
        <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowSettings(!showSettings)}>
          <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2">
            <i className="fa-solid fa-sliders text-indigo-400"></i> Voice Settings
          </h4>
          <i className={`fa-solid fa-chevron-${showSettings ? 'up' : 'down'} text-xs text-gray-500`}></i>
        </div>

        {showSettings && (
          <div className="space-y-6 animate-fadeIn">
            {/* Gender Selection */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Speaker Gender</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setVoice('Zephyr')}
                  disabled={isActive}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                    voice === 'Zephyr' 
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20' 
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
                  } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <i className="fa-solid fa-person text-lg"></i>
                  <span className="font-medium">Male (Zephyr)</span>
                </button>
                <button
                  onClick={() => setVoice('Kore')}
                  disabled={isActive}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                    voice === 'Kore' 
                      ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/20' 
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
                  } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <i className="fa-solid fa-person-dress text-lg"></i>
                  <span className="font-medium">Female (Kore)</span>
                </button>
              </div>
              {isActive && <p className="text-[10px] text-amber-500 italic">Disconnect to change voice</p>}
            </div>

            {/* Speed Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Speaking Speed</label>
                <span className="text-xs font-mono text-indigo-400">{speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                disabled={isActive}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50"
              />
              <div className="flex justify-between text-[10px] text-gray-600 font-medium px-1">
                <span>Slower</span>
                <span>Normal</span>
                <span>Faster</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 items-center text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-600'}`}></span>
          {isActive ? 'Live' : 'Disconnected'}
        </div>
        <div className="flex items-center gap-1">
          <i className={`fa-solid ${voice === 'Kore' ? 'fa-venus' : 'fa-mars'}`}></i>
          {voice} Voice ({speed}x)
        </div>
      </div>
    </div>
  );
};

export default VoiceConversation;
