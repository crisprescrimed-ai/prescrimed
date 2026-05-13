import { get, post, put, del } from './request';

const enfermagemService = {
  getAll: async (params = {}, config = {}) => {
    return get('/enfermagem', { ...config, params });
  },

  getById: async (id) => {
    return get(`/enfermagem/${id}`);
  },

  create: async (data, config = {}) => {
    return post('/enfermagem', data, config);
  },

  update: async (id, data, config = {}) => {
    return put(`/enfermagem/${id}`, data, config);
  },

  delete: async (id, config = {}) => {
    return del(`/enfermagem/${id}`, config);
  },

  getStats: async (config = {}) => {
    return get('/enfermagem/stats/dashboard', config);
  }
};

export default enfermagemService;
