
import React from 'react';
import { AppTab } from '../types';

interface NavigationProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: AppTab.EXPLORE, icon: 'fa-search', label: 'Explore' },
    { id: AppTab.ASSISTANT, icon: 'fa-microphone', label: 'Kitchen' },
    { id: AppTab.ANALYZER, icon: 'fa-camera', label: 'Analyzer' },
    { id: AppTab.LAB, icon: 'fa-wand-magic-sparkles', label: 'AI Lab' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-50 px-4 py-2 md:relative md:border-t-0 md:bg-transparent">
      <div className="max-w-screen-xl mx-auto flex justify-between items-center">
        <div className="hidden md:flex items-center space-x-2 text-orange-600 font-bold text-xl">
          <i className="fa-solid fa-utensils"></i>
          <span>ChefGemini</span>
        </div>
        <div className="flex w-full md:w-auto justify-around md:space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 px-3 py-2 rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'text-orange-600 bg-orange-50 md:bg-orange-600 md:text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <i className={`fa-solid ${tab.icon} text-lg`}></i>
              <span className="text-xs md:text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
