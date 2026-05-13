import toast from 'react-hot-toast';

export function showToast(message, type = 'info') {
  const opts = { duration: 4000 };
  if (type === 'success') return toast.success(message, opts);
  if (type === 'error') return toast.error(message, opts);
  if (type === 'loading') return toast.loading(message, opts);
  return toast(message, opts);
}

// Registra global para uso em interceptors e scripts
if (typeof window !== 'undefined') {
  window.showToast = showToast;
}
