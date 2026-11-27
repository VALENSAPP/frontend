// Shows a toast. Its look (purple pill with an icon for success, red for
// errors, and so on) comes from AppToast, set as renderToast on the
// ToastProvider in App.js, so every toast in the app looks the same.
export const showToastMessage = async (toast, type, text, duration = 2500) => {
    try {
        if (!toast || typeof toast.show !== 'function') {
            console.warn('Toast object is not available or toast.show is not a function');
            return;
        }
        toast.show(typeof text === 'string' ? text : String(text ?? ''), {
            type,
            placement: 'top',
            animationType: 'slide-in',
            swipeEnabled: true,
            duration,
        });
    } catch (error) {
        console.error('Error in toaster:', error);
    }
};
