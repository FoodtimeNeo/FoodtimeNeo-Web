// 服务端存储引用只经同站媒体接口读取；旧HTTPS地址使用匿名图片请求。
export function safeMediaUrl(value, origin = window.location.origin) {
  if (typeof value !== 'string' || !value || value.startsWith('//')) return '';
  try {
    const url = new URL(value, origin);
    if (url.username || url.password) return '';
    if (url.origin === origin)
      return /^\/api\/v1\/media\/[0-9a-f-]{36}$/i.test(url.pathname) &&
        !url.search &&
        !url.hash
        ? url.pathname
        : '';
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}
export function formatPrice(value) {
  if (value === null || value === undefined || value === '')
    return '价格未填写';
  const price = Number(value);
  return Number.isFinite(price) && price >= 0
    ? '¥' + price.toFixed(2)
    : '价格不可用';
}
