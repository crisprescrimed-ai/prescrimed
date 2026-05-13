import { get, post, put, del } from './request';

const agendamentoService = {
  getAll: async (params = {}, config = {}) => {
    return get('/agendamentos', { ...config, params });
  },

  create: async (data) => {
    return post('/agendamentos', data);
  },

  update: async (id, data) => {
    return put(`/agendamentos/${id}`, data);
  },

  delete: async (id) => {
    return del(`/agendamentos/${id}`);
  },
};

export default agendamentoService;
