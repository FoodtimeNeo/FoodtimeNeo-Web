export const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
export function validateAvatarFile(file) {
  if (!file || !file.size) return '请选择头像图片';
  if (!['image/jpeg', 'image/png'].includes(file.type))
    return '只支持 JPEG 或 PNG 图片';
  return file.size > MAX_AVATAR_BYTES
    ? '头像原图不能超过10MB（10,485,760字节）'
    : '';
}
function bytes(file) {
  if (file.arrayBuffer) return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('图片无法读取'));
    reader.readAsArrayBuffer(file);
  });
}
export async function readAvatarDimensions(file) {
  const invalid = validateAvatarFile(file);
  if (invalid) throw new Error(invalid);
  const data = new Uint8Array(await bytes(file)),
    view = new DataView(data.buffer);
  let width = 0,
    height = 0;
  if (
    data.length >= 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => data[i] === n) &&
    String.fromCharCode(...data.slice(12, 16)) === 'IHDR'
  ) {
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else if (data[0] === 255 && data[1] === 216) {
    let offset = 2;
    while (offset + 4 <= data.length) {
      if (data[offset] !== 255) break;
      const marker = data[offset + 1];
      if (marker === 255) {
        offset++;
        continue;
      }
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) {
        offset += 2;
        continue;
      }
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + 2 + length > data.length) break;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        length >= 8
      ) {
        height = view.getUint16(offset + 5);
        width = view.getUint16(offset + 7);
        break;
      }
      offset += 2 + length;
    }
  }
  if (!width || !height) throw new Error('请选择完整、可读取的JPEG或PNG图片');
  if (width * height > 20000000) throw new Error('图片不能超过2000万像素');
  return { width, height };
}
export function cropGeometry(
  width,
  height,
  rotation,
  zoom,
  panX = 0,
  panY = 0,
) {
  const swapped = rotation % 180 !== 0,
    w = swapped ? height : width,
    h = swapped ? width : height;
  const scale = Math.max(480 / w, 480 / h) * Math.max(1, Math.min(4, zoom));
  const maxX = Math.max(0, (w * scale - 480) / 2),
    maxY = Math.max(0, (h * scale - 480) / 2);
  return {
    side: 480,
    x: 80,
    y: 40,
    scale,
    panX: Math.max(-maxX, Math.min(maxX, panX)),
    panY: Math.max(-maxY, Math.min(maxY, panY)),
  };
}
