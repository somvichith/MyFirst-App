
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { ChatMessage } from '../types';
import * as XLSX from 'xlsx';

const ChatInterface: React.FC<{ lang: string; t: any }> = ({ lang, t }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const parseMarkdownTable = (text: string) => {
    // Regex to find and capture markdown tables
    const tableRegex = /\|(.+)\|.*\n\|([-| ]+)\|.*\n((\|(.+)\|.*\n)*)/g;
    const match = tableRegex.exec(text);
    if (!match) return null;

    const fullTable = match[0];
    const rows = fullTable.trim().split('\n').filter(row => !row.includes('---') && !row.includes('-|-'));
    
    return rows.map(row => 
      row.split('|')
         .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1) // Remove leading/trailing empty cells from pipe split
         .map(cell => cell.trim())
    );
  };

  const renderMessageContent = (msg: ChatMessage) => {
    const tableRegex = /\|(.+)\|.*\n\|([-| ]+)\|.*\n((\|(.+)\|.*\n)*)/g;
    const parts = msg.text.split(tableRegex);
    
    const elements = [];
    let lastIndex = 0;
    let match;
    const regex = new RegExp(tableRegex);

    while ((match = regex.exec(msg.text)) !== null) {
      // Add text before table
      if (match.index > lastIndex) {
        elements.push(
          <p key={`text-${lastIndex}`} className="text-sm whitespace-pre-wrap leading-relaxed mb-4">
            {msg.text.substring(lastIndex, match.index)}
          </p>
        );
      }

      // Add table
      const tableText = match[0];
      const tableData = parseMarkdownTable(tableText);
      if (tableData && tableData.length > 0) {
        elements.push(
          <div key={`table-${match.index}`} className="my-6 overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-700">
                    {tableData[0].map((cell, i) => (
                      <th key={i} className="px-4 py-3 font-black uppercase text-indigo-400 border-r border-gray-700 last:border-0">
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.slice(1).map((row, i) => (
                    <tr key={i} className="border-b border-gray-800 last:border-0 hover:bg-white/5 transition-colors">
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-2 text-gray-300 border-r border-gray-800 last:border-0">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-gray-800/50 p-3 border-t border-gray-700 flex flex-wrap gap-2">
              <button 
                onClick={() => downloadAsExcel(tableData)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-[10px] font-black uppercase rounded-lg transition-all"
              >
                <i className="fa-solid fa-file-excel"></i>
                Excel
              </button>
              <button 
                onClick={() => copyForSheets(tableData)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase rounded-lg transition-all"
              >
                <i className="fa-solid fa-table-columns"></i>
                Google Sheets
              </button>
            </div>
          </div>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < msg.text.length) {
      elements.push(
        <p key={`text-${lastIndex}`} className="text-sm whitespace-pre-wrap leading-relaxed">
          {msg.text.substring(lastIndex)}
        </p>
      );
    }

    return elements;
  };

  const downloadAsExcel = (tableData: string[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SomVichith_Data");
    XLSX.writeFile(wb, `SomVichith_Export_${Date.now()}.xlsx`);
  };

  const copyForSheets = (tableData: string[][]) => {
    const tsv = tableData.map(row => row.join('\t')).join('\n');
    navigator.clipboard.writeText(tsv);
    alert('Copied! You can now paste this directly into Google Sheets or Excel.');
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: 'You are សំ វិចិត្រ (Som Vichith), an elite AI business assistant. You specialize in data processing and structured organization. When users ask for records, lists, or tables, you MUST respond using Markdown tables. Always be professional, helpful, and concise.',
        }
      });

      const historyMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model' as const,
        text: '',
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, historyMessage]);

      const stream = await chat.sendMessageStream({ message: input });
      let fullText = '';

      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        fullText += (c.text || '');
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.role === 'model') {
            lastMsg.text = fullText;
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        role: 'model',
        text: 'Sorry, I encountered an issue. Please try again.',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const ProfessionalLogo = () => (
    <div className="relative w-28 h-28 mb-8 group">
      {/* Decorative Aura */}
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-[2.5rem] rotate-12 opacity-10 blur-xl group-hover:opacity-25 transition-opacity duration-700"></div>
      
      {/* Outer Glow Ring */}
      <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500/30 to-purple-600/30 rounded-[2.5rem] blur opacity-40 group-hover:opacity-100 transition-opacity duration-500"></div>

      {/* Logo Container */}
      <div className="relative h-full w-full bg-gray-900 border-2 border-white/5 rounded-[2.5rem] flex items-center justify-center shadow-2xl backdrop-blur-3xl overflow-hidden">
        {/* Interior Gradient Mask */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5"></div>
        
        <svg viewBox="0 0 100 100" className="w-16 h-16 relative z-10">
          <defs>
            <linearGradient id="vichithGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
            <filter id="vichithGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Main "V" Motif */}
          <path 
            d="M 25 35 L 50 75 L 75 35" 
            fill="none" 
            stroke="url(#vichithGrad)" 
            strokeWidth="12" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            filter="url(#vichithGlow)"
          />
          
          {/* AI Connection Nodes */}
          <circle cx="25" cy="35" r="5" fill="white" />
          <circle cx="75" cy="35" r="5" fill="white" />
          <circle cx="50" cy="75" r="5" fill="#818cf8" />
          
          {/* Pulse Signal */}
          <path 
            d="M 40 50 Q 50 65 60 50" 
            fill="none" 
            stroke="white" 
            strokeWidth="4" 
            strokeLinecap="round" 
            opacity="0.6"
          />
        </svg>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto px-4 py-6">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-8 mb-4 scrollbar-hide pr-2"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 pt-10">
            <ProfessionalLogo />
            <div className="space-y-2">
              <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic">Som Vichith</h3>
              <p className="text-gray-400 max-w-md mx-auto text-sm font-medium">Next-Generation AI Workspace. Specialized in complex data processing, Khmer localization, and structured visualization.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl px-4">
              <button onClick={() => setInput("Create a table with 50 records of fictional student data (Name, ID, Major, GPA, Grade).")} className="p-5 bg-gray-800/40 border border-gray-700/50 rounded-3xl text-xs text-left hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all group">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-table text-indigo-400"></i>
                </div>
                <span className="font-black text-gray-200 uppercase tracking-widest block mb-1">Generate Table</span>
                <span className="text-gray-500 text-[10px]">Create 50+ records instantly with export options.</span>
              </button>
              <button onClick={() => setInput("Can you help me summarize a complex Khmer legal document?")} className="p-5 bg-gray-800/40 border border-gray-700/50 rounded-3xl text-xs text-left hover:bg-purple-600/10 hover:border-purple-500/30 transition-all group">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-file-contract text-purple-400"></i>
                </div>
                <span className="font-black text-gray-200 uppercase tracking-widest block mb-1">Legal Analysis</span>
                <span className="text-gray-500 text-[10px]">Deep processing of complex documents and script.</span>
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}
          >
            <div
              className={`max-w-[95%] px-6 py-4 rounded-[2rem] shadow-2xl ${
                msg.role === 'user'
                  ? 'bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-tr-none'
                  : 'bg-gray-800/80 text-gray-200 border border-gray-700/50 rounded-tl-none backdrop-blur-md'
              }`}
            >
              <div className="chat-content">
                {renderMessageContent(msg)}
              </div>
              
              <div className="flex items-center justify-between mt-3 opacity-40">
                <span className="text-[9px] font-bold uppercase tracking-widest">
                  {msg.role === 'user' ? 'You' : 'Som Vichith'}
                </span>
                <span className="text-[9px]">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-gray-800 border border-gray-700 px-6 py-4 rounded-3xl rounded-tl-none flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-duration:0.6s]"></span>
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.4s]"></span>
              </div>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Processing</span>
            </div>
          </div>
        )}
      </div>

      <div className="relative group mt-auto">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-10 group-focus-within:opacity-25 transition duration-1000"></div>
        <div className="relative flex items-end gap-3 bg-gray-800 border border-gray-700/80 rounded-[2.5rem] p-3 pl-6 pr-3 shadow-2xl backdrop-blur-xl">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t.placeholder}
            className="flex-1 bg-transparent text-white py-4 focus:outline-none resize-none min-h-[48px] max-h-48 text-sm scrollbar-hide font-medium"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-[1.5rem] transition-all duration-300 flex items-center justify-center shrink-0 shadow-xl shadow-indigo-600/30 group-hover:scale-105 active:scale-95"
          >
            <i className={`fa-solid ${isLoading ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'} text-xl`}></i>
          </button>
        </div>
      </div>
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ChatInterface;
