import metadata from '../../public/downloads/testing/FoodtimeNeo-Android.apk.json';

export const TEST_APK_VERSION = `v${metadata.versionName}`;
export const TEST_APK_FILE_NAME = 'FoodtimeNeo-Android-testing.apk';
export const TEST_APK_DOWNLOAD_URL = `/downloads/testing/FoodtimeNeo-Android.apk?v=${encodeURIComponent(metadata.versionName)}-${metadata.versionCode}`;
export const TEST_APK_SIZE = `${(metadata.bytes / 1_000_000).toFixed(1)} MB`;
export const TEST_RELEASE_URL = metadata.releaseUrl;
