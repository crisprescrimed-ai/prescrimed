export const getRootFromApiUrl = (apiUrl) => {
  if (!apiUrl) return '';
  return apiUrl.replace(/\/api\/?$/, '');
};

export const isRelativeApiUrl = (apiUrl) => Boolean(apiUrl) && apiUrl.startsWith('/');

export const resolveApiUrl = ({ explicitApiUrl = '' } = {}) => {
  const trimmedApiUrl = explicitApiUrl?.trim?.() || '';
  return trimmedApiUrl || '/api';
};

export const resolveApiRootUrl = ({ explicitApiUrl = '', explicitBackendRoot = '' } = {}) => {
  const trimmedApiUrl = explicitApiUrl?.trim?.() || '';
  const trimmedBackendRoot = explicitBackendRoot?.trim?.() || '';

  if (trimmedApiUrl && isRelativeApiUrl(trimmedApiUrl)) return '';
  if (trimmedBackendRoot) return trimmedBackendRoot;
  if (trimmedApiUrl) return getRootFromApiUrl(trimmedApiUrl);

  return '';
};

export const shouldMonitorBackend = ({
  isDevelopment = false,
  explicitApiUrl = '',
  explicitBackendRoot = '',
  healthCheckEnabled = false,
} = {}) => {
  if (isDevelopment) return true;

  return Boolean(
    explicitBackendRoot?.trim?.()
    || !isRelativeApiUrl(explicitApiUrl?.trim?.() || '')
    || healthCheckEnabled
  );
};
