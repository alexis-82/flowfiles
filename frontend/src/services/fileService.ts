import axios from 'axios';

const API_URL = 'http://localhost:3000/api/files';
const SETTINGS_URL = 'http://localhost:3000/api/settings';

export const fileService = {
  async uploadFile(file: File, path: string = '/', onProgress?: (progress: number) => void) {
    // Prima controlla lo spazio disponibile
    const storageInfo = await this.getStorageInfo();
    if (file.size + storageInfo.usedStorage > storageInfo.totalStorage) {
        throw new Error('Storage limit exceeded');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    
    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress?.(percentCompleted);
        }
      }
    });
    return response.data;
  },

  async getAllFiles(path: string = '/') {
    const response = await axios.get(`${API_URL}/list`, {
      params: { path }
    });
    return response.data;
  },

  async deleteFile(filepath: string) {
    const response = await axios.delete(`${API_URL}/${encodeURIComponent(filepath)}`);
    return response.data;
  },

  renameFile: async (oldPath: string, newPath: string) => {
    try {
      const response = await axios.post(`${API_URL}/rename`, { oldName: oldPath, newName: newPath });
      return response.data;
    } catch (error) {
      console.error('Errore durante la rinomina del file:', error);
      throw error;
    }
  },

  deleteAllFiles: async () => {
    const response = await axios.delete(`${API_URL}/all`);
    return response.data;
  },

  createFolder: async (folderName: string, path: string = '/') => {
    try {
      const response = await axios.post(`${API_URL}/folder`, { 
        name: folderName,
        path: path 
      });
      return response.data;
    } catch (error) {
      console.error('Errore durante la creazione della cartella:', error);
      throw error;
    }
  },

  async getStorageInfo() {
    try {
      const response = await axios.get(`${API_URL}/storage`);
      return response.data;
    } catch (error) {
      console.error('Error getting storage information:', error);
      throw error;
    }
  },

  // Metodi per il cestino
  async getTrashFiles() {
    try {
      const response = await axios.get(`${API_URL}/trash`);
      return response.data;
    } catch (error) {
      console.error('Error getting trash files:', error);
      throw error;
    }
  },

  async restoreFromTrash(filename: string) {
    try {
      const response = await axios.post(`${API_URL}/trash/restore/${encodeURIComponent(filename)}`);
      return response.data;
    } catch (error) {
      console.error('Error restoring file from trash:', error);
      throw error;
    }
  },

  async deleteFromTrash(filename: string) {
    try {
      const response = await axios.delete(`${API_URL}/trash/${encodeURIComponent(filename)}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting file from trash:', error);
      throw error;
    }
  },

  async emptyTrash() {
    try {
      const response = await axios.delete(`${API_URL}/trash/empty`);
      return response.data;
    } catch (error) {
      console.error('Error emptying trash:', error);
      throw error;
    }
  },

  downloadFile: async (filepath: string) => {
    try {
      const response = await axios.get(`${API_URL}/download/${filepath}`, {
        responseType: 'arraybuffer'
      });
      return response;
    } catch (error) {
      console.error('Errore durante il download del file:', error);
      throw error;
    }
  },

  saveFile: async (filepath: string, content: string) => {
    try {
      const response = await axios.post(`${API_URL}/save`, {
        path: filepath,
        content: content
      });
      return response.data;
    } catch (error) {
      console.error('Errore durante il salvataggio del file:', error);
      throw error;
    }
  },

  createFile: async (filename: string, path: string = '/') => {
    try {
      const response = await axios.post(`${API_URL}/create`, { 
        name: filename,
        path: path 
      });
      return response.data;
    } catch (error) {
      console.error('Errore durante la creazione del file:', error);
      throw error;
    }
  },

  async getStorageSettings() {
    const response = await axios.get(`${SETTINGS_URL}/storage`);
    return response.data;
  },

  async updateStorageSettings(storageLimit: number, fileSizeLimit: number) {
    const response = await axios.post(`${SETTINGS_URL}/storage`, {
      storageLimit,
      fileSizeLimit
    });
    return response.data;
  },

  async moveToVault(filepath: string) {
    try {
      const token = localStorage.getItem('vaultToken');
      const response = await axios.post(`${API_URL}/vault/move`, 
        { path: filepath },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Errore durante lo spostamento nella cassaforte:', error);
      throw error;
    }
  },

  async getVaultFiles() {
    try {
      const token = localStorage.getItem('vaultToken');
      const response = await axios.get(`${API_URL}/vault`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting vault files:', error);
      throw error;
    }
  },

  async authenticateVault(password: string) {
    try {
      const response = await axios.post(`${API_URL}/vault/auth`, { password });
      const { token } = response.data;
      localStorage.setItem('vaultToken', token);
      return true;
    } catch (error) {
      console.error('Error authenticating vault:', error);
      throw error;
    }
  },

  async restoreFromVault(filename: string) {
    try {
      const token = localStorage.getItem('vaultToken');
      const response = await axios.post(
        `${API_URL}/vault/restore/${encodeURIComponent(filename)}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error restoring file from vault:', error);
      throw error;
    }
  },

  async deleteFromVault(filename: string) {
    try {
      const token = localStorage.getItem('vaultToken');
      const response = await axios.delete(
        `${API_URL}/vault/${encodeURIComponent(filename)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting file from vault:', error);
      throw error;
    }
  },

  async downloadVaultFile(filepath: string) {
    try {
      const token = localStorage.getItem('vaultToken');
      const response = await axios.get(
        `${API_URL}/vault/download/${encodeURIComponent(filepath)}`,
        {
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response;
    } catch (error) {
      console.error('Errore durante il download del file dalla cassaforte:', error);
      throw error;
    }
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logError: async (message: string, details?: any) => {
    try {
      await axios.post(`${API_URL}/log-error`, {
        message,
        details
      });
    } catch (error) {
      console.error('Error logging to server:', error);
    }
  },

  setVaultPassword: async (currentPassword: string | null, newPassword: string) => {
    const response = await axios.post(`${API_URL}/vault/set-password`, {
      currentPassword,
      newPassword
    });
    return response.data;
  },

  checkVaultStatus: async () => {
    const response = await axios.get(`${API_URL}/vault/status`);
    return response.data;
  },

  resetVaultPassword: async () => {
    const response = await axios.post(`${API_URL}/vault/reset-password`);
    // Rimuovi il token dalla localStorage dopo il reset
    localStorage.removeItem('vaultToken');
    return response.data;
  }
};