import axios from 'axios';

const API_URL = 'http://localhost:3000/api/files';

export const fileService = {
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getAllFiles() {
    const response = await axios.get(`${API_URL}/list`);
    return response.data;
  },

  async deleteFile(filename: string) {
    const response = await axios.delete(`${API_URL}/${filename}`);
    return response.data;
  },

  renameFile: async (oldName: string, newName: string) => {
    try {
      const response = await axios.post(`${API_URL}/rename`, { oldName, newName });
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
  
  getStorageInfo: async () => {
    const response = await axios.get(`${API_URL}/storage`);
    return response.data;
  }
};