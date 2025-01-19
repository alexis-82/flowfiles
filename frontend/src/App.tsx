/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useRef } from 'react';
import Sidebar from './components/Sidebar';
import FileBrowser, { FileBrowserHandle } from './components/FileBrowser';
import TrashView from './components/TrashView';
import Changelog from './components/Changelog';
import { fileService } from './services/fileService';
import toast from 'react-hot-toast';
import { TbMenu2 } from "react-icons/tb";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<'files' | 'trash' | 'changelog'>('files');
  const [storageUpdateTrigger, setStorageUpdateTrigger] = useState(0);
  const fileBrowserRef = useRef<FileBrowserHandle>(null);

  const handleDeleteAll = async () => {
    try {
      await fileService.deleteAllFiles();
      if (fileBrowserRef.current) {
        await fileBrowserRef.current.loadFiles();
      }
      setStorageUpdateTrigger(prev => prev + 1);
    } catch (error) {
      toast.error('Errore durante l\'eliminazione di tutti i file');
    }
  };

  const handleRefreshFiles = async () => {
    if (fileBrowserRef.current) {
      await fileBrowserRef.current.loadFiles();
    }
    setStorageUpdateTrigger(prev => prev + 1);
  };

  const handleResetPath = () => {
    if (fileBrowserRef.current) {
      fileBrowserRef.current.resetPath();
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'files':
        return (
          <FileBrowser
            ref={fileBrowserRef}
            onStorageUpdate={() => setStorageUpdateTrigger(prev => prev + 1)}
          />
        );
      case 'trash':
        return (
          <TrashView 
            onFilesUpdate={handleRefreshFiles}
            onStorageUpdate={() => setStorageUpdateTrigger(prev => prev + 1)}
          />
        );
      case 'changelog':
        return <Changelog />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed top-4 z-50 p-2 bg-white rounded-lg shadow-lg transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'left-[272px]' : 'left-4'
        }`}
        aria-label="Toggle Sidebar"
      >
        <TbMenu2 className="w-6 h-6 text-gray-700" />
      </button>

      <Sidebar
        isOpen={isSidebarOpen}
        onDeleteAll={handleDeleteAll}
        onViewChange={setCurrentView}
        currentView={currentView}
        onRefreshFiles={handleRefreshFiles}
        storageUpdateTrigger={storageUpdateTrigger}
        onResetPath={handleResetPath}
      />
      <div className={`flex-1 overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="h-full overflow-auto">
          {renderCurrentView()}
        </div>
      </div>
    </div>
  );
}

export default App;
