import api from './api';
import { get, post } from './request';

const backupService = {
  listByEmpresa: async (empresaId) => {
    return get(`/backups/empresas/${empresaId}`);
  },

  createForEmpresa: async (empresaId, { sendEmail = true } = {}) => {
    return post(`/backups/empresas/${empresaId}`, { sendEmail });
  },

  downloadForEmpresa: async (empresaId, filename) => {
    const response = await api.get(`/backups/empresas/${empresaId}/download/${encodeURIComponent(filename)}`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: 'application/gzip' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  }
};

export default backupService;
