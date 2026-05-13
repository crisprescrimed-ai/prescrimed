import { get, post, put, del } from './request';

const pacienteService = {
  getAll: async (search = '', config = {}) => {
    const url = search ? `/pacientes?${search}` : '/pacientes';
    return get(url, config);
  },

  getById: async (id) => {
    return get(`/pacientes/${id}`);
  },

  getHistorico: async (id) => {
    return get(`/pacientes/${id}/prescricoes`);
  },

  create: async (data) => {
    return post('/pacientes', data);
  },

  update: async (id, data) => {
    return put(`/pacientes/${id}`, data);
  },

  inactivate: async (id) => {
    return put(`/pacientes/${id}/inativar`);
  },
};

export default pacienteService;