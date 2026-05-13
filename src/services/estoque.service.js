import { get, post } from './request';

const estoqueService = {
  // --- MEDICAMENTOS ---
  getMedicamentos: async (params = {}, config = {}) => {
    return get('/estoque/medicamentos', { ...config, params });
  },

  createMedicamento: async (data) => {
    return post('/estoque/medicamentos', data);
  },

  movimentarMedicamento: async (data) => {
    // data: { medicamentoId, tipo: 'entrada'|'saida', quantidade, motivo, observacao }
    return post('/estoque/medicamentos/movimentacao', data);
  },

  // --- ALIMENTOS ---
  getAlimentos: async (params = {}, config = {}) => {
    return get('/estoque/alimentos', { ...config, params });
  },

  createAlimento: async (data) => {
    return post('/estoque/alimentos', data);
  },

  movimentarAlimento: async (data) => {
    // data: { alimentoId, tipo: 'entrada'|'saida', quantidade, motivo, observacao }
    return post('/estoque/alimentos/movimentacao', data);
  },

  // --- ESTATÍSTICAS E RELATÓRIOS ---
  getStats: async (config = {}) => {
    return get('/estoque/stats', config);
  },

  getMovimentacoes: async (tipo = '', config = {}) => {
    const url = tipo ? `/estoque/movimentacoes?tipo=${tipo}` : '/estoque/movimentacoes';
    return get(url, config);
  }
};

export default estoqueService;
