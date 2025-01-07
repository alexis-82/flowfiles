import { useState, useRef, useCallback } from 'react';
import FileBrowser, { FileBrowserHandle } from './components/FileBrowser';
import Sidebar from './components/Sidebar';
import { Toaster } from 'react-hot-toast';
import { TbMenu2 } from "react-icons/tb";
import Changelog from './components/Changelog';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'files' | 'changelog' | 'dashboard'>('dashboard');
  const fileBrowserRef = useRef<FileBrowserHandle>(null);
  const [storageUpdateTrigger, setStorageUpdateTrigger] = useState(0);

  const handleStorageUpdate = useCallback(() => {
    setStorageUpdateTrigger(prev => prev + 1);
  }, []);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'files':
        return <FileBrowser ref={fileBrowserRef} onFileChange={handleStorageUpdate} />;
      case 'changelog':
        return <Changelog />;
      case 'dashboard':
      default:
        return <FileBrowser ref={fileBrowserRef} onFileChange={handleStorageUpdate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed top-4 z-50 p-2 rounded-lg shadow-lg 
          transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'left-[272px]' : 'left-4'
        }`}
        aria-label="Toggle Sidebar"
      >
        <TbMenu2 className="w-6 h-6 text-gray-700" />
      </button>
      
      <Sidebar 
        isOpen={isSidebarOpen}
        onDeleteAll={async () => {
          await fileBrowserRef.current?.loadFiles();
          handleStorageUpdate();
        }}
        onViewChange={setCurrentView}
        currentView={currentView}
        storageUpdateTrigger={storageUpdateTrigger}
      />
      
      <div className="transition-all duration-300 ease-in-out">
        <div className="py-8">
          {renderCurrentView()}
          <Toaster position="top-right" />
        </div>
      </div>
    </div>
  );
};

export default App;
