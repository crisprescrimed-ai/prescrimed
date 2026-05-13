import { get, post, put, del, buildQueryString } from './request';

const financeiroService = {
  getAll: async (filters = {}) => {
    const qs = buildQueryString({
      tipo: filters.tipo,
      status: filters.status,
      dataInicio: filters.dataInicio,
      dataFim: filters.dataFim,
      page: filters.page,
      pageSize: filters.pageSize,
    });
    return get(`/financeiro${qs}`);
  },

  getStats: async () => {
    const response = await get('/financeiro/stats');
    // Se a resposta tiver um campo 'data', extrai ele
    return response?.data || response;
  },

  create: async (data) => {
    return post('/financeiro', data);
  },

  update: async (id, data) => {
    return put(`/financeiro/${id}`, data);
  },

  delete: async (id) => {
    return del(`/financeiro/${id}`);
  }
};

export default financeiroService;
