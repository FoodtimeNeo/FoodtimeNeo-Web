import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { shareCommunityPost } from './usePostShare.js';

const messages = vi.hoisted(() => ({ success: vi.fn(), prompt: vi.fn() }));
vi.mock('element-plus', () => ({
  ElMessage: { success: messages.success },
  ElMessageBox: { prompt: messages.prompt },
}));

const id = '94061de3-347d-4368-890b-706d433f8478';
const url = () => `${window.location.origin}/community/posts/${id}`;

beforeEach(() => {
  vi.clearAllMocks();
  messages.prompt.mockResolvedValue({});
});
afterEach(() => vi.unstubAllGlobals());

it('shares a canonical post URL', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { share });
  await shareCommunityPost(id);
  expect(share).toHaveBeenCalledExactlyOnceWith({
    title: '北交干饭吧 · 校园食记',
    url: url(),
  });
  expect(messages.prompt).not.toHaveBeenCalled();
});

it('offers the URL for manual copying if clipboard permission is denied', async () => {
  const writeText = vi.fn().mockRejectedValue(new Error('denied'));
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  await shareCommunityPost(id);
  expect(writeText).toHaveBeenCalledExactlyOnceWith(url());
  expect(messages.success).not.toHaveBeenCalled();
  expect(messages.prompt).toHaveBeenCalledWith(
    expect.any(String),
    '分享帖子',
    expect.objectContaining({ inputValue: url() }),
  );
});
