import toast from 'react-hot-toast';
import { fileService } from '../services/fileService';

export const customToast = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (message: string, details?: any) => {
        // Log the error to the backend
        fileService.logError(message, details);
        // Show the toast notification
        return toast.error(message);
    },

    success: (message: string) => {
        return toast.success(message);
    },

    loading: (message: string) => {
        return toast.loading(message);
    }
};

export default customToast; 