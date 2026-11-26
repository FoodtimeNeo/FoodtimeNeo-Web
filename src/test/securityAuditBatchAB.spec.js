import { describe, it, expect, vi, beforeEach } from 'vitest';
import { catalogPayload } from '@/api/admin-manage.api.js';
import { pageIdentity } from '@/utils/pageIdentity.js';
import { validateInvitationCode } from '@/utils/authValidators.js';
import {
  acquireMedia,
  allowMediaSession,
  invalidateMedia,
} from '@/utils/mediaLoader.js';

describe('Security Audit Batch A+B regressions', () => {
  it('forwards dining-hall GPS coordinates and clearCoordinates in catalogPayload', () => {
    const withCoords = catalogPayload('dining-halls', {
      name: '学活餐厅',
      description: 'desc',
      status: 'active',
      coverImageUrl: null,
      sortOrder: 1,
      latitude: 39.9512,
      longitude: 116.3421,
    });
    expect(withCoords.latitude).toBe(39.9512);
    expect(withCoords.longitude).toBe(116.3421);
    expect(withCoords.clearCoordinates).toBeUndefined();

    const cleared = catalogPayload('dining-halls', {
      name: '学活餐厅',
      description: 'desc',
      status: 'active',
      coverImageUrl: null,
      sortOrder: 1,
      clearCoordinates: true,
    });
    expect(cleared.clearCoordinates).toBe(true);
    expect(cleared.latitude).toBeUndefined();
  });

  it('keeps campusMap mounted across hall query updates', () => {
    expect(
      pageIdentity({
        name: 'campusMap',
        path: '/campus-map',
        fullPath: '/campus-map?hall=minghu',
        query: { hall: 'minghu' },
      }),
    ).toBe('campusMap');
    expect(
      pageIdentity({
        name: 'campusMap',
        path: '/campus-map',
        fullPath: '/campus-map?hall=xuehuo',
        query: { hall: 'xuehuo' },
      }),
    ).toBe('campusMap');
  });

  it('accepts lowercase invitation codes per UI copy', () => {
    expect(validateInvitationCode('abcdefgh2345', true)).toBe('');
    expect(validateInvitationCode('  abcdefgh2345  ', true)).toBe('');
    expect(validateInvitationCode('bad', true)).not.toBe('');
  });

  describe('ephemeral blob URL revocation in mediaLoader', () => {
    beforeEach(() => {
      allowMediaSession();
      invalidateMedia();
    });

    it('revokes no-store blob URLs on release', async () => {
      const revoked = [];
      const createSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:no-store-1');
      const revokeSpy = vi
        .spyOn(URL, 'revokeObjectURL')
        .mockImplementation((url) => revoked.push(url));
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'no-store',
        }),
        blob: async () => new Blob(['abc'], { type: 'image/jpeg' }),
      });

      try {
        const handle = acquireMedia(
          '/api/v1/media/00000000-0000-4000-8000-000000000001',
        );
        const url = await handle.promise;
        expect(url).toBe('blob:no-store-1');
        expect(revoked).toEqual([]);
        handle.release();
        expect(revoked).toContain('blob:no-store-1');
      } finally {
        createSpy.mockRestore();
        revokeSpy.mockRestore();
        fetchSpy.mockRestore();
      }
    });
  });
});
