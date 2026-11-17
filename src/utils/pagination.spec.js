import { describe, expect, it } from 'vitest';
import { paginationItems } from './pagination.js';
describe('pagination omitted ranges', () => {
  it('matches the requested leading and middle layouts', () => {
    expect(paginationItems(1, 34, 5)).toEqual([1, 2, 3, 4, 5, 6, 7, null, 34]);
    expect(paginationItems(6, 34, 5)).toEqual([
      1,
      null,
      4,
      5,
      6,
      7,
      8,
      null,
      34,
    ]);
    expect(paginationItems(34, 34, 5)).toEqual([
      1,
      null,
      28,
      29,
      30,
      31,
      32,
      33,
      34,
    ]);
  });
  it('keeps endpoints/current, ordering and every omitted range explicit across widths', () => {
    for (const total of [1, 5, 6, 9, 34, 100, 1000])
      for (const size of [1, 2, 3, 5, 9, 20])
        for (let page = 1; page <= total; page++) {
          const items = paginationItems(page, total, size);
          const numbers = items.filter((n) => n !== null);
          expect(numbers[0]).toBe(1);
          expect(numbers.at(-1)).toBe(total);
          expect(numbers).toContain(page);
          expect(new Set(numbers).size).toBe(numbers.length);
          for (let i = 1; i < items.length; i++) {
            if (items[i] === null)
              expect(items[i + 1] - items[i - 1]).toBeGreaterThan(1);
            else if (items[i - 1] !== null)
              expect(items[i] - items[i - 1]).toBe(1);
          }
        }
  });
});
