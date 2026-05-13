import { get, post, put, del } from './request';

const usuarioService = {
  getAll: async (params) => {
    return get('/usuarios', { params });
  },

  getById: async (id) => {
    return get(`/usuarios/${id}`);
  },

  create: async (data) => {
    return post('/usuarios', data);
  },

  update: async (id, data) => {
    return put(`/usuarios/${id}`, data);
  },

  updatePermissions: async (id, permissoes) => {
    return put(`/usuarios/${id}/permissoes`, { permissoes });
  },

  updatePassword: async (id, senhaAtual, novaSenha) => {
    return put(`/usuarios/${id}/senha`, { senhaAtual, novaSenha });
  },

  delete: async (id) => {
    return del(`/usuarios/${id}`);
  },

  getMe: async () => {
    return get('/usuarios/me');
  },

  getProfileSummary: async () => {
    return get('/usuarios/me/summary');
  },

  updateMe: async (data) => {
    return put('/usuarios/me', data);
  },
};

export default usuarioService;