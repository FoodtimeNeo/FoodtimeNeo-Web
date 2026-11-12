import { ApiError, http } from './http.js';

/** 读取服务器判定的有效能力；未知能力名保留给未来功能，客户端不自行推断角色。 */
export async function fetchCapabilities() {
  const data = await http.get('/users/me/capabilities');
  if (
    !data ||
    !Array.isArray(data.capabilities) ||
    typeof data.revision !== 'string'
  ) {
    throw new ApiError('能力响应不符合接口约定', { code: 'PROTOCOL' });
  }
  return {
    capabilities: data.capabilities.filter(
      (capability) => typeof capability === 'string',
    ),
    revision: data.revision,
  };
}
