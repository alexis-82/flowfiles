import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fileService } from '../services/fileService';
import toast from 'react-hot-toast';

interface LocationState {
    content: string;
    filePath: string;
}

// Configurazione dei font con i loro stili
const fontStyles = `
    .ql-font-sans-serif { font-family: sans-serif; }
    .ql-font-serif { font-family: serif; }
    .ql-font-monospace { font-family: monospace; }
`;

const Editor: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [content, setContent] = useState('');
    const [filePath, setFilePath] = useState('');

    useEffect(() => {
        const state = location.state as LocationState;
        if (state?.content !== undefined && state?.filePath) {
            setContent(state.content);
            setFilePath(state.filePath);
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

    const handleSave = async () => {
        try {
            await fileService.saveFile(filePath, content);
            toast.success('File salvato con successo');
        } catch (error) {
            console.error('Errore durante il salvataggio:', error);
            toast.error('Errore durante il salvataggio del file');
        }
    };

    // const modules = {
    //     toolbar: false,
    //     keyboard: {
    //         bindings: {
    //             tab: {
    //                 key: 9,
    //                 handler: function() {
    //                     return true;
    //                 }
    //             }
    //         }
    //     }
    // };

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto">
                        <div className="min-h-screen bg-gray-100">
                            <div className="max-w-4xl mx-auto p-6">
                                <div className="bg-white shadow-xl rounded-xl p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-semibold text-gray-800">
                                            Modifica: {filePath.split('/').pop()}
                                        </h2>
                                        <div className="space-x-2">
                                            <button
                                                onClick={handleSave}
                                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                            >
                                                Salva
                                            </button>
                                            <button
                                                onClick={() => navigate('/')}
                                                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                                            >
                                                Chiudi
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        className="w-full h-[calc(100vh-250px)] p-4 border rounded-lg font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        spellCheck={false}
                                    />
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