import api from './api';

export const request = async (method, url, data, config = {}) => {
  const response = await api.request({ method, url, data, ...config });
  return response.data;
};

export const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, item));
      return;
    }
    searchParams.append(key, value);
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
};

export const get = (url, config) => request('get', url, undefined, config);
export const post = (url, data, config) => request('post', url, data, config);
export const put = (url, data, config) => request('put', url, data, config);
export const del = (url, config) => request('delete', url, undefined, config);
