export const feedbackTypes = {
  function: '功能反馈',
  content: '内容反馈',
  usage: '使用反馈',
  suggestion: '改进建议',
  other: '其他',
};
export const feedbackStatuses = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
};
export async function readFeedbackCsv(file) {
  if (!file || !/\.csv$/i.test(file.name)) throw new Error('请选择 CSV 文件');
  if (file.size > 8000000) throw new Error('文件过大，请分批导入');
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(
      await file.arrayBuffer(),
    );
  } catch {
    throw new Error('文件编码不正确，请另存为 CSV UTF-8 后重试');
  }
}
export function saveFeedbackCsv(file) {
  const url = URL.createObjectURL(
    new Blob([file.csv], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
