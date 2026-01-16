
import React from 'react';
import { AppTab } from '../types';

interface LayoutProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, isMuted, onToggleMute, children }) => {
  const tabs = [
    { id: AppTab.VOICE, icon: 'fa-microphone', label: 'Live Talk' },
    { id: AppTab.CHAT, icon: 'fa-comments', label: 'Chat' },
    { id: AppTab.VISION, icon: 'fa-eye', label: 'Vision/OCR' },
    { id: AppTab.IMAGE, icon: 'fa-wand-magic-sparkles', label: 'Image Gen' },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-brain text-white"></i>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            សំ វិចិត្រ
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={onToggleMute}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title={isMuted ? "Unmute Background Music" : "Mute Background Music"}
          >
            <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-low'}`}></i>
          </button>
          <div className="flex items-center gap-4 text-gray-400 border-l border-gray-700 pl-4">
            <span className="text-sm hidden sm:inline">ជំនាន់ទី១</span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-auto bg-gray-900 relative">
        {children}
      </main>

      {/* Navigation Bar */}
      <nav className="shrink-0 bg-gray-800 border-t border-gray-700 pb-safe">
        <div className="max-w-screen-md mx-auto flex justify-around p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-indigo-400 bg-indigo-400/10'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-lg`}></i>
              <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
