import { http } from './http.js';

export function fetchAuditItems(kind) {
  if (kind === 'submissions') {
    return http.get('/submissions').then((data) => data.items ?? []);
  }
  if (kind === 'reviews') return http.get('/reviews/admin');
  if (kind === 'rants') return http.get('/rants');
  throw new Error('未知审核类型');
}

/** @param {'submissions' | 'reviews' | 'rants'} kind */
export function submitAudit(kind, id, status, reason, auditor) {
  const paths = {
    submissions: `/submissions/${id}/audit`,
    reviews: `/reviews/${id}/audit`,
    rants: `/rants/${id}/audit`,
  };
  if (!paths[kind]) throw new Error('未知审核类型');
  const payload = { status, reason };
  if (kind !== 'reviews') payload.auditor = auditor;
  return http.put(paths[kind], payload);
}
