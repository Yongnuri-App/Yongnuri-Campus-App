import { api } from './client';

export const marketApi = {
  listUsedItems: (page = 0, size = 20) =>
    api.get('/used-items', { params: { page, size } }),
  getUsedItem: (id: number) => api.get(`/used-items/${id}`),
};
