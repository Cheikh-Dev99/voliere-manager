export type FeedbackVariant = 'success' | 'error' | 'info' | 'confirm';

export type FeedbackButtonStyle = 'default' | 'cancel' | 'destructive';

export type FeedbackButtonSpec = {
  text: string;
  style?: FeedbackButtonStyle;
  onPress?: () => void;
};

export type FeedbackOpenPayload = {
  variant: FeedbackVariant;
  title: string;
  message?: string;
  buttons: FeedbackButtonSpec[];
  /** Appelé à la fermeture (backdrop, X, Android back) sans action bouton — ex. `confirm` → `false`. */
  onDismiss?: () => void;
};

export type FeedbackHandler = (payload: FeedbackOpenPayload) => void;
