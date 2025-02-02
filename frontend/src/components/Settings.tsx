/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { fileService } from '../services/fileService';
import toast from 'react-hot-toast';

interface SettingsProps {
    onSettingsUpdate: () => void;
}

interface StorageConfig {
    storageLimit: number;
    fileSizeLimit: number;
}

export const Settings: React.FC<SettingsProps> = ({ onSettingsUpdate }) => {
    const [config, setConfig] = useState<StorageConfig>({
        storageLimit: 2,
        fileSizeLimit: 1
    });

    useEffect(() => {
        fetchCurrentConfig();
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

    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto p-6 mt-6 bg-white shadow-xl rounded-xl mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex-1"></div>
                        <h1 className="text-3xl font-bold text-center flex-1" style={{ color: '#209CEE' }}>Impostazioni</h1>
                        <div className="flex-1"></div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6 shadow">
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold text-gray-700 text-center mb-4">Configurazione Storage</h2>
                            <p className="text-gray-600 text-center mb-6">
                                Configura i limiti di storage per il tuo file system. Questi limiti si applicano a tutti i file e cartelle nel sistema.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-lg shadow-sm space-y-2">
                                    <label className="block text-lg font-medium text-gray-700">
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
                                            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                                        />
                                        <div className="absolute inset-y-0 right-8 pr-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 text-lg">GB</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Spazio totale disponibile per tutti i file
                                    </p>
                                </div>

                                <div className="bg-white p-6 rounded-lg shadow-sm space-y-2">
                                    <label className="block text-lg font-medium text-gray-700">
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
                                            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                                        />
                                        <div className="absolute inset-y-0 right-8 pr-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 text-lg">GB</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">
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
                </div>
            </div>
        </div>
    );
}; 