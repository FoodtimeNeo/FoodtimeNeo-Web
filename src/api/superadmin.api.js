import { http } from './http.js';

export const fetchDashboard = () => http.get('/superadmin/dashboard');

export const fetchAuditLogs = (page, perPage = 20) =>
  http.get('/superadmin/logs', {
    params: { page, per_page: perPage },
  });

export const fetchUsers = (page, search = '', perPage = 20) =>
  http.get('/superadmin/users', {
    params: { page, per_page: perPage, search },
  });

export const updateUserRole = (userId, role) =>
  http.put(`/superadmin/users/${encodeURIComponent(userId)}/role`, { role });

export const updateUserStatus = (userId, status) =>
  http.put(`/superadmin/users/${encodeURIComponent(userId)}/status`, {
    status,
  });

export const resetUserPassword = (userId, password) =>
  http.put(`/superadmin/users/${encodeURIComponent(userId)}/password`, {
    password,
  });

export const fetchInviteCode = () => http.get('/auth/invite-code');

export const generateInviteCode = () => http.post('/auth/invite-code/generate');
