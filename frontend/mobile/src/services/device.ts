import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config';
import { createId } from '../utils/format';

// Without a stable id the backend adds a new device row on every login.
async function getDeviceId() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.deviceId);
    if (saved) return saved;
    const created = createId('device');
    await AsyncStorage.setItem(STORAGE_KEYS.deviceId, created);
    return created;
  } catch {
    return undefined;
  }
}

/** Device details sent when logging in. */
export const getDeviceFields = async () => ({
  uuid: await getDeviceId(),
  device_type: Platform.OS,
  device_model: Platform.OS === 'android' ? Platform.constants.Model : undefined,
  os_version: String(Platform.Version),
});
