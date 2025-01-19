import axios from 'axios';

const API_URL = 'http://localhost:3000/api/files';

export const fileService = {
  async uploadFile(file: File, path: string = '/') {
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

  createFolder: async (folderName: string) => {
    try {
      const response = await axios.post(`${API_URL}/folder`, { name: folderName });
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
  }
};