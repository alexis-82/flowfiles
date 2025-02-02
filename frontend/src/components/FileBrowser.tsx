/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
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
    'java', 'cpp', 'c', 'h', 'hpp', 'sql', 'env', 'gitignore'
];

const FileUploader: React.FC<FileUploaderProps> = ({ onUpload, currentPath, onFolderUpload, onStorageUpdate }) => {
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleFiles = async (files: File[]) => {
        for (const file of files) {
            try {
                await onUpload(file, currentPath);
            } catch (error) {
                console.error('Errore durante il caricamento:', error);
            }
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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
                    
                    const promises = entries.map(entry => {
                        return new Promise<void>((resolveEntry) => {
                            if (entry.isDirectory) {
                                processDirectory(entry, joinPaths(basePath, entry.name), filesToUpload)
                                    .then(resolveEntry)
                                    .catch(reject);
                            } else if (entry.isFile) {
                                entry.file((file: File) => {
                                    // Creiamo un nuovo File object con il percorso corretto
                                    const fullPath = entry.fullPath.substring(1); // Rimuove lo slash iniziale
                                    const newFile = new File([file], file.name, {
                                        type: file.type,
                                        lastModified: file.lastModified
                                    });
                                    // Aggiungiamo una proprietà custom per il percorso
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
        const filesToUpload: File[] = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i].webkitGetAsEntry();
            if (item && item.isDirectory) {
                try {
                    await processDirectory(item, currentPath, filesToUpload);
                } catch (error) {
                    console.error('handleFolderDrop: error processing directory', error);
                    customToast.error('Errore durante il caricamento della cartella');
                    return;
                }
            } else if (item && item.isFile) {
                const file = event.dataTransfer.files[i];
                if (file) {
                    filesToUpload.push(file);
                }
            }
        }

        if (filesToUpload.length > 0) {
            const zip = new JSZip();
            const firstFilePath = filesToUpload[0].webkitRelativePath;
            const folderName = firstFilePath.split('/')[0];

            filesToUpload.forEach(file => {
                const relativePath = file.webkitRelativePath.substring(folderName.length + 1);
                zip.file(relativePath, file);
            });

            try {
                const content = await zip.generateAsync({ 
                    type: 'blob',
                    compression: 'DEFLATE',
                    compressionOptions: {
                        level: 9
                    }
                });

                if (content.size === 0) {
                    console.error('Generated zip is empty');
                    customToast.error('Errore: il file zip generato è vuoto');
                    return;
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
                    customToast.success('Cartella caricata con successo');
                } else {
                    const errorData = await response.json();
                    customToast.error(`Errore durante il caricamento della cartella: ${errorData.error}`);
                }
            } catch (error) {
                console.error('handleFolderDrop: error during zip or upload', error);
                customToast.error('Errore durante il caricamento della cartella');
            }
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
                Trascina e rilascia una cartella qui o <span className="text-blue-600">clicca</span> per selezionare i file
            </p>
            <p className="text-gray-500 text-sm mt-2">
                {currentPath === '/' ? 'Carica nella cartella principale' : `Carica in: ${currentPath}`}
            </p>
        </div>
    );
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
};

interface FileItemProps {
    item: FileData;
    onDelete: (path: string) => Promise<void>;
    onRename: (oldPath: string, newPath: string) => Promise<void>;
    onFolderClick: (path: string) => void;
    onUpload: (file: globalThis.File, targetPath: string) => Promise<void>;
    level: number;
    expanded: boolean;
    onToggle: () => void;
    onDoubleClick: (item: FileData) => void;
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
    onDoubleClick
}) => {
    const indentation = level * 24;
    const [dragOver, setDragOver] = useState(false);

    const isEditable = () => {
        const extension = item.name.split('.').pop()?.toLowerCase() || '';
        return EDITABLE_EXTENSIONS.includes(extension);
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
                    await onUpload(files[0], item.path);
                } catch (error) {
                    console.error('Errore durante il caricamento:', error);
                }
            }
        }
    };

    return (
        <>
            <tr
                className={`border-b last:border-b-0 hover:bg-gray-100 transition-colors ${dragOver ? 'bg-blue-50' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <td className="p-3 flex items-center" style={{ paddingLeft: `${indentation + 12}px` }}>
                    {item.type === 'folder' ? (
                        <div className="flex items-center">
                            <button
                                onClick={onToggle}
                                className="mr-2 focus:outline-none"
                            >
                                <span className="material-icons text-gray-500 text-sm transform transition-transform">
                                    {expanded ? 'expand_more' : 'chevron_right'}
                                </span>
                            </button>
                            <button
                                onClick={() => onFolderClick(item.path)}
                                className="flex items-center hover:text-blue-600"
                            >
                                <span className="material-icons text-yellow-500">folder</span>
                                <span className="ml-3 text-gray-800">{item.name}</span>
                            </button>
                        </div>
                    ) : (
                        <div
                            className={`flex items-center ${isEditable() ? 'cursor-pointer hover:text-blue-600' : ''}`}
                            onDoubleClick={() => onDoubleClick(item)}
                            title={isEditable() ? 'Doppio click per modificare' : undefined}
                        >
                            <FileIcon filename={item.name} />
                            <span className="ml-3 text-gray-800">{item.name}</span>
                        </div>
                    )}
                </td>
                <td className="p-2 text-gray-600">{item.size}</td>
                <td className="p-2 text-gray-600">{formatDate(item.date)}</td>
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
                            className="text-yellow-500 hover:text-yellow-700 hover:bg-yellow-50 rounded-full transition-colors"
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
                                            // Per le cartelle, scarica direttamente come zip
                                            window.location.href = `http://localhost:3000/api/files/download/${item.path}`;
                                        }
                                    } catch (error) {
                                        console.error('Errore durante il download:', error);
                                        customToast.error('Errore durante il download');
                                    }
                                }}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                                title={item.type === 'folder' ? "Scarica cartella come ZIP" : "Scarica file"}
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={() => onDelete(item.path)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
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
                    item={child}
                    onDelete={props.onDelete}
                    onRename={props.onRename}
                    onFolderClick={props.onFolderClick}
                    onUpload={props.onUpload}
                    level={props.level + 1}
                    expanded={Boolean(props.expanded && props.item.children?.some(c => c.path === child.path))}
                    onToggle={() => props.onToggle()}
                    onDoubleClick={props.onDoubleClick}
                />
            ))}
        </>
    );
};

const FileBrowser = forwardRef<FileBrowserHandle, FileBrowserProps>((props, ref) => {
    const navigate = useNavigate();
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState('/');
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [selectedTextFile, setSelectedTextFile] = useState<string | null>(null);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

    const loadFiles = async (_currentPath?: string) => {
        try {
            const fileList = await fileService.getAllFiles('/');
            setFiles(fileList);
            
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
            text: "Non potrai recuperare questo elemento una volta eliminato!",
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

                if (result.shouldNavigateHome) {
                    setCurrentPath('/');
                    handleFolderClick('/');
                }

                await loadFiles();
                Swal.fire(
                    'Eliminato!',
                    'L\'elemento è stato eliminato con successo.',
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
                'L\'elemento è stato rinominato con successo.',
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
    };

    const handleTogglePath = (path: string) => {
        setExpandedPaths(prev => {
            const newSet = new Set(prev);
            if (newSet.has(path)) {
                // Quando chiudiamo una cartella, rimuoviamo solo quella cartella
                newSet.delete(path);
            } else {
                // Quando espandiamo una cartella, aggiungiamo solo quella cartella
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
                await fileService.createFolder(folderName);
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

    const handleFileDoubleClick = async (item: FileData) => {
        const extension = item.name.split('.').pop()?.toLowerCase() || '';
        if (EDITABLE_EXTENSIONS.includes(extension)) {
            try {
                const response = await fileService.downloadFile(item.path);
                let content = '';

                // Per i file di testo, usa direttamente il contenuto della risposta
                content = response.data;

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


    if (loading) {
        return <div className="text-center py-8">Caricamento...</div>;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto p-6 mt-6 bg-white shadow-xl rounded-xl mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex-1"></div>
                        <h1 className="text-3xl font-bold text-center flex-1" style={{ color: '#209CEE' }}>FlowFiles</h1>
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
                                <h2 className="text-lg font-semibold">
                                    Editing: {selectedFilePath}
                                </h2>
                                <div className="space-x-2">
                                    <button
                                        onClick={() => handleSaveContent(selectedTextFile)}
                                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedTextFile(null);
                                            setSelectedFilePath(null);
                                        }}
                                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
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
                                <h2 className="text-2xl font-semibold text-gray-700 flex-1 text-center">File Caricati</h2>
                                <div className="flex-1 text-right">
                                </div>
                            </div>

                            {/* Navigation and Current Path */}
                            <div className="mb-1 flex items-center justify-between space-x-4">
                                <button
                                    onClick={() => {
                                        setCurrentPath('/');
                                        handleFolderClick('/');
                                    }}
                                    className="flex items-center px-3 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <span className="material-icons mr-2">home</span>
                                    Home Directory
                                </button>

                                <button
                                    onClick={handleCreateFolder}
                                    className="flex items-center px-3 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <span className="material-icons mr-2">create_new_folder</span>
                                    Nuova Cartella
                                </button>

                                <div className="flex-1 px-2 py-1 bg-gray-50 rounded-lg text-gray-600 flex items-center">
                                    <span className="material-icons mr-2">folder_open</span>
                                    Percorso corrente: {currentPath === '/' ? 'Home Directory' : currentPath}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg overflow-hidden shadow">
                                <table className="w-full table-auto">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2 text-left text-gray-600">Nome</th>
                                            <th className="p-2 text-left text-gray-600">Dimensione</th>
                                            <th className="p-2 text-left text-gray-600">Data</th>
                                            <th className="p-3 text-center text-gray-600">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
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
                                                onToggle={() => handleTogglePath(item.path)}
                                                onDoubleClick={handleFileDoubleClick}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                                {files.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        Nessun file caricato
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <footer className="text-center py-4 bg-gray-100">
                <p className="text-gray-500">2024 Alessio Abrugiati | Powered by Caffeine and Code</p>
            </footer>
        </div>
    );
});

export default FileBrowser; 