import { get, buildQueryString } from './request';

const dashboardService = {
  getStats: async (dataInicio, dataFim, empresaId) => {
    const qs = buildQueryString({ dataInicio, dataFim, empresaId });
    return get(`/dashboard/stats${qs}`);
  },

  getPrescricoesRecentes: async (empresaId) => {
    const qs = buildQueryString({ empresaId });
    return get(`/dashboard/prescricoes-recentes${qs}`);
  },

  getPacientesRecentes: async (empresaId) => {
    const qs = buildQueryString({ empresaId });
    return get(`/dashboard/pacientes-recentes${qs}`);
  },

  getNextSteps: async (empresaId) => {
    const qs = buildQueryString({ empresaId });
    return get(`/dashboard/next-steps${qs}`);
  },

  getPriorityAlerts: async (empresaId) => {
    const qs = buildQueryString({ empresaId });
    return get(`/dashboard/alerts${qs}`);
  },
};

export default dashboardService;