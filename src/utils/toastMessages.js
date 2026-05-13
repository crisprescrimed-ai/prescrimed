const verbMap = {
  create: { m: 'criado', f: 'criada' },
  update: { m: 'atualizado', f: 'atualizada' },
  delete: { m: 'excluído', f: 'excluída' },
};

const errorVerbMap = {
  create: 'criar',
  update: 'atualizar',
  delete: 'excluir',
  load: 'carregar',
  save: 'salvar',
  cancel: 'cancelar',
  login: 'fazer login',
  register: 'realizar cadastro',
};

const customErrorMap = {
  accessDenied: 'Acesso negado',
  passwordMismatch: 'As senhas não coincidem',
  minPassword: 'Senha deve ter no mínimo 6 caracteres',
  cannotDeleteSelf: 'Você não pode excluir seu próprio usuário',
};

export const successMessage = (action, entity, { gender = 'm', suffix = '' } = {}) => {
  const verb = verbMap[action]?.[gender] || verbMap[action]?.m || '';
  return `${entity} ${verb} com sucesso${suffix}`;
};

export const errorMessage = (action, entity) => {
  const verb = errorVerbMap[action] || action;
  return `Erro ao ${verb} ${entity}`;
};

export const customErrorMessage = (key) => customErrorMap[key] || key;

export const apiErrorMessage = (error, fallback) =>
  error?.response?.data?.error || error?.response?.data?.message || fallback;

export const apiErrorCode = (error) => error?.response?.data?.code || null;

export const friendlyErrorFromCode = (code) => {
  switch (code) {
    case 'validation_error':
      return 'Alguns dados parecem inválidos. Verifique os campos e tente novamente.';
    case 'unique_constraint':
      return 'Já existe um registro com esses dados.';
    case 'auth_token_error':
      return 'Sessão expirada. Faça login novamente.';
    case 'access_denied':
      return 'Você não tem permissão para esta ação.';
    case 'not_found':
      return 'Recurso não encontrado.';
    case 'service_unavailable':
      return 'Serviço indisponível no momento. Tente mais tarde.';
    case 'empresa_inativa':
      return 'Empresa inativa. Entre em contato com o suporte para reativação.';
    case 'trial_expired':
      return 'Período de teste encerrado. Entre em contato com o suporte para renovar ou contratar um plano.';
    default:
      return null;
  }
};
