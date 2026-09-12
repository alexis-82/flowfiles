import React, { useState, useEffect } from 'react';
import { TbLogs } from "react-icons/tb";
import { fileService } from '../services/fileService';
import toast from 'react-hot-toast';
// import { ThemeContext } from '../App';

interface SidebarProps {
    isOpen: boolean;
    onViewChange: (view: 'files' | 'trash' | 'settings' | 'changelog' | 'vault') => void;
    currentView: 'files' | 'trash' | 'settings' | 'changelog' | 'vault';
    storageUpdateTrigger?: number;
}

interface StorageInfo {
    usedStorage: number;
    totalStorage: number;
    usedPercentage: number;
    freeStorage: number;
}

const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onViewChange,
    currentView,
    storageUpdateTrigger = 0,
}) => {
    const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
    // const { isDarkMode } = useContext(ThemeContext);

    useEffect(() => {
        const fetchStorageInfo = async () => {
            try {
                const info = await fileService.getStorageInfo();
                setStorageInfo(info);
            } catch (error) {
                console.error('Errore nel caricamento delle informazioni di storage:', error);
                toast.error('Fallito a caricare le informazioni di storage');
            }
        };

        fetchStorageInfo();
    }, [storageUpdateTrigger]);

    const formatSize = (bytes: number): string => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    };

    const getProgressBarColor = (percentage: number): string => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 70) return 'bg-yellow-500';
        return 'bg-blue-500';
    };

    return (
        <div className={`fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg p-4 z-40 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
            <div className="flex flex-col h-full">
                {/* Logo/Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-center">
                        <img src="/favicon.ico" alt="FlowFiles Icon" className="mr-2" />
                        <h1 className="text-2xl font-bold text-blue-500">FlowFiles</h1>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">File Management System</p>
                </div>

                {/* Menu Items */}
                <nav className="flex-1">
                    <ul className="space-y-2">
                        <li>
                            <button
                                onClick={() => onViewChange('files')}
                                className={`flex items-center w-full p-2 ${currentView === 'files'
                                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-400'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900'
                                    } rounded-lg`}
                            >
                                <span className="material-icons mr-3">folder</span>
                                File Browser
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => onViewChange('trash')}
                                className={`flex items-center w-full p-2 ${currentView === 'trash'
                                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-400'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900'
                                    } rounded-lg`}
                            >
                                <span className="material-icons mr-3">delete</span>
                                Cestino
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => onViewChange('vault')}
                                className={`flex items-center w-full p-2 rounded-lg ${currentView === 'vault'
                                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-400'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900'
                                    }`}
                            >
                                <span className="material-icons mr-3">lock</span>
                                Cassaforte
                            </button>
                        </li>
                    </ul>
                </nav>

                {/* Storage Section */}
                <button
                    onClick={() => onViewChange('changelog')}
                    className={`flex items-center w-full p-2 mb-2 rounded-lg ${currentView === 'changelog'
                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900'
                        }`}
                >
                    <TbLogs className="w-6 h-6 mr-3" />
                    Changelog
                </button>


                <button
                    onClick={() => onViewChange('settings')}
                    className={`flex items-center w-full mb-3 p-2 rounded-lg ${currentView === 'settings'
                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900'
                        }`}
                >
                    <span className="material-icons mr-3">settings</span>
                    Impostazioni
                </button>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Storage</h3>
                    {storageInfo && (
                        <div>
                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full mb-2">
                                <div
                                    className={`h-full rounded-full ${getProgressBarColor(storageInfo.usedPercentage || 0)}`}
                                    style={{ width: `${storageInfo.usedPercentage || 0}%` }}
                                />
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                <p>{formatSize(storageInfo.usedStorage)} di {formatSize(storageInfo.totalStorage)} utilizzati</p>
                                {/* <p className="mt-1">{formatSize(storageInfo.freeStorage)} disponibili</p> */}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p className="mt-2 text-xs text-gray-700 dark:text-gray-300 text-center">v1.4.4</p>
            </div>
        </div>
    );
};

export default Sidebar; 