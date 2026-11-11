import { http } from './http.js';
const base = (admin) => (admin ? '/admin/feedback' : '/users/me/feedback');
export const fetchFeedback = (
  page = 1,
  archived = false,
  admin = false,
  options = {},
) =>
  http.get(base(admin), { ...options, params: { page, size: 20, archived } });
export const createFeedback = (input) => http.post(base(false), input);
export const fetchFeedbackDetail = (id, admin = false, options = {}) =>
  http.get(`${base(admin)}/${encodeURIComponent(id)}`, options);
export const fetchFeedbackReplies = (
  id,
  page = 1,
  admin = false,
  options = {},
) =>
  http.get(`${base(admin)}/${encodeURIComponent(id)}/replies`, {
    ...options,
    params: { page, size: 20 },
  });
export const replyToFeedback = (id, input) =>
  http.put(`${base(true)}/${encodeURIComponent(id)}`, input);
export const exportFeedback = () => http.post(`${base(true)}/export`);
export const importFeedback = (csv) =>
  http.post(`${base(true)}/import`, { csv });
