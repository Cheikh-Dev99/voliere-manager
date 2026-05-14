import { Alert, type AlertButton } from 'react-native';

import type { FeedbackHandler, FeedbackOpenPayload } from './appFeedbackTypes';

let handler: FeedbackHandler | null = null;

export function registerAppFeedbackHandler(fn: FeedbackHandler | null) {
  handler = fn;
}

export function emitAppFeedback(payload: FeedbackOpenPayload) {
  if (handler) {
    handler(payload);
    return;
  }
  const msg = payload.message ? `${payload.title}\n\n${payload.message}` : payload.title;
  const btns: AlertButton[] = payload.buttons.map((b) => ({
    text: b.text,
    style: b.style === 'destructive' ? 'destructive' : b.style === 'cancel' ? 'cancel' : 'default',
    onPress: b.onPress,
  }));
  Alert.alert(payload.title, payload.message ?? '', btns.length ? btns : undefined);
}
