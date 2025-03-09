/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import FileBrowser, { FileBrowserHandle } from './components/FileBrowser';
import TrashView from './components/TrashView';
import Changelog from './components/Changelog';
import { Settings } from './components/Settings';
import Editor from './components/Editor';
import { fileService } from './services/fileService';
import toast, { Toaster } from 'react-hot-toast';
import { TbMenu2 } from "react-icons/tb";

// Creiamo un context per il tema
import { createContext } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
});

function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'files' | 'trash' | 'settings' | 'changelog'>('files');
  const [storageUpdateTrigger, setStorageUpdateTrigger] = useState(0);
  const fileBrowserRef = useRef<FileBrowserHandle>(null);
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    setIsDarkMode(savedTheme === 'dark');
  }, []);

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
      case 'settings':
        return (
          <Settings onSettingsUpdate={() => setStorageUpdateTrigger(prev => prev + 1)} />
        );
      case 'changelog':
        return <Changelog />;
      default:
        return null;
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`fixed top-4 z-50 p-2 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-lg transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'left-[272px]' : 'left-4'
          }`}
          aria-label="Toggle Sidebar"
        >
          <TbMenu2 className="w-6 h-6 text-gray-700 dark:text-gray-200" />
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
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <div className="flex-1 overflow-auto">
            {renderCurrentView()}
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

function App() {
  return (
    <Router>
      <div className="h-screen">
        <Toaster position="bottom-right" />
        <Routes>
          <Route path="/" element={<MainLayout />} />
          <Route path="/editor" element={<Editor />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
