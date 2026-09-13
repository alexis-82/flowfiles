/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useContext } from 'react';
import { fileService } from '../services/fileService';
import toast from 'react-hot-toast';
import { ThemeContext } from '../App';
import Swal from 'sweetalert2';
import { sweetAlert } from '../utils/sweetAlert';
import { VaultPasswordDialog } from './VaultPasswordDialog';

interface SettingsProps {
    onSettingsUpdate: () => void;
}

interface StorageConfig {
    storageLimit: number;
    fileSizeLimit: number;
}

interface GithubRelease {
    tag_name: string;
    body: string;
    html_url: string;
}

const CURRENT_VERSION = 'v1.4.4';

export const Settings: React.FC<SettingsProps> = ({ onSettingsUpdate }) => {
    const [config, setConfig] = useState<StorageConfig>({
        storageLimit: 2,
        fileSizeLimit: 1
    });
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);
    const [showVaultPasswordDialog, setShowVaultPasswordDialog] = useState(false);
    const [isVaultConfigured, setIsVaultConfigured] = useState(false);

    useEffect(() => {
        fetchCurrentConfig();
        checkVaultStatus();
    }, []);

    const fetchCurrentConfig = async () => {
        try {
            const response = await fileService.getStorageSettings();
            const { storageLimit, fileSizeLimit } = response;
            setConfig({
                storageLimit: storageLimit / (1024 * 1024 * 1024), // Convert bytes to GB
                fileSizeLimit: fileSizeLimit / (1024 * 1024 * 1024)
            });
        } catch (error) {
            toast.error('Errore nel caricamento delle impostazioni');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fileService.updateStorageSettings(config.storageLimit, config.fileSizeLimit);
            await fileService.getStorageInfo();
            onSettingsUpdate();
            toast.success('Impostazioni aggiornate con successo');
        } catch (error) {
            toast.error('Errore nel salvataggio delle impostazioni');
        }
    };

    const compareVersions = (current: string, latest: string): number => {
        const currentParts = current.replace('v', '').split('.').map(Number);
        const latestParts = latest.replace('v', '').split('.').map(Number);
        
        for (let i = 0; i < 3; i++) {
            if (latestParts[i] > currentParts[i]) return -1;
            if (latestParts[i] < currentParts[i]) return 1;
        }
        return 0;
    };

    // L'auto-update via UI è stato rimosso: aggiorna il server via SSH.
    // Vedi scripts/flowfiles-update.sh (installato in /usr/local/bin/flowfiles-update).
    const checkForUpdates = async () => {
        setIsCheckingUpdate(true);
        try {
            const response = await fetch('https://api.github.com/repos/alexis-82/flowfiles/releases/latest');
            const data: GithubRelease = await response.json();

            if (compareVersions(CURRENT_VERSION, data.tag_name) < 0) {
                await Swal.fire({
                    title: 'Aggiornamento disponibile',
                    html: `
                        <div class="text-left">
                            <p class="mb-2">È disponibile una nuova versione: <strong>${data.tag_name}</strong> (attuale: ${CURRENT_VERSION})</p>
                            <p class="text-sm mb-2">Note di rilascio:</p>
                            <div class="text-sm bg-gray-100 p-3 rounded max-h-40 overflow-y-auto mb-4">
                                ${data.body.replace(/\n/g, '<br>')}
                            </div>
                            <p class="text-sm mb-2">Per aggiornare, connettiti al server via SSH ed esegui:</p>
                            <pre class="text-sm bg-gray-900 text-green-400 p-3 rounded overflow-x-auto"><code>sudo flowfiles-update</code></pre>
                            <p class="text-xs text-gray-500 mt-3">Lo script scarica la nuova versione, installa le dipendenze, ricompila e riavvia i servizi. Se non è installato, vedi <code>scripts/flowfiles-update.sh</code> nel repo.</p>
                        </div>
                    `,
                    icon: 'info',
                    confirmButtonText: 'Ho capito'
                });
            } else {
                toast.success('Sei già alla versione più recente');
            }
        } catch (error) {
            toast.error('Errore durante la verifica degli aggiornamenti');
        } finally {
            setIsCheckingUpdate(false);
        }
    };

    const checkVaultStatus = async () => {
        try {
            const status = await fileService.checkVaultStatus();
            setIsVaultConfigured(status.isConfigured);
        } catch (error) {
            console.error('Errore nel controllo dello stato della cassaforte:', error);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto p-6 mt-6 bg-white dark:bg-gray-800 shadow-xl rounded-xl mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex-1"></div>
                        <h1 className="text-3xl font-bold text-center flex-1 text-blue-500">Impostazioni</h1>
                        <div className="flex-1"></div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 shadow mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Tema</h2>
                                <p className="text-gray-600 dark:text-gray-400">Switch tra tema Light e Dark</p>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className="relative inline-flex items-center h-6 rounded-full w-11 bg-gray-200 dark:bg-blue-600 focus:outline-none"
                            >
                                <span className="sr-only">Cambia tema</span>
                                <span
                                    className={`${
                                        isDarkMode ? 'translate-x-6' : 'translate-x-1'
                                    } inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out`}
                                />
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 shadow">
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 text-center mb-4">Configurazione Storage</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                                Configura i limiti di storage per il tuo file system. Questi limiti si applicano a tutti i file e cartelle.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-gray-600 p-6 rounded-lg shadow-sm space-y-2">
                                    <label className="block text-lg font-medium text-gray-700 dark:text-gray-200">
                                        Limite Storage Totale
                                    </label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <input
                                            type="number"
                                            value={config.storageLimit || ''}
                                            onChange={(e) => {
                                                const value = e.target.value === '' ? 0 : Number(e.target.value);
                                                setConfig({ ...config, storageLimit: value });
                                            }}
                                            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                                        />
                                        <div className="absolute inset-y-0 right-8 pr-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 dark:text-gray-400 text-lg">GB</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                        Spazio totale disponibile per tutti i file
                                    </p>
                                </div>

                                <div className="bg-white dark:bg-gray-600 p-6 rounded-lg shadow-sm space-y-2">
                                    <label className="block text-lg font-medium text-gray-700 dark:text-gray-200">
                                        Limite Dimensione File
                                    </label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <input
                                            type="number"
                                            value={config.fileSizeLimit || ''}
                                            onChange={(e) => {
                                                const value = e.target.value === '' ? 0 : Number(e.target.value);
                                                setConfig({ ...config, fileSizeLimit: value });
                                            }}
                                            className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                                        />
                                        <div className="absolute inset-y-0 right-8 pr-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 dark:text-gray-400 text-lg">GB</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                        Dimensione massima consentita per singolo file
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-center mt-8">
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                >
                                    Salva Impostazioni
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 shadow mt-6">
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 text-center mb-4">
                                Impostazioni Cassaforte
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                                Gestisci la password della cassaforte per proteggere i tuoi file sensibili.
                            </p>
                        </div>

                        <div className="flex flex-col items-center space-y-4">
                            <div className="text-center">
                                <span className="material-icons text-4xl text-blue-500 mb-2">
                                    {isVaultConfigured ? 'lock' : 'lock_open'}
                                </span>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    {isVaultConfigured 
                                        ? 'La cassaforte è protetta da password' 
                                        : 'La cassaforte non è ancora configurata'}
                                </p>
                            </div>

                            <div className="flex space-x-4">
                                <button
                                    onClick={() => setShowVaultPasswordDialog(true)}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    {isVaultConfigured ? 'Modifica Password' : 'Imposta Password'}
                                </button>
                                {isVaultConfigured && (
                                    <button
                                        onClick={async () => {
                                            const confirmed = await sweetAlert.confirm(
                                                'Reset Password',
                                                'Sei sicuro di voler resettare la password della cassaforte? Questa azione non può essere annullata.',
                                                'warning'
                                            );
                                            
                                            if (confirmed) {
                                                try {
                                                    await fileService.resetVaultPassword();
                                                    toast.success('Password resettata con successo');
                                                    checkVaultStatus();
                                                } catch (error) {
                                                    toast.error('Errore durante il reset della password');
                                                }
                                            }
                                        }}
                                        className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        Reset Password
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 shadow mt-6">
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 text-center mb-4">Aggiornamento</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                                Gestisci gli aggiornamenti del sistema e verifica la disponibilità di nuove versioni.
                            </p>
                        </div>

                        <div className="bg-white dark:bg-gray-600 p-6 rounded-lg shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">Versione Attuale</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mt-1">{CURRENT_VERSION}</p>
                                </div>
                                <div className="flex space-x-4">
                                    <button
                                        onClick={checkForUpdates}
                                        disabled={isCheckingUpdate}
                                        className={`px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                                            isCheckingUpdate ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        {isCheckingUpdate ? 'Verifica in corso...' : 'Verifica Aggiornamenti'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <VaultPasswordDialog
                isOpen={showVaultPasswordDialog}
                onClose={() => setShowVaultPasswordDialog(false)}
                onSuccess={() => {
                    checkVaultStatus();
                    setShowVaultPasswordDialog(false);
                }}
            />
        </div>
    );
}; 