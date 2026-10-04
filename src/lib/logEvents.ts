import { DeviceEventEmitter } from 'react-native';

// Log sheets opened from the tab bar's quick-log orb sit on top of whatever
// tab is showing, so saving doesn't refocus it and useFocusEffect never
// reruns. Screens that show logs subscribe here to reload instead.
const LOGS_CHANGED = 'logs-changed';

export function emitLogsChanged(): void {
  DeviceEventEmitter.emit(LOGS_CHANGED);
}

// Returns the unsubscribe function, so it can be returned from a useEffect.
export function onLogsChanged(listener: () => void): () => void {
  const sub = DeviceEventEmitter.addListener(LOGS_CHANGED, listener);
  return () => sub.remove();
}
