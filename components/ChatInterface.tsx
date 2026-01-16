
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { ChatMessage } from '../types';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
          systemInstruction: 'You are សំ វិចិត្រ, a versatile and high-performance AI assistant. Provide concise, accurate, and helpful responses. Use markdown for formatting.',
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
        text: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4 py-6">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-hide pr-2"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-4">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-2xl">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-300">Welcome to សំ វិចិត្រ Chat</h3>
              <p className="max-w-xs mt-2">Ask me anything, from code to complex reasoning.</p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg'
                  : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-none'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              <span className="text-[10px] opacity-40 mt-1 block">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1].role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message..."
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none min-h-[56px] pr-14"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="absolute right-2 top-2 w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-xl transition-all duration-200 flex items-center justify-center"
        >
          <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
