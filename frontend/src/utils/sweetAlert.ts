import Swal from 'sweetalert2';

export const sweetAlert = {
    confirm: async (title: string, text: string, icon: 'warning' | 'error' | 'success' | 'info' = 'warning') => {
        const result = await Swal.fire({
            title,
            text,
            icon,
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sì',
            cancelButtonText: 'Annulla'
        });
        return result.isConfirmed;
    },

    prompt: async (title: string, inputLabel: string, inputValue: string = '') => {
        const result = await Swal.fire({
            title,
            input: 'text',
            inputLabel,
            inputValue,
            showCancelButton: true,
            confirmButtonText: 'OK',
            cancelButtonText: 'Annulla',
            inputValidator: (value) => {
                if (!value) {
                    return 'Questo campo è obbligatorio';
                }
                return null;
            }
        });
        return result.value;
    },

    passwordPrompt: async (title: string, inputLabel: string) => {
        const result = await Swal.fire({
            title,
            input: 'password',
            inputLabel,
            inputPlaceholder: 'Inserisci la password',
            showCancelButton: true,
            confirmButtonText: 'OK',
            cancelButtonText: 'Annulla',
            inputValidator: (value) => {
                if (!value) {
                    return 'La password è obbligatoria';
                }
                return null;
            }
        });
        return result.value;
    },

    success: (title: string, text?: string) => {
        return Swal.fire({
            title,
            text,
            icon: 'success',
            confirmButtonText: 'OK'
        });
    },

    error: (title: string, text?: string) => {
        return Swal.fire({
            title,
            text,
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
}; 