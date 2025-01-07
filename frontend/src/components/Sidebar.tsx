import React, { useState, useEffect } from 'react';
import { TbLogs } from "react-icons/tb";
import { IoIosArrowDown, } from "react-icons/io";
import { fileService } from '../services/fileService';
import toast from 'react-hot-toast';

interface SidebarProps {
    isOpen: boolean;
    onDeleteAll: () => Promise<void>;
    onViewChange: (view: 'files' | 'changelog' | 'dashboard') => void;
    currentView: 'files' | 'changelog' | 'dashboard';
    storageUpdateTrigger: number;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onDeleteAll, onViewChange, currentView, storageUpdateTrigger }) => {
    const [isFilesOpen, setIsFilesOpen] = useState(false);
    const [storageInfo, setStorageInfo] = useState<{ percentage: number }>({ percentage: 0 });

    useEffect(() => {
        const loadStorageInfo = async () => {
            try {
                const info = await fileService.getStorageInfo();
                setStorageInfo(info);
            } catch (error) {
                console.error('Errore nel caricamento delle informazioni sullo storage:', error);
                toast.error('Errore nel caricamento delle informazioni sullo storage');
            }
        };

        loadStorageInfo();
    }, [storageUpdateTrigger]); // Ricarica quando storageUpdateTrigger cambia

    const handleDeleteAll = async () => {
        if (window.confirm('Sei sicuro di voler eliminare tutti i file?')) {
            try {
                await fileService.deleteAllFiles();
                await onDeleteAll();
                // Aggiorna le informazioni sullo storage dopo l'eliminazione
                const info = await fileService.getStorageInfo();
                setStorageInfo(info);
                toast.success('Tutti i file sono stati eliminati');
            } catch {
                toast.error('Errore durante l\'eliminazione dei file');
            }
        }
    };

    return (
        <div className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg p-4 z-40 transition-transform duration-300 ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
            <div className="flex flex-col h-full">
                {/* Logo/Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-center">
                        <img src="/favicon.ico" alt="FlowFiles Icon" className="mr-2" />
                        <h1 className="text-2xl font-bold" style={{ color: '#209CEE' }}>FlowFiles</h1>
                    </div>
                    <p className="text-sm text-gray-500 text-center">File Management System</p>
                </div>

                {/* Menu Items */}
                <nav className="flex-1">
                    <ul className="space-y-2">
                        <li>
                            <button
                                onClick={() => onViewChange('dashboard')}
                                className={`flex items-center w-full p-2 rounded-lg ${
                                    currentView === 'dashboard' 
                                    ? 'bg-blue-50 text-blue-600' 
                                    : 'text-gray-700 hover:bg-blue-50'
                                }`}
                            >
                                <span className="material-icons mr-3">dashboard</span>
                                Dashboard
                            </button>
                        </li>
                        <li>
                            <div className="flex flex-col">
                                <button
                                    onClick={() => setIsFilesOpen(!isFilesOpen)}
                                    className="flex items-center justify-between w-full p-2 text-gray-700 hover:bg-blue-50 rounded-lg"
                                >
                                    <div className="flex items-center">
                                        <span className="material-icons mr-3">folder</span>
                                        Files
                                    </div>
                                    <IoIosArrowDown className={`transform transition-transform duration-300 ${isFilesOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isFilesOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <ul className="ml-8 mt-2 space-y-2">
                                        <li>
                                            <a href="#" className="flex items-center p-2 text-gray-600 hover:bg-blue-50 rounded-lg text-sm">
                                                <span className="material-icons text-sm mr-3">description</span>
                                                Documents
                                            </a>
                                        </li>
                                        <li>
                                            <a href="#" className="flex items-center p-2 text-gray-600 hover:bg-blue-50 rounded-lg text-sm">
                                                <span className="material-icons text-sm mr-3">image</span>
                                                Images
                                            </a>
                                        </li>
                                        <li>
                                            <a href="#" className="flex items-center p-2 text-gray-600 hover:bg-blue-50 rounded-lg text-sm">
                                                <span className="material-icons text-sm mr-3">movie</span>
                                                Videos
                                            </a>
                                        </li>
                                        <li>
                                            <button
                                                onClick={handleDeleteAll}
                                                className="flex items-center w-full p-2 text-red-500 hover:bg-red-50 rounded-lg text-sm"
                                            >
                                                <span className="material-icons text-sm mr-3">delete_forever</span>
                                                Elimina tutto
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </li>
                        <li>
                            <a href="#" className="flex items-center p-2 text-gray-700 hover:bg-blue-50 rounded-lg">
                                <span className="material-icons mr-3">history</span>
                                Recent
                            </a>
                        </li>
                        <li>
                            <a href="#" className="flex items-center p-2 text-gray-700 hover:bg-blue-50 rounded-lg">
                                <span className="material-icons mr-3">star</span>
                                Favorites
                            </a>
                        </li>
                    </ul>
                </nav>

                {/* Footer */}
                <ul>
                    <li>
                        <button
                            onClick={() => onViewChange('changelog')}
                            className={`flex items-center w-full p-2 rounded-lg ${
                                currentView === 'changelog' 
                                ? 'bg-blue-50 text-blue-600' 
                                : 'text-gray-700 hover:bg-blue-50'
                            }`}
                        >
                            <TbLogs className="w-6 h-6 mr-3" />
                            Changelog
                        </button>
                    </li>
                </ul>
                <div className="mt-auto pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                        <p>Storage: {storageInfo.percentage}% used</p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                            <div 
                                className={`h-2.5 rounded-full ${
                                    storageInfo.percentage > 90 
                                        ? 'bg-red-600' 
                                        : storageInfo.percentage > 70 
                                            ? 'bg-yellow-600' 
                                            : 'bg-blue-600'
                                }`}
                                style={{ width: `${storageInfo.percentage}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
                <p className="mt-2 text-xs text-gray-700 text-center">v1.2.0</p>
            </div>
        </div>
    );
};

export default Sidebar;