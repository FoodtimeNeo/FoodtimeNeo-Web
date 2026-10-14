import { http } from './http.js';

export const fetchDashboard = () => http.get('/superadmin/dashboard');

export const fetchAuditLogs = (page, perPage = 20) =>
  http.get('/superadmin/logs', {
    params: { page, per_page: perPage },
  });
