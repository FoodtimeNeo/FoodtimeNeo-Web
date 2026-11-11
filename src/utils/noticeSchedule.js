const zone = 'Etc/GMT-8';
const parts = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('公告时间无效');
  return Object.fromEntries(
    new Intl.DateTimeFormat('sv-SE', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
};
export function noticeInputTime(value) {
  if (!value) return '';
  const p = parts(value);
  return `${p.year.padStart(4, '0')}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function noticeInstant(value) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error('请填写完整的日期、小时和分钟');
  const date = new Date(value + ':00+08:00');
  if (
    !Number.isFinite(date.getTime()) ||
    noticeInputTime(date.toISOString()) !== value
  )
    throw new Error('公告日期或时间无效');
  return date.toISOString();
}
export function formatNoticeTime(value) {
  return value
    ? noticeInputTime(value).replace('T', ' ') + '（UTC+8）'
    : '未设置';
}
export function noticeScheduleForm(row = {}) {
  return {
    publishedAt: noticeInputTime(row.publishedAt),
    displayStartsAt: noticeInputTime(row.displayStartsAt),
    deadlineMode: row.expiresOn
      ? 'date'
      : row.displayEndsAt
        ? 'minute'
        : 'none',
    expiresOn: row.expiresOn || '',
    displayEndsAt: noticeInputTime(row.displayEndsAt),
    isUpdate: !!row.isUpdate,
    enabled: row.published === false ? true : (row.enabled ?? true),
    published: row.published ?? false,
    originalPublishedAt: row.publishedAt || null,
    originalStartsAt: row.displayStartsAt || null,
    originalEndsAt: row.displayEndsAt || null,
  };
}
export function noticeSchedulePayload(
  form,
  { published = form.published, enabled = form.enabled } = {},
) {
  const preserve = (input, original) =>
    original && input === noticeInputTime(original)
      ? original
      : noticeInstant(input);
  const publication = preserve(form.publishedAt, form.originalPublishedAt),
    start = preserve(form.displayStartsAt, form.originalStartsAt);
  let end = null,
    expiresOn = null;
  if (form.deadlineMode === 'minute') {
    if (!form.displayEndsAt) throw new Error('请填写截止日期和时间');
    end = preserve(form.displayEndsAt, form.originalEndsAt);
  }
  if (form.deadlineMode === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.expiresOn))
      throw new Error('请选择截止日期');
    noticeInstant(form.expiresOn + 'T00:00');
    expiresOn = form.expiresOn;
  }
  if (publication && start && Date.parse(start) < Date.parse(publication))
    throw new Error('开始显示时间不能早于发布时间');
  if (
    end &&
    (start || publication) &&
    Date.parse(end) <= Date.parse(start || publication)
  )
    throw new Error('截止时间必须晚于开始显示时间');
  return {
    publishedAt: publication,
    displayStartsAt: start,
    displayEndsAt: end,
    expiresOn,
    isUpdate: form.isUpdate,
    published,
    enabled: published && enabled,
  };
}
