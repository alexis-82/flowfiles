// Configurazione API centralizzata

// Rileva automaticamente l'host corrente
const getCurrentHost = () => {
    // In ambiente di sviluppo usa localhost:3000
    if (import.meta.env?.DEV) {
        return 'http://localhost:3000';
    }
    
    // In produzione, usa lo stesso host da cui è servito il frontend, ma sulla porta 3000
    const currentHost = window.location.hostname;
    return `http://${currentHost}:3000`;
};

// Impostare l'URL base per le API del backend
export const API_BASE_URL = getCurrentHost();

// Endpoint derivati
export const API_ENDPOINTS = {
    FILES: `${API_BASE_URL}/api/files`,
    SETTINGS: `${API_BASE_URL}/api/settings`,
    UPDATE: `${API_BASE_URL}/api/update`,
};

// Ulteriori configurazioni
export const CONFIG = {
    // Altre configurazioni qui se necessario
};
