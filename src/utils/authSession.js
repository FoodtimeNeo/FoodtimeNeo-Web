// 清理旧版存储，不从本地Token、角色或Mock数据库恢复身份。
export function clearSession() {
  try {
    window.localStorage.removeItem('foodtime_auth_session');
    window.localStorage.removeItem('foodtime_mock_db_v1');
  } catch {
    // 禁用存储不影响由HttpOnly Cookie管理的服务器会话。
  }
}
