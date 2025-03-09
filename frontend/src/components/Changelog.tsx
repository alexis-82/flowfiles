import React from 'react';

interface ChangelogEntry {
    version: string;
    date: string;
    changes: string[];
}

const changelogData: ChangelogEntry[] = [
    {
        version: "1.4.2",
        date: "09-03-2025",
        changes: [
            "Aggiunto il supporto di visualizzazione delle immagini",
            "Aggiunto il supporto di visualizzazione dei file pdf",
            "Integrato in Impostazioni un sistema di aggiornamento automatico",
            "Fix per la visualizzazione delle cartelle nella Home Page",
            "Script per l'installazione di Flowfiles con PM2 e avvio automatico al boot",
            "Script per l'installazione di Flowfiles e configurazione di Systemd per avvio automatico al boot",
            "Implementato lo switch mode (light/dark)",
            "Fix dello storage dopo l'eliminazione di un singolo file dal cestino",
        ]
    },
    {
        version: "1.4.1",
        date: "16-02-2025",
        changes: [
            "Fix per il drag and drop dei file",
            "Fix per la visualizzazione delle cartelle e dei file nel cestino",
            "Spostato visualizzazione notifiche in basso a destra",
            "Aggiunto menù a tendina per creare file e cartelle anche nella Home Page",
            "Aggiunte nuove icone per i tipi di file",
        ]
    },
    {
        version: "1.4.0",
        date: "02-02-2025",
        changes: [
            "Implementato la barra di progressione per l'upload dei file di grosse dimensioni",
            "Implementato editor di file di testo, doppio click per modificare",
            "Implementato il salvataggio dei file di testo nell'editor",
            "Aggiunta la funzionalità di creare file",
            "Fix footer nella pagina principale",
            "Implementato il drag and drop per i file multipli",
            "Aggiunta area Impostazioni per configurare il limite di storage e file in upload",
            "Fix logging error, ora l'errore viene loggato nel file di log",
            "Fix dimensione icone sidebar in Files",
            "Implementato il download di cartelle con sistema di compressione",
            "Sostituito i dialog di default con dialog di SweetAlert2",
            "Implementato il drag and drop per le cartelle",
        ]
    },
    {
        version: "1.3.0",
        date: "19-01-2025",
        changes: [
            "Nuove API per il backend",
            "Creazione di una Nuova Cartella in Files e nella Dashboard",
            "Supporto per il Drag and Drop nella cartella creata",
            "Espansione della cartella creata",
            "Pulsante per ritornare alla Home Directory",
            "Visualizzazione del Path corrente",
            "Migliorata l'interfaccia utente",
            "Aggiunte nuove icone per i tipi di file",
            "Fix per il layout delle colonne nella tabella dei files",
            "Fix Path post eliminazione file o cartella",
            "Impostato limite di storage a 2GB di default",
            "Implementato limite di file in upload a 1GB di default",
            "Aggiunta la funzionalità di spostare i file nel cestino",
            "Aggiunta la funzionalità di ripristinare i file dal cestino",
            "Aggiunta la funzionalità di eliminare definitivamente i file dal cestino",
        ]
    },
    {
        version: "1.2.0",
        date: "07-01-2025",
        changes: [
            "Aggiunta di una sidebar",
            "Implementato sezione Changelog",
            "Migliorata l'interfaccia utente",
            "Rotazione automatica dei file di log (lato backend)",
            "Separazione tra log di errore e log generali (lato backend)",
            "Aggiunto un pulsante per nascondere/mostrare la sidebar",
            "Aggiunto monitoraggio dello storage",
            "Implementato il limite di storage a 1GB di default (non funzionante)",
            "Implementato il drag and drop per i multipli file"
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
            "Aggiunta la funzionalità di eliminazione di tutti i file (permanente)",
            "Aggiunta la funzionalità di eliminazione di un singolo file (permanente)",
            "Aggiunto il supporto per il drag and drop dei file"
        ]
    }
];

const Changelog: React.FC = () => {
    return (
        <div className="h-full overflow-y-auto pb-6 bg-gray-100 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto mt-6 bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6">
                <h1 className="text-3xl font-bold text-center mb-8 text-blue-500">Changelog</h1>
                <div className="space-y-8">
                    {changelogData.map((entry, index) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-4">
                            <div className="flex items-baseline justify-between">
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                                    Version {entry.version}
                                </h2>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{entry.date}</span>
                            </div>
                            <ul className="mt-2 space-y-2">
                                {entry.changes.map((change, changeIndex) => (
                                    <li key={changeIndex} className="text-gray-600 dark:text-gray-300 flex items-start">
                                        <span className="mr-2">•</span>
                                        {change}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Changelog; 
