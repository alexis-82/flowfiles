import React, { useState, useEffect } from 'react';
import { fileService } from '../services/fileService';
import toast from 'react-hot-toast';
import { sweetAlert } from '../utils/sweetAlert';
import { AxiosError } from 'axios';

interface VaultPasswordDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const VaultPasswordDialog: React.FC<VaultPasswordDialogProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const status = await fileService.checkVaultStatus();
                setIsConfigured(status.isConfigured);
            } catch (error) {
                console.error('Errore nel controllo dello stato della cassaforte:', error);
            }
        };

        if (isOpen) {
            checkStatus();
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('Le password non coincidono');
            return;
        }

        if (newPassword.length < 8) {
            toast.error('La password deve essere di almeno 8 caratteri');
            return;
        }

        try {
            await fileService.setVaultPassword(
                isConfigured ? currentPassword : null,
                newPassword
            );
            toast.success('Password della cassaforte impostata con successo');
            onSuccess();
            onClose();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Errore durante l\'impostazione della password');
        }
    };

    const handleReset = async () => {
        const confirmed = await sweetAlert.confirm(
            'Reset Password',
            'Sei sicuro di voler resettare la password della cassaforte? Questa azione non può essere annullata.',
            'warning'
        );

        if (confirmed) {
            try {
                await fileService.resetVaultPassword();
                toast.success('Password resettata con successo');
                onSuccess();
                onClose();
            } catch (error) {
                const axiosError = error as AxiosError<{error: string}>;
                toast.error(
                    axiosError.response?.data?.error || 
                    'Errore durante il reset della password'
                );
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    {isConfigured ? 'Modifica Password Cassaforte' : 'Imposta Password Cassaforte'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isConfigured && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Password Attuale
                            </label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Nuova Password
                        </label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                            required
                            minLength={8}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Conferma Nuova Password
                        </label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                            required
                            minLength={8}
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="showPassword"
                            checked={showPassword}
                            onChange={(e) => setShowPassword(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <label htmlFor="showPassword" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                            Mostra password
                        </label>
                    </div>

                    <div className="flex justify-between items-center mt-6">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none"
                        >
                            Reset Password
                        </button>
                        
                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Salva
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}; 