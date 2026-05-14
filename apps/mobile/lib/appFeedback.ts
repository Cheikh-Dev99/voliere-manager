import { emitAppFeedback } from './appFeedbackBus';
import type { FeedbackButtonSpec, FeedbackOpenPayload, FeedbackVariant } from './appFeedbackTypes';

function inferVariant(
  title: string,
  buttons: FeedbackButtonSpec[],
): FeedbackVariant {
  if (buttons.length >= 2) return 'confirm';
  const t = title.toLowerCase();
  if (t === 'succès') return 'success';
  if (
    t === 'erreur' ||
    t === 'validation' ||
    t === 'lot' ||
    t === 'conflit' ||
    t === 'photos' ||
    t === 'caméra' ||
    t === 'photo' ||
    t === 'couleur' ||
    t === 'dates' ||
    t === 'formulaire'
  ) {
    return 'error';
  }
  if (t === 'numéro proposé' || t === 'information') return 'info';
  return 'info';
}

export const appFeedback = {
  success(title: string, message?: string, onOk?: () => void) {
    emitAppFeedback({
      variant: 'success',
      title,
      message,
      buttons: [{ text: 'OK', style: 'default', onPress: onOk }],
    });
  },

  error(title: string, message?: string, onOk?: () => void) {
    emitAppFeedback({
      variant: 'error',
      title,
      message,
      buttons: [{ text: 'OK', style: 'default', onPress: onOk }],
    });
  },

  info(title: string, message?: string, onOk?: () => void) {
    emitAppFeedback({
      variant: 'info',
      title,
      message,
      buttons: [{ text: 'OK', style: 'default', onPress: onOk }],
    });
  },

  confirm(
    title: string,
    message: string,
    options?: { confirmText?: string; cancelText?: string; destructive?: boolean },
  ): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (v: boolean) => {
        if (settled) return;
        settled = true;
        resolve(v);
      };
      emitAppFeedback({
        variant: 'confirm',
        title,
        message,
        onDismiss: () => finish(false),
        buttons: [
          {
            text: options?.cancelText ?? 'Annuler',
            style: 'cancel',
            onPress: () => finish(false),
          },
          {
            text: options?.confirmText ?? 'Confirmer',
            style: options?.destructive ? 'destructive' : 'default',
            onPress: () => finish(true),
          },
        ],
      });
    });
  },

  /**
   * Remplace `Alert.alert` : même signature habituelle, styles natifs mappés.
   */
  alert(
    title: string,
    message?: string,
    buttons?: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress?: () => void;
    }>,
  ) {
    const raw = buttons?.length
      ? buttons
      : [{ text: 'OK' as const, style: 'default' as const }];
    const btns: FeedbackButtonSpec[] = raw.map((b) => ({
      text: b.text,
      style:
        b.style === 'destructive'
          ? 'destructive'
          : b.style === 'cancel'
            ? 'cancel'
            : 'default',
      onPress: b.onPress,
    }));
    const variant = inferVariant(title, btns);
    const payload: FeedbackOpenPayload = { variant, title, message, buttons: btns };
    emitAppFeedback(payload);
  },
};
