
import React, { useState, useCallback } from 'react';
import ChatbotGuide from './components/ChatbotGuide';
import CreativeKeepsakes from './components/CreativeKeepsakes';
import InstructionsHelper from './components/InstructionsHelper';
import LiveAssistant from './components/LiveAssistant';
import MemoriesOrganizer from './components/MemoriesOrganizer';

type Tab = 'Guide' | 'Kreativt' | 'Minnen' | 'Instruktioner' | 'Live Assistent';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Guide');

  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'Guide':
        return <ChatbotGuide />;
      case 'Kreativt':
        return <CreativeKeepsakes />;
      case 'Minnen':
        return <MemoriesOrganizer />;
      case 'Instruktioner':
        return <InstructionsHelper />;
      case 'Live Assistent':
        return <LiveAssistant />;
      default:
        return null;
    }
  }, [activeTab]);

  const TabButton = ({ tabName }: { tabName: Tab }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-3 py-2 text-sm md:px-4 md:py-3 md:text-base font-medium rounded-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-400 ${
        activeTab === tabName
          ? 'bg-cyan-600 text-white shadow-lg'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {tabName}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
      <header className="bg-gray-800 shadow-md p-4 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl md:text-3xl font-bold text-white tracking-wider">
            Min Sista Hälsning
          </h1>
        </div>
      </header>

      <main className="container mx-auto p-4 flex-grow flex flex-col">
        <div className="w-full mb-6">
          <div className="flex flex-wrap gap-2 md:gap-4 p-2 bg-gray-800 rounded-xl justify-center">
            <TabButton tabName="Guide" />
            <TabButton tabName="Kreativt" />
            <TabButton tabName="Minnen" />
            <TabButton tabName="Instruktioner" />
            <TabButton tabName="Live Assistent" />
          </div>
        </div>
        <div className="bg-gray-800 p-4 sm:p-6 rounded-xl shadow-2xl flex-grow">
          {renderTabContent()}
        </div>
      </main>
      <footer className="text-center p-4 text-gray-500 text-sm">
        Skapad med Gemini API
      </footer>
    </div>
  );
};

export default App;
