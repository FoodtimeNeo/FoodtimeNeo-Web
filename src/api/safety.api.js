import { http } from './http.js';

const blockPath = (id) => `/users/${encodeURIComponent(id)}/block`;
export const fetchBlockState = (id) => http.get(blockPath(id));
export const fetchBlockedUsers = (page = 1, options = {}) =>
  http.get('/users/me/blocks', { ...options, params: { page, size: 20 } });
export const setUserBlock = (id, blocked) =>
  blocked ? http.put(blockPath(id)) : http.delete(blockPath(id));
export const submitReport = (targetType, targetId, reason) =>
  http.post('/reports', { targetType, targetId, reason });
export const fetchReports = (page = 1, options = {}) =>
  http.get('/admin/reports', { ...options, params: { page, size: 20 } });
export const reviewReport = (id) =>
  http.put(`/admin/reports/${encodeURIComponent(id)}/review`);
export const decideReport = (id, body) =>
  http.post(`/admin/reports/${encodeURIComponent(id)}/decision`, body);
export const fetchMyReports = (page = 1, options = {}) =>
  http.get('/users/me/reports', { ...options, params: { page, size: 20 } });
export const fetchMyModerationDecisions = (page = 1, options = {}) =>
  http.get('/users/me/moderation-decisions', {
    ...options,
    params: { page, size: 20 },
  });
export const fetchReportFollowUps = (id, page = 1, options = {}) =>
  http.get(`/users/me/reports/${encodeURIComponent(id)}/follow-ups`, {
    ...options,
    params: { page, size: 20 },
  });
export const addReportFollowUp = (id, body) =>
  http.post(`/users/me/reports/${encodeURIComponent(id)}/follow-ups`, body);
export const submitAppeal = (decisionId, body, options = {}) =>
  http.post(
    `/users/me/moderation-decisions/${encodeURIComponent(decisionId)}/appeals`,
    body,
    options,
  );
export const fetchAdminDecisions = (page = 1, options = {}) =>
  http.get('/admin/reports/decisions', {
    ...options,
    params: { page, size: 20 },
  });
export const performReportAction = (reportId, body) =>
  http.post(`/admin/reports/${encodeURIComponent(reportId)}/actions`, body);
export const fetchAdminReportFollowUps = (id, page = 1, options = {}) =>
  http.get(`/admin/reports/${encodeURIComponent(id)}/follow-ups`, {
    ...options,
    params: { page, size: 20 },
  });
export const replyReportFollowUp = (id, body, options = {}) =>
  http.post(
    `/admin/reports/${encodeURIComponent(id)}/follow-ups`,
    body,
    options,
  );
export const fetchAdminAppeals = (status = '', page = 1, options = {}) =>
  http.get('/admin/appeals', {
    ...options,
    params: { status: status || undefined, page, size: 20 },
  });
export const fetchAdminAppeal = (id) =>
  http.get(`/admin/appeals/${encodeURIComponent(id)}`);
export const startAppealReview = (id, expectedRevision) =>
  http.post(`/admin/appeals/${encodeURIComponent(id)}/start`, null, {
    params: { expectedRevision },
  });
export const resolveAppeal = (id, body) =>
  http.post(`/admin/appeals/${encodeURIComponent(id)}/resolve`, body);
export const fetchDecisionActions = (decisionId, options = {}) =>
  http.get(
    `/users/me/moderation-decisions/${encodeURIComponent(decisionId)}/actions`,
    options,
  );
