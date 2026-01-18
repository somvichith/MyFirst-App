
import React, { useState } from 'react';
import { AppTab, Language } from '../types';

interface LayoutProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  t: any;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, isMuted, onToggleMute, lang, setLang, t, children }) => {
  const [showLangMenu, setShowLangMenu] = useState(false);

  const tabs = [
    { id: AppTab.VOICE, icon: 'fa-microphone', label: t.liveTalk },
    { id: AppTab.CHAT, icon: 'fa-comments', label: t.chat },
    { id: AppTab.VISION, icon: 'fa-file-word', label: t.pdfToWord },
    { id: AppTab.IMAGE, icon: 'fa-wand-magic-sparkles', label: t.imageGen },
    { id: AppTab.CLOTH_SWAP, icon: 'fa-shirt', label: t.clothSwap },
  ];

  const languages = [
    { id: Language.KHMER, label: 'ខ្មែរ', flag: '🇰🇭' },
    { id: Language.ENGLISH, label: 'English', flag: '🇺🇸' },
    { id: Language.JAPANESE, label: '日本語', flag: '🇯🇵' },
    { id: Language.CHINESE, label: '中文', flag: '🇨🇳' },
  ];

  const HeaderLogo = () => (
    <div className="w-8 h-8 relative group">
      <div className="absolute inset-0 bg-indigo-500 rounded-lg blur-sm opacity-20 group-hover:opacity-40 transition-opacity"></div>
      <div className="relative w-full h-full bg-gray-900 border border-indigo-500/50 rounded-lg flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-5 h-5">
          <path 
            d="M20 25 L50 75 L80 25" 
            fill="none" 
            stroke="white" 
            strokeWidth="12" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <path 
            d="M40 45 L50 60 L60 45" 
            fill="none" 
            stroke="#6366f1" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden font-sans">
      {/* Header */}
      <header className="px-6 py-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center shrink-0 z-50">
        <div className="flex items-center gap-3">
          <HeaderLogo />
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
            {t.appName}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="relative">
            <button 
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="px-3 py-1.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-xs font-bold transition-all flex items-center gap-2 border border-gray-600"
            >
              <span>{languages.find(l => l.id === lang)?.flag}</span>
              <span className="hidden sm:inline uppercase">{lang}</span>
            </button>
            {showLangMenu && (
              <div className="absolute top-full right-0 mt-2 w-32 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
                {languages.map(l => (
                  <button
                    key={l.id}
                    onClick={() => { setLang(l.id); setShowLangMenu(false); }}
                    className={`w-full text-left px-4 py-3 text-xs font-bold hover:bg-indigo-600 transition-colors flex items-center gap-3 ${lang === l.id ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-400'}`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={onToggleMute}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          >
            <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-low'}`}></i>
          </button>
          
          <div className="flex items-center gap-4 text-gray-400 border-l border-gray-700 pl-4">
            <span className="text-sm hidden sm:inline font-bold">{t.version}</span>
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
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-indigo-400 bg-indigo-400/10'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-lg`}></i>
              <span className="text-[10px] font-bold uppercase tracking-wider text-center">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
