/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { FileIcon, RestoreIcon, TrashIcon, FolderIcon } from './Icons';
import { fileService } from '../services/fileService';
import toast from 'react-hot-toast';
import { sweetAlert } from '../utils/sweetAlert';

interface FileData {
    name: string;
    size: string;
    date: string;
    type: 'file' | 'folder';
    path: string;
}

interface TrashViewProps {
    onFilesUpdate: () => void;
    onStorageUpdate: () => void;
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
};

const TrashView: React.FC<TrashViewProps> = ({ onFilesUpdate, onStorageUpdate }) => {
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);

    const loadTrashFiles = async () => {
        try {
            const data = await fileService.getTrashFiles();
            setFiles(data);
        } catch (error) {
            toast.error('Errore nel caricamento dei file del cestino');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTrashFiles();
    }, []);

    const handleRestore = async (filename: string) => {
        try {
            await fileService.restoreFromTrash(filename);
            await loadTrashFiles();
            onFilesUpdate();
            toast.success('File ripristinato con successo');
        } catch (error) {
            toast.error('Errore durante il ripristino del file');
        }
    };

    const handleDelete = async (filename: string) => {
        const confirmed = await sweetAlert.confirm(
            'Elimina definitivamente',
            'Sei sicuro di voler eliminare definitivamente questo file?',
            'warning'
        );
        
        if (confirmed) {
            try {
                await fileService.deleteFromTrash(filename);
                await loadTrashFiles();
                onStorageUpdate();
                toast.success('File eliminato definitivamente');
            } catch (error) {
                toast.error('Errore durante l\'eliminazione del file');
            }
        }
    };

    const handleEmptyTrash = async () => {
        const confirmed = await sweetAlert.confirm(
            'Svuota cestino',
            'Sei sicuro di voler svuotare il cestino? Questa azione è irreversibile.',
            'warning'
        );
        
        if (confirmed) {
            try {
                await fileService.emptyTrash();
                await loadTrashFiles();
                onStorageUpdate();
                toast.success('Cestino svuotato con successo');
            } catch (error) {
                toast.error('Errore durante lo svuotamento del cestino');
            }
        }
    };

    if (loading) {
        return <div className="text-center py-8 text-gray-600 dark:text-gray-400">Caricamento...</div>;
    }

    return (
        <div className="p-6 bg-gray-100 dark:bg-gray-900">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 ps-10">Cestino</h2>
                {files.length > 0 && (
                    <button
                        onClick={handleEmptyTrash}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition-colors"
                    >
                        Svuota cestino
                    </button>
                )}
            </div>

            {files.length === 0 ? (
                <div className="flex items-center justify-center h-[calc(100vh-200px)] text-gray-500 dark:text-gray-400">
                    Il cestino è vuoto
                </div>
            ) : (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden shadow">
                    <table className="w-full table-auto">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="p-2 text-left text-gray-600 dark:text-gray-300">Nome</th>
                                <th className="p-2 text-left text-gray-600 dark:text-gray-300">Dimensione</th>
                                <th className="p-2 text-left text-gray-600 dark:text-gray-300">Data</th>
                                <th className="p-3 text-center text-gray-600 dark:text-gray-300">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                            {files.map((item) => (
                                <tr key={item.path} className="border-b last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <td className="p-3 flex items-center">
                                        <div className="flex items-center">
                                            {item.type === 'folder' ? (
                                                <span className="text-yellow-500 dark:text-yellow-400">
                                                    <FolderIcon />
                                                </span>
                                            ) : (
                                                <FileIcon filename={item.name} />
                                            )}
                                            <span className="ml-3 text-gray-800 dark:text-gray-200">{item.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-2 text-gray-600 dark:text-gray-300">{item.size}</td>
                                    <td className="p-2 text-gray-600 dark:text-gray-300">{formatDate(item.date)}</td>
                                    <td className="p-2 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button
                                                onClick={() => handleRestore(item.name)}
                                                className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors p-2"
                                                title="Ripristina file"
                                            >
                                                <RestoreIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.name)}
                                                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors p-2"
                                                title="Elimina definitivamente"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TrashView; 