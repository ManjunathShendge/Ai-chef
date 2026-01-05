
import React, { useState } from 'react';
import Navigation from './components/Navigation';
import RecipeExplorer from './components/RecipeExplorer';
import KitchenAssistant from './components/KitchenAssistant';
import VisualChef from './components/VisualChef';
import ImageLab from './components/ImageLab';
import { AppTab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.EXPLORE);

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.EXPLORE:
        return <RecipeExplorer />;
      case AppTab.ASSISTANT:
        return <KitchenAssistant />;
      case AppTab.ANALYZER:
        return <VisualChef />;
      case AppTab.LAB:
        return <ImageLab />;
      default:
        return <RecipeExplorer />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-20 md:pb-0">
      <header className="bg-white border-b border-stone-200 py-4 px-6 sticky top-0 z-40 md:hidden">
        <div className="flex items-center space-x-2 text-orange-600 font-bold text-xl">
          <i className="fa-solid fa-utensils"></i>
          <span>ChefGemini</span>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto">
        {renderContent()}
      </main>

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default App;
