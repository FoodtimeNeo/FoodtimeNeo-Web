export function developmentProxyTarget(value = 'http://127.0.0.1:8080') {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('开发代理必须是有效的后端来源');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) &&
      ![
        'http://154.9.252.201',
        'https://154.9.252.201',
        'https://kfcvivo50.ddns.net',
      ].includes(url.origin)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('开发代理只允许无凭据的本机或指定服务器来源');
  return url.origin;
}
