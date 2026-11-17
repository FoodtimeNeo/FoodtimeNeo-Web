/** First/last pages, a contiguous current-page window, and explicit omitted ranges. */
export function paginationItems(page, pages, windowSize = 5) {
  const total = Math.max(1, Math.trunc(pages));
  const current = Math.max(1, Math.min(total, Math.trunc(page)));
  const count = Math.max(1, Math.min(total, Math.trunc(windowSize)));
  if (total <= count + 4) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(1, current - Math.floor(count / 2));
  let end = Math.min(total, start + count - 1);
  if (start <= 2) {
    start = 1;
    end = count + 2;
  } else if (end >= total - 1) {
    start = total - count - 1;
    end = total;
  }
  const numbers = new Set([1, total]);
  for (let i = start; i <= end; i++) numbers.add(i);
  const result = [];
  let previous = 0;
  for (const number of [...numbers].sort((a, b) => a - b)) {
    if (previous && number - previous > 1) result.push(null);
    result.push(number);
    previous = number;
  }
  return result;
}
