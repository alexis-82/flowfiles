/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { FileIcon, TrashIcon, DiskUploadIcon, DownloadIcon, RenameIcon } from './Icons';
import { fileService } from '../services/fileService';
import toast from 'react-hot-toast';

interface FileData {
    name: string;
    size: string;
    date: string;
}

const FileUploader: React.FC<{ onUpload: (file: globalThis.File) => Promise<void> }> = ({ onUpload }) => {
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
                await onUpload(files[0]);
                // Reset del valore dell'input file dopo l'upload
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
                await onUpload(files[0]);
                // Reset del valore dell'input file dopo l'upload
                e.target.value = '';
            } catch (error) {
                console.error('Errore durante il caricamento:', error);
            }
        }
    };

    const handleBrowseClick = () => {
        // Reset del valore dell'input file prima di aprire il selettore
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
                Trascina e rilascia i file qui o <span className="text-blue-600">clicca</span>
            </p>
            <p className="text-gray-500 text-sm mt-2">
                Supporta file PDF, immagini e documenti
            </p>
        </div>
    );
};

// FUNZIONE PER FORMATTARRE LA DATA
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
};

const FileBrowser: React.FC = () => {
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);
    const [updateTrigger, setUpdateTrigger] = useState(0);

    const loadFiles = async () => {
        try {
            const fileList = await fileService.getAllFiles();
            setFiles(fileList);
        } catch (error) {
            toast.error('Errore durante il caricamento dei file');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFiles();
    }, [updateTrigger]);

    const handleFileUpload = async (file: globalThis.File) => {
        try {
            await fileService.uploadFile(file);
            setUpdateTrigger(prev => prev + 1);
            toast.success('File caricato con successo');
        } catch (error) {
            console.error('Errore durante il caricamento:', error);
            toast.error('Errore durante il caricamento del file');
        }
    };

    const handleFileDelete = async (fileName: string) => {
        try {
            await fileService.deleteFile(fileName);
            // Reset del valore dell'input file dopo l'eliminazione
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) {
                fileInput.value = '';
            }
            setUpdateTrigger(prev => prev + 1);
            toast.success('File eliminato con successo');
        } catch (error) {
            toast.error('Errore durante l\'eliminazione del file');
        }
    };

    const handleFileRename = async (oldName: string, newName: string) => {
        try {
            // Ottieni l'estensione dal vecchio nome del file
            const extension = oldName.split('.').pop();
            // Assicurati che il nuovo nome abbia la stessa estensione
            const newNameWithExt = newName.includes('.') ? newName : `${newName}.${extension}`;
            
            await fileService.renameFile(oldName, newNameWithExt);
            setUpdateTrigger(prev => prev + 1);
            toast.success('File rinominato con successo');
        } catch (error) {
            console.error('Errore durante la rinomina del file:', error);
            toast.error('Errore durante la rinomina del file');
        }
    };

    const handleDeleteAll = async () => {
        if (window.confirm('Sei sicuro di voler eliminare tutti i file?')) {
            try {
                await fileService.deleteAllFiles();
                setUpdateTrigger(prev => prev + 1);
                toast.success('Tutti i file sono stati eliminati');
            } catch (error) {
                toast.error('Errore durante l\'eliminazione dei file');
            }
        }
    };

    useEffect(() => {
        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault(); // Blocca il menu contestuale
        };

        // Aggiungi l'evento al documento
        document.addEventListener('contextmenu', handleContextMenu);

        // Rimuovi l'evento al momento della pulizia
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    if (loading) {
        return <div className="text-center py-8">Caricamento...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white shadow-xl rounded-xl">
            <div className="flex justify-between items-center mb-6">
                <div className="flex-1"></div>
                <h1 className="text-3xl font-bold text-center flex-1" style={{ color: '#209CEE' }}>FlowFiles</h1>
                <div className="flex-1 text-right">
                    <button
                        onClick={handleDeleteAll}
                        className="text-red-500 hover:text-red-700 font-medium"
                    >
                        Elimina tutto
                    </button>
                </div>
            </div>
            <FileUploader onUpload={handleFileUpload} />
            <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex-1"></div>
                    <h2 className="text-2xl font-semibold text-gray-700 flex-1 text-center">File Caricati</h2>
                    <div className="flex-1 text-right">
                    </div>
                </div>
                <div className="bg-gray-50 rounded-lg overflow-hidden shadow">
                    <table className="w-full table-auto">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 text-left text-gray-600">Nome</th>
                                <th className="p-3 text-left text-gray-600">Dimensione</th>
                                <th className="p-3 text-left text-gray-600">Data</th>
                                <th className="p-3 text-center text-gray-600">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map((file, index) => (
                                <tr key={index} className="border-b last:border-b-0 hover:bg-gray-100 transition-colors">
                                    <td className="p-3 flex items-center">
                                        <FileIcon filename={file.name} />
                                        <span className="ml-3 text-gray-800">{file.name}</span>
                                    </td>
                                    <td className="p-3 text-gray-600">{file.size}</td>
                                    <td className="p-3 text-gray-600">{formatDate(file.date)}</td>
                                    <td className="p-3 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button 
                                                onClick={() => {
                                                    const extension = file.name.split('.').pop() || '';
                                                    const currentName = file.name.slice(0, -(extension.length + 1));
                                                    const newName = prompt('Inserisci il nuovo nome del file:', currentName);
                                                    if (newName && newName !== currentName) {
                                                        handleFileRename(file.name, `${newName}.${extension}`);
                                                    }
                                                }}
                                                className="text-yellow-500 hover:text-yellow-700 hover:bg-yellow-50 rounded-full transition-colors"
                                                title="Rinomina file"
                                            >
                                                <RenameIcon className="w-5 h-5" />
                                            </button>
                                            <a 
                                                href={`http://localhost:3000/api/files/download/${file.name}`} 
                                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                                                title="Scarica file"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <DownloadIcon className="w-5 h-5" />
                                            </a>
                                            <button 
                                                onClick={() => handleFileDelete(file.name)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                                                title="Elimina file"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
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
};

export default FileBrowser; 