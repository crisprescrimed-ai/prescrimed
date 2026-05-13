import { get, post, put, buildQueryString } from './request';

const prescricaoService = {
  getAll: async (filters = {}, config = {}) => {
    const qs = buildQueryString(filters);
    return get(`/prescricoes${qs}`, config);
  },

  getByPaciente: async (pacienteId) => {
    return get(`/prescricoes/paciente/${pacienteId}`);
  },

  getById: async (id) => {
    return get(`/prescricoes/${id}`);
  },

  create: async (data) => {
    return post('/prescricoes', data);
  },

  cancelar: async (id) => {
    return put(`/prescricoes/${id}/cancelar`);
  },

  arquivar: async (id) => {
    return put(`/prescricoes/${id}/arquivar`);
  },
};

export default prescricaoService;