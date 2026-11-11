import { http, ApiError } from './http.js';

const root = '/users/me/account-lifecycle';
const invalid = () =>
  new ApiError('账号状态响应异常，请重新读取后再操作', { code: 'PROTOCOL' });
export async function fetchAccountLifecycle(options) {
  const row = await http.get(root, options);
  if (
    !row ||
    typeof row.verificationEmail !== 'string' ||
    typeof row.canDelete !== 'boolean' ||
    typeof row.canUnbind !== 'boolean'
  )
    throw invalid();
  return row;
}
export const sendAccountActionCode = (kind) =>
  http.post(root + (kind === 'delete' ? '/deletion-code' : '/unbind-code'));
export async function confirmAccountAction(kind, verificationCode) {
  const row = await http.post(`${root}/${kind}`, { verificationCode });
  if (
    kind === 'delete'
      ? row?.deleted !== true ||
        !Number.isFinite(Date.parse(row.emailsReusableAt))
      : !row?.profile?.id ||
        row.profile.role !== 'visitor' ||
        !Number.isFinite(Date.parse(row.schoolEmailReusableAt))
  )
    throw invalid();
  return row;
}
