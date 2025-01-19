/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FileIcon, TrashIcon, DiskUploadIcon, DownloadIcon, RenameIcon } from './Icons';
import { fileService } from '../services/fileService';
import toast from 'react-hot-toast';

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
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUpload, currentPath }) => {
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            try {
                await onUpload(files[0], currentPath);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } catch (error) {
                console.error('Errore durante il caricamento:', error);
            }
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            try {
                await onUpload(files[0], currentPath);
                e.target.value = '';
            } catch (error) {
                console.error('Errore durante il caricamento:', error);
            }
        }
    };

    const handleBrowseClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        fileInputRef.current?.click();
    };

    return (
        <div
            className={`file-uploader rounded-xl p-12 text-center cursor-pointer flex flex-col items-center justify-center min-h-[300px] ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
            />
            <DiskUploadIcon size={64} />
            <p className="text-gray-800 mt-6 text-lg font-semibold">
                Trascina e rilascia il file qui o <span className="text-blue-600">clicca</span>
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
}

const FileItem: React.FC<FileItemProps> = ({ 
    item, 
    onDelete, 
    onRename, 
    onFolderClick,
    onUpload,
    level,
    expanded,
    onToggle
}) => {
    const indentation = level * 24;
    const [dragOver, setDragOver] = useState(false);

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
                        <div className="flex items-center">
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
                        {item.type === 'file' && (
                            <a 
                                href={`http://localhost:3000/api/files/download/${item.path}`}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                                title="Scarica file"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </a>
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
            {expanded && item.children && item.children.map((child, index) => (
                <FileItemWithExpand
                    key={child.path + index}
                    item={child}
                    onDelete={onDelete}
                    onRename={onRename}
                    onFolderClick={onFolderClick}
                    onUpload={onUpload}
                    level={level + 1} expanded={false} onToggle={function (): void {
                        throw new Error('Funzione non implementata');
                    } }                />
            ))}
        </>
    );
};

const FileItemWithExpand: React.FC<FileItemProps> = (props) => {
    return <FileItem {...props} />;
};

const FileBrowser = forwardRef<FileBrowserHandle, FileBrowserProps>((props, ref) => {
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState('/');
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

    const loadFiles = async (_currentPath?: string) => {
        try {
            const fileList = await fileService.getAllFiles('/');
            setFiles(fileList);
        } catch (error) {
            toast.error('Errore durante il caricamento dei file');
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
    }, []);

    const handleFileUpload = async (file: globalThis.File, targetPath: string) => {
        try {
            await fileService.uploadFile(file, targetPath);
            // Espandi il percorso della cartella di destinazione
            setExpandedPaths(prev => {
                const newSet = new Set(prev);
                newSet.add(targetPath);
                return newSet;
            });
            await loadFiles();
            toast.success(`File "${file.name}" caricato con successo in "${targetPath}"`);
            props.onStorageUpdate?.();
        } catch (error) {
            if (error instanceof Error && error.message === 'Storage limit exceeded') {
                toast.error('Spazio di archiviazione esaurito. Elimina alcuni file prima di caricare nuovi contenuti.');
            } else {
                toast.error('Errore durante il caricamento del file');
            }
            console.error('Errore durante il caricamento:', error);
        }
    };

    const handleFileDelete = async (path: string) => {
        if (window.confirm('Sei sicuro di voler eliminare questo file?')) {
            try {
                const result = await fileService.deleteFile(path);
                console.log('Risultato eliminazione:', result); // Per debug

                if (result.shouldNavigateHome) {
                    console.log('Cartella eliminata, navigando alla home...'); // Per debug
                    setCurrentPath('/');
                    handleFolderClick('/');
                }
                
                await loadFiles();
                toast.success('Elemento eliminato con successo');
                props.onStorageUpdate?.();
            } catch (error) {
                console.error('Errore durante l\'eliminazione:', error);
                toast.error('Errore durante l\'eliminazione');
            }
        }
    };

    const handleFileRename = async (oldPath: string, newPath: string) => {
        try {
            await fileService.renameFile(oldPath, newPath);
            await loadFiles();
            toast.success('Elemento rinominato con successo');
        } catch (error) {
            console.error('Errore durante la rinomina:', error);
            toast.error('Errore durante la rinomina');
        }
    };

    const handleFolderClick = async (path: string) => {
        setCurrentPath(path);
    };

    const handleTogglePath = (path: string) => {
        setExpandedPaths(prev => {
            const newSet = new Set(prev);
            if (newSet.has(path)) {
                newSet.delete(path);
            } else {
                newSet.add(path);
            }
            return newSet;
        });
    };

    useEffect(() => {
        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();
        };

        document.addEventListener('contextmenu', handleContextMenu);
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    const handleCreateFolder = async () => {
        const folderName = prompt('Inserisci il nome della nuova cartella:');
        if (folderName) {
            try {
                await fileService.createFolder(folderName);
                await loadFiles();
                toast.success('Cartella creata con successo');
            } catch (error) {
                toast.error('Errore durante la creazione della cartella');
            }
        }
    };

    if (loading) {
        return <div className="text-center py-8">Caricamento...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white shadow-xl rounded-xl">
            <div className="flex justify-between items-center mb-6">
                <div className="flex-1"></div>
                <h1 className="text-3xl font-bold text-center flex-1" style={{ color: '#209CEE' }}>FlowFiles</h1>
                <div className="flex-1"></div>
            </div>

            <FileUploader onUpload={handleFileUpload} currentPath={currentPath} />
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
                                    expanded={expandedPaths.has(item.path)}
                                    onToggle={() => handleTogglePath(item.path)}
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
        </div>
    );
});

export default FileBrowser; 