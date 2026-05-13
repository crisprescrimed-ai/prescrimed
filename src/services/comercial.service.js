import { get, post, put } from './request';

const comercialService = {
  getOverview: async () => get('/comercial/overview'),

  getCatalogo: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, value);
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return get(`/comercial/catalogo${suffix}`);
  },

  createItem: async (payload) => post('/comercial/catalogo', payload),
  updateItem: async (id, payload) => put(`/comercial/catalogo/${id}`, payload),

  getPedidos: async () => get('/comercial/pedidos'),
  createPedido: async (payload) => post('/comercial/pedidos', payload),
  updatePedidoStatus: async (id, payload) => put(`/comercial/pedidos/${id}/status`, payload),
  addPagamento: async (id, payload) => post(`/comercial/pedidos/${id}/pagamentos`, payload),

  getNotas: async () => get('/comercial/notas'),
  emitirNota: async (id, payload) => post(`/comercial/pedidos/${id}/nota-fiscal`, payload),
};

export default comercialService;