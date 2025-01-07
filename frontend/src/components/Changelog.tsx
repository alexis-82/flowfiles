import React from 'react';

interface ChangelogEntry {
    version: string;
    date: string;
    changes: string[];
}

const changelogData: ChangelogEntry[] = [
    {
        version: "1.2.0",
        date: "07-01-2025",
        changes: [
            "Aggiunta la sidebar",
            "Implementato sezione Changelog",
            "Migliorata l'interfaccia utente",
            "Rotazione automatica dei file di log",
            "Separazione tra log di errore e log generali",
            "Aggiunto un pulsante per nascondere/mostrare la sidebar",
            "Aggiunto monitoraggio dello storage",
            "Implementato il limite di storage a 1GB di default (non funzionante)",
        ]
    },
    {
        version: "1.0.0",
        date: "14-12-2024",
        changes: [
            "Prima release dell'applicazione",
            "Creazione dell'interfaccia utente principale",
            "Implementato il sistema di gestione file",
            "Aggiunta la funzionalità di upload file",
            "Aggiunta la funzionalità di download file",
            "Aggiunta la funzionalità di rinomina file",
            "Aggiunta la funzionalità di eliminazione di tutti i file",
            "Aggiunta la funzionalità di eliminazione di un singolo file",
            "Aggiunto il supporto per il drag and drop dei file"
        ]
    }
];

const Changelog: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto p-6 bg-white shadow-xl rounded-xl">
            <h1 className="text-3xl font-bold text-center mb-8" style={{ color: '#209CEE' }}>Changelog</h1>
            
            <div className="space-y-8">
                {changelogData.map((entry, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <div className="flex items-baseline justify-between">
                            <h2 className="text-xl font-semibold text-gray-800">
                                Version {entry.version}
                            </h2>
                            <span className="text-sm text-gray-500">{entry.date}</span>
                        </div>
                        <ul className="mt-2 space-y-2">
                            {entry.changes.map((change, changeIndex) => (
                                <li key={changeIndex} className="text-gray-600 flex items-start">
                                    <span className="mr-2">•</span>
                                    {change}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Changelog; 
