/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fileService } from '../services/fileService';
import toast from 'react-hot-toast';
import Quill from 'quill';
import MonacoEditor, { OnChange } from '@monaco-editor/react';
import 'quill/dist/quill.snow.css';

interface LocationState {
    content: string;
    filePath: string;
    isVaultFile?: boolean;
    returnToVault?: boolean;
}

// Configurazione dei font con i loro stili
const fontStyles = `
    .ql-font-sans-serif { font-family: sans-serif; }
    .ql-font-serif { font-family: serif; }
    .ql-font-monospace { font-family: monospace; }

    /* Stili per la toolbar di Quill in modalità dark */
    .dark .ql-toolbar {
        background-color: #374151 !important;
        border-color: #4B5563 !important;
    }
    
    .dark .ql-toolbar .ql-stroke {
        stroke: #D1D5DB !important;
    }
    
    .dark .ql-toolbar .ql-fill {
        fill: #D1D5DB !important;
    }
    
    .dark .ql-toolbar .ql-picker {
        color: #D1D5DB !important;
    }
    
    .dark .ql-toolbar .ql-picker-options {
        background-color: #374151 !important;
        border-color: #4B5563 !important;
    }
    
    .dark .ql-toolbar button:hover .ql-stroke,
    .dark .ql-toolbar button.ql-active .ql-stroke {
        stroke: #60A5FA !important;
    }
    
    .dark .ql-toolbar button:hover .ql-fill,
    .dark .ql-toolbar button.ql-active .ql-fill {
        fill: #60A5FA !important;
    }
    
    .dark .ql-toolbar .ql-picker-label:hover,
    .dark .ql-toolbar .ql-picker-item:hover,
    .dark .ql-toolbar .ql-picker-label.ql-active,
    .dark .ql-toolbar .ql-picker-item.ql-selected {
        color: #60A5FA !important;
    }
    
    /* Stili per l'editor in modalità dark */
    .dark .ql-container {
        border-color: #4B5563 !important;
    }
    
    .dark .ql-editor {
        color: #D1D5DB !important;
    }

    /* Stili per il contenitore dell'editor */
    .editor-container {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 250px) !important;
        min-height: 300px;
        overflow: hidden;
    }

    .editor-container .ql-container {
        flex: 1;
        overflow: auto;
    }

    .editor-container .ql-toolbar {
        border-top-left-radius: 0.375rem;
        border-top-right-radius: 0.375rem;
        position: sticky;
        top: 0;
        z-index: 10;
        background-color: white;
        display: none; /* Nascondi la toolbar di default */
    }

    .editor-container.quill-mode .ql-toolbar {
        display: block; /* Mostra la toolbar solo in modalità Quill */
    }

    .dark .editor-container .ql-toolbar {
        background-color: #374151;
    }
`;

// File extensions that should use Monaco Editor
const codeFileExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'php', 'py', 'java',
    'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'swift', 'kt', 'sql', 'sh',
    'yaml', 'yml', 'xml', 'md', 'rb', 'pl', 'lua', 'mjs', 'mts', 'mjsx', 'mtsx'
];

const Editor: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [content, setContent] = useState('');
    const [filePath, setFilePath] = useState('');
    const [isVaultFile, setIsVaultFile] = useState(false);
    const [isCodeFile, setIsCodeFile] = useState(false);
    const [language, setLanguage] = useState('plaintext');
    const quillRef = useRef<Quill>();
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    // Aggiungi questo useEffect per gestire il warning
    useEffect(() => {
        
        // Sovrascrivi il metodo addEventListener nativo
        const originalAddEventListener = Element.prototype.addEventListener;
        const originalRemoveEventListener = Element.prototype.removeEventListener;

        Element.prototype.addEventListener = function (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
            if (type === 'DOMNodeInserted') {
                // Non registrare l'evento DOMNodeInserted
                return;
            }
            return originalAddEventListener.call(this, type, listener, options);
        };

        Element.prototype.removeEventListener = function (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) {
            if (type === 'DOMNodeInserted') {
                // Non rimuovere l'evento DOMNodeInserted
                return;
            }
            return originalRemoveEventListener.call(this, type, listener, options);
        };

        // Sovrascrivi anche console.warn per maggiore sicurezza
        const originalWarn = console.warn;
        console.warn = (...args: any[]) => {
            if (typeof args[0] === 'string' && (
                args[0].includes('DOMNodeInserted') ||
                args[0].includes('mutation event') ||
                args[0].includes('Support for this event type has been removed')
            )) {
                return;
            }
            originalWarn.apply(console, args);
        };

        return () => {
            // Ripristina i metodi originali
            Element.prototype.addEventListener = originalAddEventListener;
            Element.prototype.removeEventListener = originalRemoveEventListener;
            console.warn = originalWarn;
        };
    }, []);

    // Configurazione memoizzata dei moduli Quill
    const quillModules = useMemo(() => ({
        toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'script': 'sub' }, { 'script': 'super' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            [{ 'direction': 'rtl' }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'font': [] }],
            [{ 'align': [] }],
            ['clean'],
            ['code-block']
        ],
        clipboard: {
            matchVisual: false,
            matchers: []
        },
        keyboard: {
            bindings: {
                tab: {
                    key: 9,
                    handler: function () {
                        return true;
                    }
                }
            }
        },
        history: {
            delay: 1000,
            maxStack: 50,
            userOnly: true
        }
    }), []);

    // Configurazione memoizzata per Monaco
    const monacoOptions = useMemo(() => ({
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on' as const,
        automaticLayout: true,
    }), []);

    // Inizializzazione di Quill
    useEffect(() => {
        if (editorRef.current && !quillRef.current && !isCodeFile) {
            quillRef.current = new Quill(editorRef.current, {
                modules: quillModules,
                theme: 'snow',
                placeholder: 'Scrivi qualcosa...'
            });

            quillRef.current.on('text-change', () => {
                const value = quillRef.current?.root.innerHTML || '';
                setContent(value);
            });

            // Imposta il contenuto iniziale
            if (content) {
                quillRef.current.root.innerHTML = content;
            }
        }
    }, [quillModules, isCodeFile, content]);

    // Aggiorna il contenuto quando cambia
    useEffect(() => {
        if (quillRef.current && content && !isCodeFile) {
            const currentContent = quillRef.current.root.innerHTML;
            if (currentContent !== content) {
                quillRef.current.root.innerHTML = content;
            }
        }
    }, [content, isCodeFile]);

    // Memoize the onChange handler for better performance
    const handleEditorChange = useCallback<OnChange>((value) => {
        if (value !== undefined) {
            setContent(value);
        }
    }, []);

    useEffect(() => {
        const state = location.state as LocationState;
        if (state?.content !== undefined && state?.filePath) {
            // Preserva le tabulazioni nel contenuto iniziale
            const formattedContent = state.content
                .replace(/\t/g, '    ')  // Converte tab in 4 spazi per la visualizzazione
                .replace(/\n/g, '\\n')   // Preserva i newline
                .replace(/\\n/g, '\n');  // Ripristina i newline per la visualizzazione

            setContent(formattedContent);
            setFilePath(state.filePath);
            setIsVaultFile(state.isVaultFile || false);

            // Determine if it's a code file and set the language
            const extension = state.filePath.split('.').pop()?.toLowerCase() || '';
            const isCode = codeFileExtensions.includes(extension);
            setIsCodeFile(isCode);

            // Set Monaco language based on file extension
            if (isCode) {
                switch (extension) {
                    case 'js':
                    case 'mjs':
                    case 'jsx':
                        setLanguage('javascript');
                        break;
                    case 'ts':
                    case 'tsx':
                        setLanguage('typescript');
                        break;
                    case 'html':
                        setLanguage('html');
                        break;
                    case 'css':
                        setLanguage('css');
                        break;
                    case 'json':
                        setLanguage('json');
                        break;
                    case 'py':
                        setLanguage('python');
                        break;
                    case 'java':
                        setLanguage('java');
                        break;
                    case 'php':
                        setLanguage('php');
                        break;
                    case 'cpp':
                        setLanguage('cpp');
                        break;
                    case 'yaml':
                    case 'yml':
                        setLanguage('yaml');
                        break;
                    case 'xml':
                        setLanguage('xml');
                        break;
                    case 'md':
                        setLanguage('markdown');
                        break;
                    case 'rb':
                        setLanguage('ruby');
                        break;
                    case 'pl':
                        setLanguage('perl');
                        break;
                    case 'lua':
                        setLanguage('lua');
                        break;
                    case 'sh':
                        setLanguage('bash');
                        break;
                    case 'sql':
                        setLanguage('sql');
                        break;
                    case 'swift':
                        setLanguage('swift');
                        break;
                    case 'kt':
                        setLanguage('kotlin');
                        break;
                    case 'rs':
                        setLanguage('rust');
                        break;
                    case 'go':
                        setLanguage('go');
                        break;
                    case 'cs':
                        setLanguage('csharp');
                        break;
                    default:
                        setLanguage(extension);
                }
            }
        } else {
            navigate('/');
            toast.error('Nessun file da modificare');
        }
    }, [location, navigate]);

    // Aggiungi stili CSS per i font
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = fontStyles;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Handler personalizzato per il salvataggio che preserva l'indentazione
    const handleSave = async () => {
        try {
            let contentToSave = content;
            if (!isCodeFile && quillRef.current) {
                // Ottieni il contenuto direttamente da Quill
                contentToSave = quillRef.current.root.innerHTML;

                // Converti il contenuto HTML in testo puro se necessario
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = contentToSave;
                contentToSave = tempDiv.innerText;

                // Ripristina le tabulazioni
                contentToSave = contentToSave
                    .replace(/\\n/g, '\n')
                    .replace(/\u00A0/g, ' ')  // Sostituisce gli spazi non interrompibili con spazi normali
                    .replace(/\s{4}/g, '\t'); // Converte 4 spazi in tab
            }

            if (contentToSave.trim() === '') {
                toast.error('Il contenuto non può essere vuoto');
                return;
            }

            await fileService.saveFile(filePath, contentToSave);
            toast.success('File salvato con successo');
        } catch (error) {
            console.error('Errore durante il salvataggio:', error);
            toast.error('Errore durante il salvataggio del file');
        }
    };

    const handleClose = () => {
        if (isVaultFile) {
            navigate('/', {
                state: {
                    returnToVault: true
                }
            });
        } else {
            navigate('/');
        }
    };

    return (
        <div className="flex flex-col h-screen">
            <div className="flex flex-1">
                <div className="flex-1 flex flex-col">
                    <div className="flex-1">
                        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-4">
                            <div className="max-w-4xl mx-auto px-6">
                                <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                                            Modifica: {filePath.split('/').pop()}
                                        </h2>
                                        <div className="space-x-2">
                                            <button
                                                onClick={handleSave}
                                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
                                            >
                                                Salva
                                            </button>
                                            <button
                                                onClick={handleClose}
                                                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                Chiudi
                                            </button>
                                        </div>
                                    </div>

                                    <div ref={editorContainerRef} className={`editor-container ${!isCodeFile ? 'quill-mode' : ''}`}>
                                        {isCodeFile ? (
                                            <MonacoEditor
                                                height="100%"
                                                language={language}
                                                value={content}
                                                onChange={handleEditorChange}
                                                theme="vs-dark"
                                                options={monacoOptions}
                                            />
                                        ) : (
                                            <div ref={editorRef} className="h-full" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Editor;