import { version } from '../../package.json';

export function displayVersion(internal) {
  return internal.replace(/-(alpha|beta)$/, (_, stage) =>
    stage === 'alpha' ? 'α' : 'β',
  );
}
export function versionLabel(internal) {
  const name = displayVersion(internal);
  return `v${name}${/^\d+\.\d+\.\d+$/.test(name) ? '' : ' 测试版'}`;
}
export const APP_VERSION_LABEL = versionLabel(version);
