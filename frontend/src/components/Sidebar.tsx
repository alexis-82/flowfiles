/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { TbLogs } from "react-icons/tb";
import { IoIosArrowDown, } from "react-icons/io";
import { fileService } from '../services/fileService';
import toast from 'react-hot-toast';
import { sweetAlert } from '../utils/sweetAlert';
// import { ThemeContext } from '../App';

interface SidebarProps {
    isOpen: boolean;
    onDeleteAll: () => void;
    onViewChange: (view: 'files' | 'trash' | 'settings' | 'changelog') => void;
    currentView: 'files' | 'trash' | 'settings' | 'changelog';
    onRefreshFiles: () => void;
    storageUpdateTrigger?: number;
    onResetPath: () => void;
}

interface StorageInfo {
    usedStorage: number;
    totalStorage: number;
    usedPercentage: number;
    freeStorage: number;
}

const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onDeleteAll,
    onViewChange,
    currentView,
    onRefreshFiles,
    storageUpdateTrigger = 0,
    onResetPath
}) => {
    const [isFilesOpen, setIsFilesOpen] = useState(false);
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

    const handleDeleteAll = async () => {
        const confirmed = await sweetAlert.confirm(
            'Elimina tutto',
            'Sei sicuro di voler spostare tutti i file nel cestino?',
            'warning'
        );
        
        if (confirmed) {
            try {
                await fileService.deleteAllFiles();
                await onDeleteAll();
                onResetPath();
                toast.success('Tutti i file sono stati spostati nel cestino');
            } catch {
                toast.error('Errore durante lo spostamento dei file nel cestino');
            }
        }
    };

    const handleCreateFolder = async () => {
        const folderName = await sweetAlert.prompt(
            'Nuova cartella',
            'Inserisci il nome della nuova cartella'
        );
        
        if (folderName) {
            try {
                await fileService.createFolder(folderName);
                await onRefreshFiles();
                toast.success('Cartella creata con successo');
            } catch (error) {
                toast.error('Errore durante la creazione della cartella');
            }
        }
    };

    const handleCreateFile = async () => {
        const extensions = ['txt', 'js', 'ts', 'py', 'json', 'md', 'css', 'html', 'bat', 'sh', 'tsx', 'jsx',
            'xml', 'yml', 'yaml', 'ini', 'conf', 'sh', 'bat', 'ps1', 'pyc',
            'java', 'cpp', 'c', 'h', 'hpp', 'sql', 'env', 'gitignore'
        ];
        
        const fileName = await sweetAlert.prompt(
            'Nuovo file',
            'Inserisci il nome del nuovo file'
        );

        if (fileName) {
            const extension = fileName.split('.').pop()?.toLowerCase();
            if (extension && extensions.includes(extension)) {
                try {
                    await fileService.createFile(fileName);
                    await onRefreshFiles();
                    toast.success('File creato con successo');
                } catch (error) {
                    toast.error('Errore durante la creazione del file');
                }
            } else {
                await sweetAlert.error(
                    'Estensione non valida',
                    'L\'estensione del file non è supportata'
                );
            }
        }
    };

    return (
        <div className={`fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg p-4 z-40 transition-transform duration-300 ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
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
                                className={`flex items-center w-full p-2 ${
                                    currentView === 'files'
                                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-400'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900'
                                } rounded-lg`}
                            >
                                <span className="material-icons mr-3">folder</span>
                                File Browser
                            </button>
                        </li>
                        <li>
                            <div className="flex flex-col">
                                <button
                                    onClick={() => setIsFilesOpen(!isFilesOpen)}
                                    className="flex items-center justify-between w-full p-2 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg"
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
                                            <button
                                                onClick={handleCreateFolder}
                                                className="flex items-center w-full p-2 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg text-sm"
                                            >
                                                <span className="material-icons text-xl mr-3">create_new_folder</span>
                                                Nuova cartella
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                onClick={handleCreateFile}
                                                className="flex items-center w-full p-2 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg text-sm"
                                            >
                                                <span className="material-icons text-xl mr-3">note_add</span>
                                                Nuovo file
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                onClick={handleDeleteAll}
                                                className="flex items-center w-full p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg text-sm"
                                            >
                                                <span className="material-icons text-xl mr-3">delete</span>
                                                Cestina tutti i file
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </li>
                        <li>
                            <button
                                onClick={() => onViewChange('trash')}
                                className={`flex items-center w-full p-2 ${
                                    currentView === 'trash'
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
                                onClick={() => onViewChange('changelog')}
                                className={`flex items-center w-full p-2 rounded-lg ${
                                    currentView === 'changelog'
                                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-400'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900'
                                }`}
                            >
                                <TbLogs className="w-6 h-6 mr-3" />
                                Changelog
                            </button>
                        </li>
                    </ul>
                </nav>

                {/* Storage Section */}
                <button
                    onClick={() => onViewChange('settings')}
                    className={`flex items-center w-full mb-3 p-2 rounded-lg ${
                        currentView === 'settings'
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
                <p className="mt-2 text-xs text-gray-700 dark:text-gray-300 text-center">v1.4.2</p>
            </div>
        </div>
    );
};

export default Sidebar; 