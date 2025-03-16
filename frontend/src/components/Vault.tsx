import React, { useState, useEffect } from 'react';
import { sweetAlert } from '../utils/sweetAlert';
import { fileService } from '../services/fileService';
import toast from 'react-hot-toast';
import { FileIcon, TrashIcon, DownloadIcon } from './Icons';
import { useNavigate } from 'react-router-dom';
import { VaultPasswordDialog } from './VaultPasswordDialog';

interface FileData {
    name: string;
    size: string;
    date: string;
    type: 'file' | 'folder';
    path: string;
    children?: FileData[];
}

interface FileItemProps {
    item: FileData;
    onDelete: (path: string) => Promise<void>;
    onRestore: (path: string) => Promise<void>;
    onDoubleClick: (item: FileData) => void;
    level?: number;
}

const FileItem: React.FC<FileItemProps> = ({ item, onDelete, onRestore, onDoubleClick, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const isEditable = () => {
        const extension = item.name.split('.').pop()?.toLowerCase() || '';
        return ['txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'css', 'html'].includes(extension);
    };

    const isPreviewable = () => {
        const extension = item.name.split('.').pop()?.toLowerCase() || '';
        return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'pdf'].includes(extension);
    };

    const isMediaFile = () => {
        const extension = item.name.split('.').pop()?.toLowerCase() || '';
        return ['mp3', 'wav', 'ogg', 'aac', 'flac', 'wma', 'mp4', 'webm', 'ogv', 'avi', 'mov', 'wmv'].includes(extension);
    };

    return (
        <>
            <tr className="border-b last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <td className="p-3 flex items-center">
                    <div style={{ width: `${level * 24}px` }} />
                    {item.type === 'folder' && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <span className="material-icons">
                                {isExpanded ? 'expand_more' : 'chevron_right'}
                            </span>
                        </button>
                    )}
                    <div 
                        className={`flex items-center ${(isEditable() || isPreviewable() || isMediaFile()) && item.type !== 'folder' ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : ''}`}
                        onDoubleClick={() => item.type !== 'folder' && (isEditable() || isPreviewable() || isMediaFile()) && onDoubleClick(item)}
                        title={item.type !== 'folder' ? (isEditable() ? 'Doppio click per modificare' : isPreviewable() ? 'Doppio click per visualizzare' : isMediaFile() ? 'Doppio click per riprodurre' : undefined) : undefined}
                    >
                        <FileIcon filename={item.name} />
                        <span className="ml-3 text-gray-800 dark:text-gray-200">{item.name}</span>
                    </div>
                </td>
                <td className="p-2 text-gray-600 dark:text-gray-300">{item.size}</td>
                <td className="p-2 text-gray-600 dark:text-gray-300">{item.date}</td>
                <td className="p-2 text-center">
                    <div className="flex items-center justify-center space-x-2">
                        <button
                            onClick={async () => {
                                try {
                                    const response = await fileService.downloadVaultFile(item.path);
                                    const blob = new Blob([response.data], { type: 'text/plain' });
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('download', item.name);
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                } catch (error) {
                                    console.error('Errore durante il download:', error);
                                    toast.error('Errore durante il download');
                                }
                            }}
                            className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                            title="Scarica file"
                        >
                            <DownloadIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => onRestore(item.path)}
                            className="text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-full transition-colors"
                            title="Ripristina file"
                        >
                            <span className="material-icons text-xl">restore</span>
                        </button>
                        <button
                            onClick={() => onDelete(item.path)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                            title="Elimina definitivamente"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                </td>
            </tr>
            {item.type === 'folder' && isExpanded && item.children && item.children.length > 0 && (
                <>
                    {item.children.map((child) => (
                        <FileItem
                            key={child.path}
                            item={child}
                            onDelete={onDelete}
                            onRestore={onRestore}
                            onDoubleClick={onDoubleClick}
                            level={level + 1}
                        />
                    ))}
                </>
            )}
        </>
    );
};

interface VaultProps {
    onStorageUpdate?: () => void;
}

const Vault: React.FC<VaultProps> = ({ onStorageUpdate }) => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [previewType, setPreviewType] = useState<string>('');
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);

    const loadVaultFiles = async () => {
        try {
            setLoading(true);
            const data = await fileService.getVaultFiles();
            setFiles(data);
        } catch (error) {
            console.error('Errore nel caricamento dei file della cassaforte:', error);
            toast.error('Errore nel caricamento dei file');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Verifica se esiste già un token valido
        const token = localStorage.getItem('vaultToken');
        if (token) {
            // Prova a caricare i file per verificare se il token è ancora valido
            loadVaultFiles().then(() => {
                setIsAuthenticated(true);
            }).catch(() => {
                // Se c'è un errore, il token non è più valido
                localStorage.removeItem('vaultToken');
                setIsAuthenticated(false);
            });
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            loadVaultFiles();
        }
    }, [isAuthenticated]);

    const handleAuthentication = async () => {
        const password = await sweetAlert.passwordPrompt(
            'Accesso Cassaforte',
            'Inserisci la password per accedere alla cassaforte'
        );

        if (!password) return;

        try {
            await fileService.authenticateVault(password);
            setIsAuthenticated(true);
            await loadVaultFiles();
            toast.success('Accesso effettuato con successo');
        } catch (error) {
            console.error('Errore di autenticazione:', error);
            toast.error('Password non valida');
            setIsAuthenticated(false);
        }
    };

    const handleDelete = async (filepath: string) => {
        const result = await sweetAlert.confirm(
            'Elimina file',
            'Sei sicuro di voler eliminare definitivamente questo file dalla cassaforte?',
            'warning'
        );

        if (result) {
            try {
                await fileService.deleteFromVault(filepath);
                await loadVaultFiles();
                onStorageUpdate?.();
                toast.success('File eliminato con successo');
            } catch (error) {
                console.error('Errore durante l\'eliminazione:', error);
                toast.error('Errore durante l\'eliminazione del file');
            }
        }
    };

    const handleRestore = async (filepath: string) => {
        const result = await sweetAlert.confirm(
            'Ripristina file',
            'Vuoi ripristinare questo file nella cartella principale?',
            'warning'
        );

        if (result) {
            try {
                await fileService.restoreFromVault(filepath);
                await loadVaultFiles();
                toast.success('File ripristinato con successo');
            } catch (error) {
                console.error('Errore durante il ripristino:', error);
                toast.error('Errore durante il ripristino del file');
            }
        }
    };

    const handleFileDoubleClick = async (item: FileData) => {
        const extension = item.name.split('.').pop()?.toLowerCase() || '';
        
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'pdf'].includes(extension)) {
            try {
                const response = await fileService.downloadVaultFile(item.path);
                const blob = new Blob([response.data], { 
                    type: extension === 'svg' 
                        ? 'image/svg+xml' 
                        : extension === 'pdf'
                        ? 'application/pdf'
                        : `image/${extension}` 
                });
                
                const url = window.URL.createObjectURL(blob);
                setPreviewType(extension);
                setImagePreview(url);
            } catch (error) {
                console.error('Error loading file:', error);
                toast.error('Errore nel caricamento del file');
            }
        } else if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'wma'].includes(extension)) {
            try {
                const response = await fileService.downloadVaultFile(item.path);
                const blob = new Blob([response.data], { type: `audio/${extension}` });
                const url = window.URL.createObjectURL(blob);
                setPreviewType('audio');
                setImagePreview(url);
            } catch (error) {
                console.error('Error loading audio file:', error);
                toast.error('Errore nel caricamento del file audio');
            }
        } else if (['mp4', 'webm', 'ogv', 'avi', 'mov', 'wmv'].includes(extension)) {
            try {
                const response = await fileService.downloadVaultFile(item.path);
                const blob = new Blob([response.data], { type: `video/${extension}` });
                const url = window.URL.createObjectURL(blob);
                setPreviewType('video');
                setImagePreview(url);
            } catch (error) {
                console.error('Error loading video file:', error);
                toast.error('Errore nel caricamento del file video');
            }
        } else if (['txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'css', 'html'].includes(extension)) {
            try {
                const response = await fileService.downloadVaultFile(item.path);
                // Per i file di testo, converti l'arraybuffer in stringa
                const decoder = new TextDecoder('utf-8');
                const content = decoder.decode(response.data);

                // Navigate to editor page with content and file path
                navigate('/editor', {
                    state: {
                        content: content,
                        filePath: item.path,
                        isVaultFile: true
                    }
                });
            } catch (error) {
                console.error('Error loading file:', error);
                toast.error('Errore nel caricamento del file');
            }
        }
    };

    // Funzione per chiudere il preview
    const handleCloseImagePreview = () => {
        if (imagePreview) {
            window.URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
            setPreviewType('');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('vaultToken');
        setIsAuthenticated(false);
        setFiles([]);
    };

    const handlePasswordDialogSuccess = () => {
        // Ricarica i file dopo l'impostazione della password
        loadVaultFiles();
    };

    // Se non autenticato, mostra il form di login
    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="text-center p-8 rounded-lg bg-white dark:bg-gray-800 shadow-lg max-w-md w-full">
                    <span className="material-icons text-6xl text-blue-500 mb-4">lock</span>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Area Protetta</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        Questa sezione è protetta da password. Per accedere ai contenuti della cassaforte, è necessario inserire la password corretta.
                    </p>
                    <button
                        onClick={handleAuthentication}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Accedi alla Cassaforte
                    </button>
                </div>
            </div>
        );
    }

    // Contenuto della cassaforte quando autenticato
    return (
        <div className="p-6 bg-gray-100 dark:bg-gray-900">
            {/* Preview Modal */}
            {imagePreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
                    <button
                        onClick={handleCloseImagePreview}
                        className="fixed top-4 right-4 w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none shadow-lg z-[60] cursor-pointer"
                    >
                        <span className="material-icons">close</span>
                    </button>
                    <div className="relative w-[95%] h-[95%] flex items-center justify-center">
                        {previewType === 'pdf' ? (
                            <iframe
                                src={imagePreview}
                                title="PDF Preview"
                                className="w-full h-full rounded-lg bg-white dark:bg-gray-800"
                                style={{ minHeight: '95vh' }}
                            />
                        ) : previewType === 'audio' ? (
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
                                <audio
                                    controls
                                    autoPlay
                                    className="w-full max-w-2xl"
                                    controlsList="nodownload"
                                >
                                    <source src={imagePreview} type="audio/mpeg" />
                                    Il tuo browser non supporta l'elemento audio.
                                </audio>
                            </div>
                        ) : previewType === 'video' ? (
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
                                <video
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-[80vh]"
                                    controlsList="nodownload"
                                >
                                    <source src={imagePreview} type="video/mp4" />
                                    Il tuo browser non supporta l'elemento video.
                                </video>
                            </div>
                        ) : (
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="max-w-full max-h-[95vh] object-contain rounded-lg"
                            />
                        )}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 ps-10">Cassaforte</h2>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-red-500 hover:text-red-600 transition-colors flex items-center"
                    >
                        <span className="material-icons mr-2">logout</span>
                        Esci
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            ) : files.length === 0 ? (
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <span className="material-icons text-4xl text-gray-400 mb-4">folder_open</span>
                    <p className="text-gray-600 dark:text-gray-300">
                        Nessun file nella cassaforte. Usa l'opzione "Cassaforte" dal File Browser per aggiungere file protetti.
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-3 text-left text-gray-600 dark:text-gray-300">Nome</th>
                                <th className="p-3 text-left text-gray-600 dark:text-gray-300">Dimensione</th>
                                <th className="p-3 text-left text-gray-600 dark:text-gray-300">Data</th>
                                <th className="p-3 text-center text-gray-600 dark:text-gray-300">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map((file) => (
                                <FileItem
                                    key={file.path}
                                    item={file}
                                    onDelete={handleDelete}
                                    onRestore={handleRestore}
                                    onDoubleClick={handleFileDoubleClick}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <VaultPasswordDialog
                isOpen={showPasswordDialog}
                onClose={() => setShowPasswordDialog(false)}
                onSuccess={handlePasswordDialogSuccess}
            />
        </div>
    );
};

export default Vault; 