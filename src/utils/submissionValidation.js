export function validateImageFile(file) {
  if (!file || file.size === 0) return '请选择图片';
  if (!['image/jpeg', 'image/png'].includes(file.type))
    return '只支持 JPEG 或 PNG 图片';
  if (file.size > 10 * 1024 * 1024) return '图片不能超过 10MB';
  return '';
}
export function validatePrice(value, { required = false } = {}) {
  if (value === '') return required ? '请填写价格' : '';
  return /^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(String(value))
    ? ''
    : '价格须为非负数，最多 8 位整数和 2 位小数';
}
