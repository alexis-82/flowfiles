/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { FileIcon, TrashIcon, DiskUploadIcon, DownloadIcon, RenameIcon } from './Icons';
import { fileService } from '../services/fileService';
import { useNavigate } from 'react-router-dom';
import customToast from '../utils/toast';
import { toast } from 'react-hot-toast';
import JSZip from 'jszip';
// import path from 'path';
import Swal from 'sweetalert2';

interface FileData {
    name: string;
    size: string;
    date: string;
    type: 'file' | 'folder';
    path: string;
    children?: FileData[];
    originalTimestamp?: number;
}

// Definiamo l'interfaccia per il ref
export interface FileBrowserHandle {
    loadFiles: () => Promise<void>;
    resetPath: () => void;
}

interface FileBrowserProps {
    onStorageUpdate?: () => void;
}

interface FileUploaderProps {
    onUpload: (file: globalThis.File, targetPath: string) => Promise<void>;
    currentPath: string;
    onFolderUpload?: () => Promise<void>;
    onStorageUpdate?: () => void;
}

const EDITABLE_EXTENSIONS = [
    'txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'css', 'html',
    'xml', 'yml', 'yaml', 'ini', 'conf', 'sh', 'bat', 'ps1', 'py',
    'java', 'cpp', 'c', 'h', 'hpp', 'sql', 'env', 'gitignore', 'md', 'markdown',
    'gitkeep', 'csv', 'xlsx', 'xls', 'doc', 'docx', 'ppt', 'pptx', 'odt', 'ods',
    'odp', 'txt', 'rtf', 'csv', 'tsv', 'log', 'bak', 'tmp', 'old', 'backup', 'cache',
    'temp', 'Dockerfile', 'dockerignore', 'dockerfile', 'info', 'mjs', 'mts', 'mjsx', 'mtsx'
];

const PREVIEW_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'pdf'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'wma'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogv', 'avi', 'mov', 'wmv'];

const FileUploader: React.FC<FileUploaderProps> = ({ onUpload, currentPath, onFolderUpload, onStorageUpdate }) => {
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [, setTotalFiles] = useState(0);
    const [, setProcessedFiles] = useState(0);
    const [isScanning, setIsScanning] = useState(false);
    const toastIdRef = useRef<string>('');
    const scannedFilesRef = useRef<number>(0);

    const updateProgressToast = (processed: number, total: number, message: string = 'Caricamento in corso...') => {
        if (total === 0) return;

        const percentage = Math.round((processed / total) * 100);
        let statusMessage = message;
        let progressMessage = '';

        if (isScanning) {
            statusMessage = 'Scansione cartelle in corso...';
            progressMessage = `Scansione: ${total} file trovati`;
        } else {
            progressMessage = `${processed}/${total} file (${percentage}%)`;
        }

        toast.loading(
            <div className="flex flex-col">
                <span>{statusMessage}</span>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <span className="text-xs text-gray-500 mt-1">{progressMessage}</span>
            </div>,
            { id: toastIdRef.current }
        );
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleFiles = async (files: File[]) => {
        const uploadPromises = files.map(file => 
            onUpload(file, currentPath)
                .catch(error => {
                    console.error('Errore durante il caricamento:', error);
                    customToast.error(`Errore durante il caricamento di ${file.name}`);
                })
        );
        
        await Promise.all(uploadPromises);
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (onStorageUpdate) onStorageUpdate();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            await handleFiles(files);
        }
    };

    const handleBrowseClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        fileInputRef.current?.click();
    };

    // Funzione helper per unire i percorsi
    const joinPaths = (...paths: string[]): string => {
        return paths
            .map(path => path.replace(/^\/+|\/+$/g, '')) // Rimuove gli slash iniziali e finali
            .filter(Boolean) // Rimuove stringhe vuote
            .join('/');
    };

    const processDirectory = async (directoryEntry: any, basePath: string, filesToUpload: File[]): Promise<void> => {
        return new Promise((resolve, reject) => {
            const reader = directoryEntry.createReader();
            
            const readEntries = () => {
                reader.readEntries(async (entries: any[]) => {
                    if (entries.length === 0) {
                        resolve();
                        return;
                    }
                    
                    const fileEntries = entries.filter(entry => entry.isFile);
                    if (fileEntries.length > 0) {
                        scannedFilesRef.current += fileEntries.length;
                        // Aggiungiamo un piccolo ritardo per rendere visibile il conteggio
                        await new Promise(resolve => setTimeout(resolve, 50));
                        setTotalFiles(scannedFilesRef.current);
                        updateProgressToast(0, scannedFilesRef.current, 'Scansione cartelle...');
                    }
                    
                    const promises = entries.map(entry => {
                        return new Promise<void>((resolveEntry) => {
                            if (entry.isDirectory) {
                                processDirectory(entry, joinPaths(basePath, entry.name), filesToUpload)
                                    .then(resolveEntry)
                                    .catch(reject);
                            } else if (entry.isFile) {
                                entry.file((file: File) => {
                                    const fullPath = entry.fullPath.substring(1);
                                    const newFile = new File([file], file.name, {
                                        type: file.type,
                                        lastModified: file.lastModified
                                    });
                                    Object.defineProperty(newFile, 'webkitRelativePath', {
                                        value: fullPath,
                                        writable: false
                                    });
                                    
                                    filesToUpload.push(newFile);
                                    resolveEntry();
                                }, reject);
                            }
                        });
                    });
                    
                    await Promise.all(promises);
                    readEntries();
                }, reject);
            };
            readEntries();
        });
    };

    const handleFolderDrop = async (event: React.DragEvent) => {
        event.preventDefault();
        setDragOver(false);
        const items = event.dataTransfer.items;
        const files = Array.from(event.dataTransfer.files);
        const filesToUpload: File[] = [];
        const directoryPromises: Promise<void>[] = [];
        const filePromises: Promise<void>[] = [];
        let uploadedFiles = 0;

        // Reset progress state
        scannedFilesRef.current = files.length;
        setTotalFiles(files.length);
        setProcessedFiles(0);
        setIsScanning(true);
        toastIdRef.current = toast.loading('Inizializzazione scansione...', { duration: Infinity });

        try {
            // Prima fase: scansione delle cartelle e conteggio dei file
            for (let i = 0; i < items.length; i++) {
                const item = items[i].webkitGetAsEntry();
                const file = files[i];
                
                if (item && file) {  // Verifichiamo che sia item che file esistano
                    if (item.isFile) {
                        filePromises.push(
                            onUpload(file, currentPath)
                                .then(async () => {
                                    uploadedFiles++;
                                    updateProgressToast(uploadedFiles, scannedFilesRef.current, 'Caricamento file...');
                                })
                                .catch(error => {
                                    console.error('Errore durante il caricamento del file:', error);
                                    customToast.error(`Errore durante il caricamento di ${file.name}`);
                                })
                        );
                    } else if (item.isDirectory) {
                        directoryPromises.push(
                            processDirectory(item, currentPath, filesToUpload)
                                .catch(error => {
                                    console.error('Errore durante il processamento della cartella:', error);
                                    customToast.error(`Errore durante il processamento della cartella ${item.name}`);
                                })
                        );
                    }
                }
            }

            // Attendiamo che tutti i caricamenti siano completati
            await Promise.all([...directoryPromises, ...filePromises]);
            
            if (onStorageUpdate) onStorageUpdate();

            // Piccola pausa per mostrare il totale finale della scansione
            await new Promise(resolve => setTimeout(resolve, 200));
            setIsScanning(false);

            const totalFilesToProcess = scannedFilesRef.current;
            if (totalFilesToProcess === 0) {
                toast.error('Nessun file da caricare', { id: toastIdRef.current });
                return;
            }

            // Processiamo i file delle cartelle
            let totalFolders = 0;
            let lastProcessedFolder = '';
            if (filesToUpload.length > 0) {
                // Raggruppiamo i file per cartella principale
                const filesByFolder = new Map<string, File[]>();
                
                filesToUpload.forEach(file => {
                    const topFolder = file.webkitRelativePath.split('/')[0];
                    if (!filesByFolder.has(topFolder)) {
                        filesByFolder.set(topFolder, []);
                    }
                    filesByFolder.get(topFolder)?.push(file);
                });

                totalFolders = filesByFolder.size;

                // Creiamo un zip per ogni cartella principale
                for (const [folderName, files] of filesByFolder) {
                    lastProcessedFolder = folderName;
                    const folderZip = new JSZip();
                    
                    // Aggiungiamo i file allo zip con aggiornamento progressivo
                    for (const file of files) {
                        const relativePath = file.webkitRelativePath.substring(folderName.length + 1);
                        folderZip.file(relativePath, file);
                        uploadedFiles++;
                        updateProgressToast(uploadedFiles, totalFilesToProcess, `Compressione cartella ${folderName}...`);
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }

                    try {
                        updateProgressToast(uploadedFiles, totalFilesToProcess, `Caricamento cartella ${folderName}...`);
                        const content = await folderZip.generateAsync({ 
                            type: 'blob',
                            compression: 'DEFLATE',
                            compressionOptions: {
                                level: 9
                            }
                        });

                        if (content.size === 0) {
                            console.error(`Generated zip is empty for folder ${folderName}`);
                            customToast.error(`Errore: il file zip generato è vuoto per la cartella ${folderName}`);
                            continue;
                        }

                        const formData = new FormData();
                        formData.append('zipFile', content, `${folderName}.zip`);
                        formData.append('path', currentPath);

                        const response = await fetch('http://localhost:3000/api/files/upload-folder', {
                            method: 'POST',
                            body: formData,
                        });

                        if (response.ok) {
                            if (onFolderUpload) await onFolderUpload();
                            if (onStorageUpdate) onStorageUpdate();
                            updateProgressToast(uploadedFiles, totalFilesToProcess, `Cartella ${folderName} completata`);
                        } else {
                            const errorData = await response.json();
                            customToast.error(`Errore durante il caricamento della cartella ${folderName}: ${errorData.error}`);
                        }
                    } catch (error) {
                        console.error(`handleFolderDrop: error during zip or upload for folder ${folderName}`, error);
                        customToast.error(`Errore durante il caricamento della cartella ${folderName}`);
                    }
                }
            }

            // Piccola pausa prima del messaggio di completamento
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Operazione completata con successo
            const successMessage = totalFolders > 0 
                ? `Caricamento completato: ${lastProcessedFolder}`
                : `Caricamento completato: ${totalFilesToProcess} file`;

            toast.success(successMessage, {
                id: toastIdRef.current,
                duration: 3000
            });

            // Aggiorniamo la lista dei file
            if (onStorageUpdate) onStorageUpdate();
        } catch (error) {
            toast.error('Si è verificato un errore durante il caricamento', {
                id: toastIdRef.current,
                duration: 3000
            });
        } finally {
            setIsScanning(false);
            scannedFilesRef.current = 0;
            setTotalFiles(0);
            setProcessedFiles(0);
            if (onStorageUpdate) onStorageUpdate();
        }
    };

    return (
        <div
            className={`file-uploader rounded-xl p-12 text-center cursor-pointer flex flex-col items-center justify-center min-h-[300px] ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleFolderDrop}
            onClick={handleBrowseClick}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
            />
            <DiskUploadIcon size={64} />
            <p className="text-gray-800 mt-6 text-lg font-semibold">
                Trascina e rilascia file o cartelle qui oppure <span className="text-blue-600">clicca</span> per selezionare i file
            </p>
            <p className="text-gray-500 text-sm mt-2">
                {currentPath === '/' ? 'Carica nella cartella principale' : `Carica in: ${currentPath}`}
            </p>
        </div>
    );
};

const timestampCache = new Map<string, string>();

const formatTimeAgo = (dateString: string, filePath: string, item?: FileData) => {
    // Normalizziamo il percorso per la cache
    const normalizedPath = filePath === '/' ? '/' : filePath;

    // Se il timestamp è già in cache per questo file, lo restituiamo
    if (timestampCache.has(normalizedPath)) {
        return timestampCache.get(normalizedPath);
    }

    const date = new Date(dateString);
    const now = new Date();
    
    // Se l'item ha un originalTimestamp, lo usiamo invece della data corrente
    const diffInSeconds = Math.floor((now.getTime() - (item?.originalTimestamp || date.getTime())) / 1000);

    let formattedTime = '';
    if (diffInSeconds < 60) {
        formattedTime = 'Adesso';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        formattedTime = `${minutes} ${minutes === 1 ? 'minuto' : 'minuti'} fa`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        formattedTime = `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`;
    } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        formattedTime = `${days} ${days === 1 ? 'giorno' : 'giorni'} fa`;
    } else if (diffInSeconds < 31536000) {
        const months = Math.floor(diffInSeconds / 2592000);
        formattedTime = `${months} ${months === 1 ? 'mese' : 'mesi'} fa`;
    } else {
        const years = Math.floor(diffInSeconds / 31536000);
        formattedTime = `${years} ${years === 1 ? 'anno' : 'anni'} fa`;
    }

    // Memorizziamo il timestamp formattato nella cache usando il percorso normalizzato
    timestampCache.set(normalizedPath, formattedTime);
    return formattedTime;
};

interface FileItemProps {
    item: FileData;
    onDelete: (path: string) => Promise<void>;
    onRename: (oldPath: string, newName: string) => Promise<void>;
    onFolderClick: (path: string) => void;
    onUpload: (file: File, targetPath: string) => Promise<void>;
    level: number;
    expanded: boolean;
    onToggle: (path: string) => void;
    onDoubleClick: (item: FileData) => void;
    isSelected: boolean;
    onSelect: (path: string, selected: boolean, isMouseEvent?: boolean) => void;
    onStorageUpdate?: () => void;
    isPathExpanded: (path: string) => boolean;
    selectedFiles?: Set<string>;
}

const FileItem: React.FC<FileItemProps> = ({
    item,
    onDelete,
    onRename,
    onFolderClick,
    onUpload,
    level,
    expanded,
    onToggle,
    onDoubleClick,
    isSelected,
    onSelect,
    onStorageUpdate
}) => {
    const indentation = level * 24;
    const [dragOver, setDragOver] = useState(false);
    // const [isRenaming, setIsRenaming] = useState(false);
    // const [newName, setNewName] = useState(item.name);

    const isEditable = () => {
        const extension = item.name.split('.').pop()?.toLowerCase() || '';
        return EDITABLE_EXTENSIONS.includes(extension);
    };

    const isImage = () => {
        const extension = item.name.split('.').pop()?.toLowerCase() || '';
        return PREVIEW_EXTENSIONS.includes(extension);
    };

    const isMediaFile = () => {
        const extension = item.name.split('.').pop()?.toLowerCase() || '';
        return AUDIO_EXTENSIONS.includes(extension) || VIDEO_EXTENSIONS.includes(extension);
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (item.type === 'folder') {
            e.preventDefault();
            setDragOver(true);
        }
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (item.type === 'folder') {
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                try {
                    const uploadPromises = files.map(file => 
                        onUpload(file, item.path)
                            .catch(error => {
                                console.error('Errore durante il caricamento:', error);
                                customToast.error(`Errore durante il caricamento di ${file.name}`);
                            })
                    );
                    await Promise.all(uploadPromises);
                    if (onStorageUpdate) onStorageUpdate();
                } catch (error) {
                    console.error('Errore durante il caricamento:', error);
                    customToast.error('Errore durante il caricamento dei file');
                }
            }
        }
    };

    const handleClick = () => {
        // Normalizziamo il percorso prima di passarlo alla funzione di selezione
        const normalizedPath = item.path === '/' ? '' : item.path;
        onSelect(normalizedPath, !isSelected, true);
    };

    return (
        <>
            <tr
                className={`border-b last:border-b-0 transition-colors cursor-pointer
                    ${dragOver ? 'bg-blue-50 dark:bg-blue-900' : ''} 
                    ${isSelected 
                        ? 'bg-blue-100 dark:bg-blue-800 font-semibold hover:bg-blue-100 dark:hover:bg-blue-800' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <td className="p-3 flex items-center" style={{ paddingLeft: `${indentation + 12}px` }}>
                    {item.type === 'folder' ? (
                        <div className="flex items-center">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggle(item.path);
                                }}
                                className="mr-2 focus:outline-none cursor-pointer"
                            >
                                <span className="material-icons text-gray-500 dark:text-gray-300 text-sm transform transition-transform">
                                    {expanded ? 'expand_more' : 'chevron_right'}
                                </span>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFolderClick(item.path);
                                }}
                                className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                            >
                                <span className="material-icons text-yellow-500 dark:text-yellow-400">folder</span>
                                <span className="ml-3 text-gray-800 dark:text-gray-200">{item.name}</span>
                            </button>
                        </div>
                    ) : (
                        <div
                            className={`flex items-center ${isEditable() || isImage() || isMediaFile() ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : ''}`}
                            onDoubleClick={() => onDoubleClick(item)}
                            title={isEditable() ? 'Doppio click per modificare' : isImage() ? 'Doppio click per visualizzare' : isMediaFile() ? 'Doppio click per riprodurre' : undefined}
                        >
                            <FileIcon filename={item.name} />
                            <span className="ml-3 text-gray-800 dark:text-gray-200">{item.name}</span>
                        </div>
                    )}
                </td>
                <td className="p-2 text-gray-600 dark:text-gray-300">{item.size}</td>
                <td className="p-2 text-gray-600 dark:text-gray-300">{formatTimeAgo(item.date, item.path, item)}</td>
                <td className="p-2 text-center">
                    <div className="flex items-center justify-center space-x-2">
                        <button
                            onClick={() => {
                                const extension = item.name.includes('.') ? '.' + item.name.split('.').pop() : '';
                                const nameWithoutExt = item.name.replace(extension, '');
                                const newName = prompt('Inserisci il nuovo nome:', nameWithoutExt);
                                if (newName && newName !== nameWithoutExt) {
                                    const parentPath = item.path.split('/').slice(0, -1).join('/');
                                    const newPath = parentPath + '/' + newName + extension;
                                    onRename(item.path, newPath);
                                }
                            }}
                            className="text-yellow-500 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-full transition-colors"
                            title={`Rinomina ${item.type === 'folder' ? 'cartella' : 'file'}`}
                        >
                            <RenameIcon className="w-5 h-5" />
                        </button>
                        {(item.type === 'file' || item.type === 'folder') && (
                            <button
                                onClick={async () => {
                                    try {
                                        if (item.type === 'file') {
                                            const response = await fileService.downloadFile(item.path);
                                            const blob = new Blob([response.data], { type: 'text/plain' });
                                            const url = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.setAttribute('download', item.name);
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(url);
                                        } else {
                                            window.location.href = `http://localhost:3000/api/files/download/${item.path}`;
                                        }
                                    } catch (error) {
                                        console.error('Errore durante il download:', error);
                                        customToast.error('Errore durante il download');
                                    }
                                }}
                                className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                                title={item.type === 'folder' ? "Scarica cartella come ZIP" : "Scarica file"}
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={() => onDelete(item.path)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                            title={`Elimina ${item.type === 'folder' ? 'cartella' : 'file'}`}
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                </td>
            </tr>
        </>
    );
};

const FileItemWithExpand: React.FC<FileItemProps> = (props) => {
    return (
        <>
            <FileItem {...props} />
            {props.item.type === 'folder' && props.expanded && props.item.children && props.item.children.map((child, index) => (
                <FileItemWithExpand
                    key={child.path + index}
                    {...props}
                    item={child}
                    level={props.level + 1}
                    expanded={props.isPathExpanded(child.path)}
                    isSelected={props.selectedFiles?.has(child.path) || false}
                />
            ))}
        </>
    );
};

// Aggiungiamo una funzione per gestire i timestamp persistenti
const getStoredTimestamps = () => {
    const stored = localStorage.getItem('fileTimestamps');
    return stored ? JSON.parse(stored) : {};
};

const setStoredTimestamp = (path: string, timestamp: number) => {
    const timestamps = getStoredTimestamps();
    timestamps[path] = timestamp;
    localStorage.setItem('fileTimestamps', JSON.stringify(timestamps));
};

const removeStoredTimestamp = (path: string) => {
    const timestamps = getStoredTimestamps();
    delete timestamps[path];
    localStorage.setItem('fileTimestamps', JSON.stringify(timestamps));
};

const FileBrowser = forwardRef<FileBrowserHandle, FileBrowserProps>((props, ref) => {
    const navigate = useNavigate();
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState('/');
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [selectedTextFile, setSelectedTextFile] = useState<string | null>(null);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [previewType, setPreviewType] = useState<string>('');
    const createMenuRef = useRef<HTMLDivElement>(null);
    const createButtonRef = useRef<HTMLButtonElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [lastSelectedFile, setLastSelectedFile] = useState<string | null>(null);
    const [isShiftPressed, setIsShiftPressed] = useState(false);
    // const [selectionStart, setSelectionStart] = useState<string | null>(null);

    const loadFiles = async (_currentPath?: string) => {
        try {
            const fileList = await fileService.getAllFiles(_currentPath || '/');
            const storedTimestamps = getStoredTimestamps();
            
            // Aggiungiamo l'originalTimestamp a ogni file
            const processFiles = (files: FileData[]) => {
                return files.map(file => {
                    const normalizedPath = file.path === '/' ? '/' : file.path;
                    
                    // Se il file non ha un timestamp memorizzato, lo salviamo
                    if (!storedTimestamps[normalizedPath]) {
                        storedTimestamps[normalizedPath] = new Date(file.date).getTime();
                        setStoredTimestamp(normalizedPath, storedTimestamps[normalizedPath]);
                    }
                    
                    // Usiamo il timestamp memorizzato
                    file.originalTimestamp = storedTimestamps[normalizedPath];
                    
                    if (file.children) {
                        file.children = processFiles(file.children);
                    }
                    return file;
                });
            };

            setFiles(processFiles(fileList));
            
            // Mantieni le cartelle espanse dopo il ricaricamento
            setExpandedPaths(prev => {
                const newSet = new Set(prev);
                const updateExpansion = (items: FileData[]) => {
                    items.forEach(item => {
                        if (item.type === 'folder' && newSet.has(item.path) && item.children) {
                            item.children.forEach(child => {
                                if (child.type === 'folder') {
                                    newSet.add(child.path);
                                    if (child.children) {
                                        updateExpansion(child.children);
                                    }
                                }
                            });
                        }
                    });
                };
                updateExpansion(fileList);
                return newSet;
            });
        } catch (error) {
            console.error('Errore durante il caricamento dei file', error);
        } finally {
            setLoading(false);
        }
    };

    useImperativeHandle(ref, () => ({
        loadFiles: () => loadFiles(currentPath),
        resetPath: () => setCurrentPath('/')
    }));

    useEffect(() => {
        loadFiles();
    }, [currentPath]);

    const handleFileUpload = async (file: File, targetPath: string) => {
        const toastId = toast.loading('Preparazione al caricamento...');
        try {
            await fileService.uploadFile(file, targetPath, (progress) => {
                toast.loading(
                    <div className="flex flex-col">
                        <span>Caricamento in corso...</span>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-xs text-gray-500 mt-1">{progress}%</span>
                    </div>,
                    { id: toastId }
                );
            });
            
            // Salva il timestamp di caricamento
            const uploadPath = targetPath === '/' ? `/${file.name}` : `${targetPath}/${file.name}`;
            const normalizedPath = uploadPath === '/' ? '/' : uploadPath;
            setStoredTimestamp(normalizedPath, Date.now());
            
            await loadFiles();

            toast.success(`File "${file.name}" caricato con successo in "${targetPath}"`, {
                id: toastId,
            });

            props.onStorageUpdate?.();
        } catch (error) {
            const errorDetails = {
                error: error instanceof Error ? error.message : 'Unknown error',
                file: file.name,
                targetPath
            };

            if (error instanceof Error && error.message === 'Storage limit exceeded') {
                const message = 'Spazio di archiviazione esaurito. Elimina alcuni file prima di caricare nuovi contenuti.';
                fileService.logError(message, errorDetails);
                toast.error(message, { id: toastId });
            } else {
                const message = 'Errore durante il caricamento del file';
                fileService.logError(message, errorDetails);
                toast.error(message, { id: toastId });
            }
            console.error('Errore durante il caricamento:', error);
        }
    };

    const handleFileDelete = async (path: string) => {
        const result = await Swal.fire({
            title: 'Sei sicuro?',
            text: "Sicuro di voler eliminare questo file?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sì, elimina!',
            cancelButtonText: 'Annulla'
        });

        if (result.isConfirmed) {
            try {
                const result = await fileService.deleteFile(path);

                // Rimuovi il timestamp dalla cache e dal localStorage
                const normalizedPath = path === '' ? '/' : path;
                timestampCache.delete(normalizedPath);
                removeStoredTimestamp(normalizedPath);

                if (result.shouldNavigateHome) {
                    setCurrentPath('/');
                    handleFolderClick('/');
                }

                // Aggiorna lo stato selectedFiles rimuovendo il file eliminato
                setSelectedFiles(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(path);
                    return newSet;
                });

                await loadFiles();
                Swal.fire(
                    'Eliminato!',
                    'Il file è stato eliminato con successo.',
                    'success'
                );
                props.onStorageUpdate?.();
            } catch (error) {
                console.error('Errore durante l\'eliminazione:', error);
                Swal.fire(
                    'Errore!',
                    'Si è verificato un errore durante l\'eliminazione.',
                    'error'
                );
            }
        }
    };

    const handleFileRename = async (oldPath: string, newPath: string) => {
        try {
            await fileService.renameFile(oldPath, newPath);
            await loadFiles();
            Swal.fire(
                'Rinominato!',
                'Il file è stato rinominato con successo.',
                'success'
            );
        } catch (error) {
            console.error('Errore durante la rinomina:', error);
            Swal.fire(
                'Errore!',
                'Si è verificato un errore durante la rinomina.',
                'error'
            );
        }
    };

    const handleFolderClick = async (path: string) => {
        setCurrentPath(path);
        await loadFiles(path);
    };

    const handleTogglePath = (path: string) => {
        setExpandedPaths(prev => {
            const newSet = new Set(prev);
            if (newSet.has(path)) {
                // Quando chiudiamo una cartella, rimuoviamo solo il suo path specifico
                newSet.delete(path);
            } else {
                // Quando espandiamo una cartella, aggiungiamo il suo path
                newSet.add(path);
            }
            return newSet;
        });
    };

    const handleCreateFolder = async () => {
        const { value: folderName } = await Swal.fire({
            title: 'Crea nuova cartella',
            input: 'text',
            inputLabel: 'Nome della cartella',
            inputPlaceholder: 'Inserisci il nome della nuova cartella',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) {
                    return 'Devi inserire un nome per la cartella!';
                }
                return null;
            }
        });

        if (folderName) {
            try {
                await fileService.createFolder(folderName, currentPath);
                await loadFiles();
                Swal.fire(
                    'Creata!',
                    'La cartella è stata creata con successo.',
                    'success'
                );
            } catch (error) {
                Swal.fire(
                    'Errore!',
                    'Si è verificato un errore durante la creazione della cartella.',
                    'error'
                );
            }
        }
    };

    const handleCreateFile = async () => {
        const { value: fileName } = await Swal.fire({
            title: 'Crea nuovo file',
            input: 'text',
            inputLabel: 'Nome del file',
            inputPlaceholder: 'Inserisci il nome del nuovo file',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) {
                    return 'Devi inserire un nome per il file!';
                }
                return null;
            }
        });

        if (fileName) {
            try {
                await fileService.createFile(fileName, currentPath);
                await loadFiles();
                Swal.fire(
                    'Creato!',
                    'Il file è stato creato con successo.',
                    'success'
                );
            } catch (error) {
                Swal.fire(
                    'Errore!',
                    'Si è verificato un errore durante la creazione del file.',
                    'error'
                );
            }
        }
    };

    const handleFileDoubleClick = async (item: FileData) => {
        const extension = item.name.split('.').pop()?.toLowerCase() || '';
        
        if (PREVIEW_EXTENSIONS.includes(extension)) {
            try {
                const response = await fileService.downloadFile(item.path);
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
            } catch (error: any) {
                console.error('Error loading file:', error);
                customToast.error('Errore nel caricamento del file');
            }
        } else if (AUDIO_EXTENSIONS.includes(extension)) {
            try {
                const response = await fileService.downloadFile(item.path);
                const blob = new Blob([response.data], { type: `audio/${extension}` });
                const url = window.URL.createObjectURL(blob);
                setPreviewType('audio');
                setImagePreview(url);
            } catch (error: any) {
                console.error('Error loading audio file:', error);
                customToast.error('Errore nel caricamento del file audio');
            }
        } else if (VIDEO_EXTENSIONS.includes(extension)) {
            try {
                const response = await fileService.downloadFile(item.path);
                const blob = new Blob([response.data], { type: `video/${extension}` });
                const url = window.URL.createObjectURL(blob);
                setPreviewType('video');
                setImagePreview(url);
            } catch (error: any) {
                console.error('Error loading video file:', error);
                customToast.error('Errore nel caricamento del file video');
            }
        } else if (EDITABLE_EXTENSIONS.includes(extension)) {
            try {
                const response = await fileService.downloadFile(item.path);
                // Per i file di testo, converti l'arraybuffer in stringa
                const decoder = new TextDecoder('utf-8');
                const content = decoder.decode(response.data);

                // Navigate to editor page with content and file path
                navigate('/editor', {
                    state: {
                        content: content,
                        filePath: item.path
                    }
                });
            } catch (error) {
                console.error('Error loading file:', error);
                customToast.error('Errore nel caricamento del file');
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

    const handleSaveContent = async (content: string) => {
        if (!selectedFilePath) {
            customToast.error('Errore: percorso del file non trovato');
            return;
        }

        try {
            await fileService.saveFile(selectedFilePath, content);
            customToast.success('File salvato con successo');
            setSelectedTextFile(null);
            setSelectedFilePath(null);
            loadFiles();
        } catch (error) {
            console.error('Errore durante il salvataggio:', error);
            customToast.error('Errore durante il salvataggio del file');
        }
    };

    const isPathExpanded = (path: string) => {
        return expandedPaths.has(path);
    };

    const toggleCreateMenu = () => {
        setIsCreateMenuOpen(!isCreateMenuOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isCreateMenuOpen &&
                createMenuRef.current &&
                createButtonRef.current &&
                event.target instanceof Node &&
                !createMenuRef.current.contains(event.target) &&
                !createButtonRef.current.contains(event.target)) {
                setIsCreateMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isCreateMenuOpen]);

    const handleSelect = (path: string, selected: boolean, isMouseEvent: boolean = false) => {
        const normalizedPath = path === '/' ? '' : path;

        if (isMouseEvent) {
            if (isShiftPressed && lastSelectedFile) {
                // Trova gli indici dei file selezionati
                const allFiles = files.flatMap(f => [f, ...(f.children || [])]);
                const fileList = allFiles.map(f => f.path);
                const startIndex = fileList.indexOf(lastSelectedFile);
                const endIndex = fileList.indexOf(normalizedPath);

                if (startIndex !== -1 && endIndex !== -1) {
                    const start = Math.min(startIndex, endIndex);
                    const end = Math.max(startIndex, endIndex);
                    const filesToSelect = fileList.slice(start, end + 1);

                    setSelectedFiles(prev => {
                        const newSet = new Set(prev);
                        filesToSelect.forEach(filePath => {
                            const normalizedFilePath = filePath === '/' ? '' : filePath;
                            newSet.add(normalizedFilePath);
                        });
                        return newSet;
                    });
                }
            } else {
                setSelectedFiles(prev => {
                    const newSet = new Set(prev);
                    if (selected) {
                        newSet.add(normalizedPath);
                    } else {
                        newSet.delete(normalizedPath);
                    }
                    return newSet;
                });
                setLastSelectedFile(normalizedPath);
            }
        } else {
            setSelectedFiles(prev => {
                const newSet = new Set(prev);
                if (selected) {
                    newSet.add(normalizedPath);
                } else {
                    newSet.delete(normalizedPath);
                }
                return newSet;
            });
        }
    };

    const handleSelectAll = () => {
        const allPaths = new Set<string>();
        
        const addAllPaths = (items: FileData[]) => {
            items.forEach(item => {
                // Normalizziamo il percorso per gestire correttamente la home directory
                const normalizedPath = item.path === '/' ? '' : item.path;
                allPaths.add(normalizedPath);
                if (item.children) {
                    addAllPaths(item.children);
                }
            });
        };
        
        addAllPaths(files);
        setSelectedFiles(allPaths);
    };

    const handleDeselectAll = () => {
        setSelectedFiles(new Set());
    };

    const handleDeleteSelected = async () => {
        const selectedPaths = Array.from(selectedFiles).map(path => path || '/');  // Convertiamo stringa vuota in '/'
        if (selectedPaths.length === 0) return;

        const result = await Swal.fire({
            title: 'Sei sicuro?',
            text: `Stai per eliminare ${selectedPaths.length} file selezionati.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sì, elimina!',
            cancelButtonText: 'Annulla'
        });

        if (result.isConfirmed) {
            try {
                let hasErrors = false;
                for (const path of selectedPaths) {
                    try {
                        // Codifica il percorso del file per gestire caratteri speciali
                        const encodedPath = encodeURIComponent(path).replace(/%2F/g, '/');
                        await fileService.deleteFile(encodedPath);
                    } catch (error) {
                        console.error(`Errore durante l'eliminazione di ${path}:`, error);
                        hasErrors = true;
                    }
                }
                
                setSelectedFiles(new Set());
                await loadFiles();
                
                if (hasErrors) {
                    Swal.fire(
                        'Attenzione!',
                        'Alcuni file non sono stati eliminati correttamente.',
                        'warning'
                    );
                } else {
                    Swal.fire(
                        'Eliminati!',
                        'I file selezionati sono stati eliminati con successo.',
                        'success'
                    );
                }
                props.onStorageUpdate?.();
            } catch (error) {
                console.error('Errore durante l\'eliminazione:', error);
                Swal.fire(
                    'Errore!',
                    'Si è verificato un errore durante l\'eliminazione.',
                    'error'
                );
            }
        }
    };

    const handleDownloadSelected = async () => {
        const selectedPaths = Array.from(selectedFiles);
        if (selectedPaths.length === 0) return;

        try {
            if (selectedPaths.length === 1) {
                // Se è selezionato un solo elemento, usa la logica esistente
                const path = selectedPaths[0];
                const item = files.find(f => f.path === path) || files.flatMap(f => f.children || []).find(f => f.path === path);
                
                if (!item) {
                    customToast.error('Elemento non trovato');
                    return;
                }

                if (item.type === 'file') {
                    const response = await fileService.downloadFile(path);
                    const blob = new Blob([response.data], { type: 'text/plain' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', item.name);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                } else {
                    const encodedPath = encodeURIComponent(path).replace(/%2F/g, '/');
                    window.location.href = `http://localhost:3000/api/files/download/${encodedPath}`;
                }
            } else {
                // Per più elementi, usa JSZip per creare un archivio ZIP lato client
                const zip = new JSZip();
                
                // Aggiungi tutti i file selezionati al ZIP
                for (const path of selectedPaths) {
                    try {
                        const response = await fileService.downloadFile(path);
                        const fileName = path.split('/').pop() || path;
                        zip.file(fileName, response.data);
                    } catch (error) {
                        console.error(`Errore durante il download di ${path}:`, error);
                        customToast.error(`Errore durante il download di ${path}`);
                    }
                }

                // Genera e scarica il file ZIP
                const content = await zip.generateAsync({ 
                    type: 'blob',
                    compression: 'DEFLATE',
                    compressionOptions: {
                        level: 9
                    }
                });

                const url = window.URL.createObjectURL(content);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'selected_files.zip');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }
            customToast.success('Download completato con successo');
        } catch (error) {
            console.error('Errore durante il download:', error);
            customToast.error('Errore durante il download');
        }
    };

    const handleMoveToVault = async () => {
        try {
            const files = Array.from(selectedFiles);
            await Promise.all(files.map(file => fileService.moveToVault(file)));
            toast.success(`${files.length} file spostati nella cassaforte`);
            await loadFiles();
            setSelectedFiles(new Set());
        } catch (error) {
            console.error('Errore durante lo spostamento nella cassaforte', error);
            toast.error("Errore durante lo spostamento nella cassaforte, fare prima l'accesso");
        }
    };

    const handleDeleteAll = async () => {
        const result = await Swal.fire({
            title: 'Sei sicuro?',
            text: "Stai per eliminare tutti i file e le cartelle.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sì, elimina tutto!',
            cancelButtonText: 'Annulla'
        });

        if (result.isConfirmed) {
            try {
                await fileService.deleteAllFiles();
                setCurrentPath('/');
                await loadFiles();
                Swal.fire(
                    'Eliminati!',
                    'Tutti i file sono stati eliminati con successo.',
                    'success'
                );
                props.onStorageUpdate?.();
            } catch (error) {
                console.error('Errore durante l\'eliminazione:', error);
                Swal.fire(
                    'Errore!',
                    'Si è verificato un errore durante l\'eliminazione.',
                    'error'
                );
            }
        }
    };

    const handleMove = async () => {
        if (selectedFiles.size === 0) return;
        
        const { value: destinationPath } = await Swal.fire({
            title: 'Sposta file',
            input: 'text',
            inputLabel: 'Inserisci il percorso di destinazione',
            inputPlaceholder: '/cartella/destinazione',
            showCancelButton: true,
            cancelButtonText: 'Annulla',
            confirmButtonText: 'Sposta',
            inputValidator: (value) => {
                if (!value) {
                    return 'Devi inserire un percorso!';
                }
                // Verifica che non si stia tentando di spostare nella stessa cartella
                const normalizedCurrentPath = currentPath === '/' ? '' : currentPath;
                const normalizedDestPath = value.startsWith('/') ? value : `/${value}`;
                if (normalizedDestPath === normalizedCurrentPath) {
                    return 'Non puoi spostare nella cartella corrente!';
                }
                return null;
            }
        });

        if (destinationPath) {
            try {
                // Assicuriamoci che il percorso di destinazione inizi con /
                const normalizedPath = destinationPath.startsWith('/') ? destinationPath : `/${destinationPath}`;
                
                // Prepara i file da spostare
                const filesToMove = Array.from(selectedFiles).map(path => {
                    // Se il percorso è vuoto, significa che il file è nella home directory
                    return path === '' ? '/' : path;
                });

                // Chiamata API per spostare i file
                await fileService.moveFiles(filesToMove, normalizedPath);
                customToast.success('File spostati con successo');
                setSelectedFiles(new Set());
                await loadFiles();
                if (props.onStorageUpdate) props.onStorageUpdate();
            } catch (error) {
                console.error('Errore durante lo spostamento dei file:', error);
                customToast.error('Errore durante lo spostamento dei file');
            }
        }
    };

    // Aggiungi questo effetto per gestire gli eventi della tastiera
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setIsShiftPressed(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setIsShiftPressed(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    if (loading) {
        return <div className="text-center py-8">Caricamento...</div>;
    }

    return (
        <div className="flex flex-col min-h-screen">
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
            
            <div className="flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto p-6 mt-6 bg-white dark:bg-gray-800 shadow-xl rounded-xl mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex-1"></div>
                        <h1 className="text-3xl font-bold text-center flex-1 text-blue-500">FlowFiles</h1>
                        <div className="flex-1"></div>
                    </div>

                    <FileUploader 
                        onUpload={handleFileUpload} 
                        currentPath={currentPath}
                        onFolderUpload={loadFiles}
                        onStorageUpdate={props.onStorageUpdate}
                    />
                    
                    {selectedTextFile !== null ? (
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                    Editing: {selectedFilePath}
                                </h2>
                                <div className="space-x-2">
                                    <button
                                        onClick={() => handleSaveContent(selectedTextFile)}
                                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedTextFile(null);
                                            setSelectedFilePath(null);
                                        }}
                                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex-1"></div>
                                <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 flex-1 text-center">File Caricati</h2>
                                <div className="flex-1 text-right">
                                </div>
                            </div>

                            {/* Navigation and Current Path */}
                            <div className="mb-1 flex items-center justify-between space-x-4">
                                <div className="relative">
                                    <button
                                        ref={createButtonRef}
                                        onClick={toggleCreateMenu}
                                        className="flex items-center px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors cursor-pointer"
                                    >
                                        <span className="material-icons mr-2">menu</span>
                                        Menu
                                    </button>
                                    {isCreateMenuOpen && (
                                        <div ref={createMenuRef} className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-xl z-10">
                                            {/* Menu File */}
                                            <div className="group relative">
                                                <button className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-900 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900">
                                                    <span className="material-icons mr-2">folder</span>
                                                    File
                                                    <span className="material-icons ml-auto text-sm">chevron_right</span>
                                                </button>
                                                <div className="hidden group-hover:block absolute left-full top-0 w-48 bg-white dark:bg-gray-900 rounded-md shadow-xl">
                                                    <button
                                                        onClick={() => {
                                                            handleCreateFolder();
                                                            toggleCreateMenu();
                                                        }}
                                                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-500 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900"
                                                    >
                                                        <span className="material-icons mr-2">create_new_folder</span>
                                                        Nuova cartella
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleCreateFile();
                                                            toggleCreateMenu();
                                                        }}
                                                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900"
                                                    >
                                                        <span className="material-icons mr-2">note_add</span>
                                                        Nuovo file
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleDeleteAll();
                                                            toggleCreateMenu();
                                                        }}
                                                        className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                                                    >
                                                        <span className="material-icons mr-2">delete_forever</span>
                                                        Cestina tutti i file
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Menu Selezione */}
                                            <div className="group relative">
                                                <button className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-900 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900">
                                                    <span className="material-icons mr-2">select_all</span>
                                                    Selezione
                                                    <span className="material-icons ml-auto text-sm">chevron_right</span>
                                                </button>
                                                <div className="hidden group-hover:block absolute left-full top-0 w-48 bg-white dark:bg-gray-900 rounded-md shadow-xl">
                                                    <button
                                                        onClick={() => {
                                                            handleSelectAll();
                                                            toggleCreateMenu();
                                                        }}
                                                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900"
                                                    >
                                                        <span className="material-icons mr-2">select_all</span>
                                                        Seleziona tutti
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleDeselectAll();
                                                            toggleCreateMenu();
                                                        }}
                                                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900"
                                                    >
                                                        <span className="material-icons mr-2">deselect</span>
                                                        Deseleziona tutti
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Menu File Selezionati - visibile solo se ci sono file selezionati */}
                                            {selectedFiles.size > 0 && (
                                                <div className="group relative">
                                                    <button className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-900 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900">
                                                        <span className="material-icons mr-2">folder_special</span>
                                                        File Selezionati ({selectedFiles.size})
                                                        <span className="material-icons ml-auto text-sm">chevron_right</span>
                                                    </button>
                                                    <div className="hidden group-hover:block absolute left-full top-0 w-48 bg-white dark:bg-gray-900 rounded-md shadow-xl">
                                                        <button
                                                            onClick={() => {
                                                                handleDownloadSelected();
                                                                toggleCreateMenu();
                                                            }}
                                                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-900 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900"
                                                        >
                                                            <span className="material-icons mr-2">download</span>
                                                            Scarica
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleMoveToVault();
                                                                toggleCreateMenu();
                                                            }}
                                                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-900 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900"
                                                        >
                                                            <span className="material-icons mr-2">lock</span>
                                                            Sposta in Cassaforte
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleMove();
                                                                toggleCreateMenu();
                                                            }}
                                                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900"
                                                        >
                                                            <span className="material-icons mr-2">drive_file_move</span>
                                                            Sposta in...
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleDeleteSelected();
                                                                toggleCreateMenu();
                                                            }}
                                                            className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                                                        >
                                                            <span className="material-icons mr-2">delete</span>
                                                            Cestina i selezionati
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        setCurrentPath('/');
                                        handleFolderClick('/');
                                    }}
                                    className="flex items-center px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors cursor-pointer"
                                >
                                    <span className="material-icons mr-2">home</span>
                                    Home Directory
                                </button>

                                <div className="flex-1 px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 flex items-center">
                                    <span className="material-icons mr-2">folder_open</span>
                                    Percorso corrente: {currentPath === '/' ? 'Home Directory' : currentPath}
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden shadow">
                                <table className="w-full table-auto">
                                    <thead className="bg-gray-100 dark:bg-gray-800">
                                        <tr>
                                            <th className="p-2 text-left text-gray-600 dark:text-gray-300">Nome</th>
                                            <th className="p-2 text-left text-gray-600 dark:text-gray-300">Dimensione</th>
                                            <th className="p-2 text-left text-gray-600 dark:text-gray-300">Caricato</th>
                                            <th className="p-3 text-center text-gray-600 dark:text-gray-300">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                        {files.map((item, index) => (
                                            <FileItemWithExpand
                                                key={item.path + index}
                                                item={item}
                                                onDelete={handleFileDelete}
                                                onRename={handleFileRename}
                                                onFolderClick={handleFolderClick}
                                                onUpload={handleFileUpload}
                                                level={0}
                                                expanded={isPathExpanded(item.path)}
                                                onToggle={(path) => handleTogglePath(path)}
                                                onDoubleClick={handleFileDoubleClick}
                                                isPathExpanded={isPathExpanded}
                                                isSelected={selectedFiles.has(item.path)}
                                                onSelect={handleSelect}
                                                selectedFiles={selectedFiles}
                                                onStorageUpdate={props.onStorageUpdate}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                                {files.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        Nessun file caricato
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <footer className="text-center py-4 bg-gray-100 dark:bg-gray-900">
                <p className="text-gray-500 dark:text-gray-400">© {new Date().getFullYear()} Alessio Abrugiati | Powered by Caffeine and Code</p>
                <a className="justify-center text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400" rel="stylesheet" href="https://www.alexis82.it" target="_blank">www.alexis82.it</a>
            </footer>
        </div>
    );
});

export default FileBrowser; 