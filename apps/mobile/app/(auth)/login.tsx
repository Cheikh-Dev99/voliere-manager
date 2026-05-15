import { useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  LayoutGrid,
  Lock,
  Mail,
  User,
  UserPlus,
} from 'lucide-react-native';

import {
  login as firebaseLogin,
  registerWithProfile,
  sendPasswordReset,
} from '@shared/firebase/auth';

import { appFeedback } from '../../lib/appFeedback';
import { useGoogleSignIn } from '../../lib/useGoogleSignIn';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { SiteBackgroundDecor } from '../../components/layout/SiteBackgroundDecor';
import type { ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

type AuthTab = 'login' | 'register' | 'forgot';

type LoginIssues = { email?: string; password?: string };
type RegIssues = {
  email?: string;
  password?: string;
  confirm?: string;
  prenom?: string;
  nom?: string;
};

export default function LoginScreen() {
  const { colors: theme, shadowCard, resolved } = useAppTheme();
  const styles = useMemo(() => createLoginStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<AuthTab>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [regPrenom, setRegPrenom] = useState('');
  const [regNom, setRegNom] = useState('');
  const [regNomVoliere, setRegNomVoliere] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);

  const [loginIssues, setLoginIssues] = useState<LoginIssues>({});
  const [regIssues, setRegIssues] = useState<RegIssues>({});
  const [forgotIssues, setForgotIssues] = useState<{ email?: string }>({});
  const [forgotSent, setForgotSent] = useState(false);

  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    signInWithGoogle,
    googleBusy,
    googleError,
    clearGoogleError,
  } = useGoogleSignIn();

  const switchTab = useCallback((next: AuthTab) => {
    setTab(next);
    setLoginIssues({});
    setRegIssues({});
    setForgotIssues({});
    setForgotSent(false);
    setGlobalError(null);
    clearGoogleError();
    setRegPrenom('');
    setRegNom('');
    setRegNomVoliere('');
    setPassword('');
    setRegPassword('');
    setRegConfirm('');
    setShowPw(false);
    setShowRegPw(false);
  }, [clearGoogleError]);

  const onGooglePress = () => {
    setGlobalError(null);
    clearGoogleError();
    void signInWithGoogle();
  };

  const displayError = globalError || googleError;
  const authBusy = busy || googleBusy;

  const onSubmitLogin = async () => {
    setGlobalError(null);
    setLoginIssues({});
    const em = email.trim();
    if (!em) {
      setLoginIssues({ email: 'L’adresse e-mail est obligatoire pour te connecter.' });
      return;
    }
    if (!isValidEmail(em)) {
      setLoginIssues({ email: 'Ce format d’e-mail n’est pas valide (ex. nom@domaine.sn).' });
      return;
    }
    if (!password) {
      setLoginIssues({ password: 'Saisis ton mot de passe.' });
      return;
    }
    setBusy(true);
    try {
      await firebaseLogin(em, password);
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
      const message =
        err instanceof Error ? err.message : 'Échec de la connexion. Vérifie l’e-mail et le mot de passe.';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setLoginIssues({
          email: 'E-mail ou mot de passe incorrect.',
          password: ' ',
        });
      } else if (code === 'auth/user-not-found') {
        setLoginIssues({ email: 'Aucun compte pour cette adresse. Passe par Inscription.' });
      } else {
        setGlobalError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const onSubmitRegister = async () => {
    setGlobalError(null);
    setRegIssues({});
    const em = email.trim();
    const prenom = regPrenom.trim();
    const nom = regNom.trim();
    if (!prenom) {
      setRegIssues({ prenom: 'Le prénom est obligatoire.' });
      return;
    }
    if (!nom) {
      setRegIssues({ nom: 'Le nom est obligatoire.' });
      return;
    }
    if (!em) {
      setRegIssues({ email: 'L’adresse e-mail est obligatoire.' });
      return;
    }
    if (!isValidEmail(em)) {
      setRegIssues({ email: 'Ce format d’e-mail n’est pas valide (ex. nom@domaine.sn).' });
      return;
    }
    if (!regPassword) {
      setRegIssues({ password: 'Choisis un mot de passe.' });
      return;
    }
    if (regPassword.length < 6) {
      setRegIssues({ password: 'Le mot de passe doit contenir au moins 6 caractères.' });
      return;
    }
    if (regPassword !== regConfirm) {
      setRegIssues({ confirm: 'Les deux mots de passe doivent être identiques.' });
      return;
    }
    setBusy(true);
    try {
      await registerWithProfile(em, regPassword, {
        prenom,
        nom,
        nomElevage: regNomVoliere.trim() || undefined,
      });
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
      if (code === 'auth/email-already-in-use') {
        setRegIssues({ email: 'Cette adresse e-mail est déjà utilisée.' });
      } else if (code === 'auth/weak-password') {
        setRegIssues({ password: 'Mot de passe trop faible (au moins 6 caractères).' });
      } else {
        const message = err instanceof Error ? err.message : 'Inscription impossible.';
        setGlobalError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const onSubmitForgot = async () => {
    setGlobalError(null);
    setForgotIssues({});
    setForgotSent(false);
    const trimmed = email.trim();
    if (!trimmed) {
      setForgotIssues({ email: 'Indique l’adresse e-mail de ton compte.' });
      return;
    }
    if (!isValidEmail(trimmed)) {
      setForgotIssues({ email: 'Ce format d’e-mail n’est pas valide (ex. nom@domaine.sn).' });
      return;
    }
    setResetting(true);
    try {
      await sendPasswordReset(trimmed);
      setForgotSent(true);
      appFeedback.alert(
        'E-mail envoyé',
        'Si un compte correspond à cette adresse, tu recevras un lien pour choisir un nouveau mot de passe.',
      );
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
      if (code === 'auth/user-not-found') {
        setForgotIssues({
          email: 'Aucun compte avec cette adresse. Vérifie l’orthographe ou crée un compte via Inscription.',
        });
      } else if (code === 'auth/too-many-requests') {
        setForgotIssues({ email: 'Trop de demandes. Réessaie dans quelques minutes.' });
      } else {
        setForgotIssues({ email: 'Impossible d’envoyer l’e-mail. Réessaie plus tard.' });
      }
    } finally {
      setResetting(false);
    }
  };

  const isLogin = tab === 'login';
  const isForgot = tab === 'forgot';

  const loginEmailInvalid = !!loginIssues.email;
  const loginPasswordInvalid = !!loginIssues.password?.trim();
  const regPrenomInvalid = !!regIssues.prenom;
  const regNomInvalid = !!regIssues.nom;
  const regEmailInvalid = !!regIssues.email;
  const regPasswordInvalid = !!regIssues.password;
  const regConfirmInvalid = !!regIssues.confirm;
  const forgotEmailInvalid = !!forgotIssues.email;

  return (
    <View style={styles.screenRoot}>
      <SiteBackgroundDecor />
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 20) + 8 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, shadowCard]}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Volière Manager"
          />

          <View style={styles.segment} accessibilityRole="tablist">
            <Pressable
              onPress={() => switchTab('login')}
              style={[styles.segBtn, tab === 'login' && styles.segBtnOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === 'login' }}
              hitSlop={4}
            >
              <LayoutGrid size={18} color={tab === 'login' ? theme.teal800 : theme.slate500} />
              <Text style={[styles.segTxt, tab === 'login' && styles.segTxtOn]}>Connexion</Text>
            </Pressable>
            <Pressable
              onPress={() => switchTab('register')}
              style={[styles.segBtn, tab === 'register' && styles.segBtnOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === 'register' }}
              hitSlop={4}
            >
              <UserPlus size={18} color={tab === 'register' ? theme.teal800 : theme.slate500} />
              <Text style={[styles.segTxt, tab === 'register' && styles.segTxtOn]}>Inscription</Text>
            </Pressable>
            <Pressable
              onPress={() => switchTab('forgot')}
              style={[styles.segBtn, tab === 'forgot' && styles.segBtnOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === 'forgot' }}
              hitSlop={4}
            >
              <KeyRound size={18} color={tab === 'forgot' ? theme.teal800 : theme.slate500} />
              <Text style={[styles.segTxt, tab === 'forgot' && styles.segTxtOn]} numberOfLines={1}>
                Oublié
              </Text>
            </Pressable>
          </View>

          <Text style={styles.screenTitle} accessibilityRole="header">
            {isLogin ? 'Connexion' : isForgot ? 'Mot de passe oublié' : 'Créer un compte'}
          </Text>
          <Text style={styles.screenSub}>
            {isLogin
              ? 'Connecte-toi pour accéder à ta volière.'
              : isForgot
                ? 'Indique l’e-mail de ton compte : nous t’envoyons un lien pour définir un nouveau mot de passe.'
                : 'Prénom, nom, e-mail et mot de passe. Le nom de la volière est optionnel.'}
          </Text>

          {displayError ? (
            <View style={styles.errorBanner} accessibilityLiveRegion="polite">
              <AlertCircle size={18} color={theme.red600} />
              <Text style={styles.errorBannerTxt}>{displayError}</Text>
            </View>
          ) : null}

          {isLogin ? (
            <>
              <GoogleSignInButton
                label="Continuer avec Google"
                onPress={onGooglePress}
                disabled={authBusy}
                busy={googleBusy}
                theme={theme}
              />
              <View style={styles.authDividerRow}>
                <View style={styles.authDividerLine} />
                <Text style={styles.authDividerTxt}>ou</Text>
                <View style={styles.authDividerLine} />
              </View>

              <Text style={styles.lab}>E-mail</Text>
              <View
                style={[styles.inputWrap, loginEmailInvalid && styles.inputWrapInvalid]}
                accessibilityLabel="E-mail"
              >
                <Mail size={18} color={loginEmailInvalid ? theme.red600 : theme.slate500} strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  placeholder="ex. toi@domaine.sn"
                  placeholderTextColor={theme.slate500}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setLoginIssues((p) => ({ ...p, email: undefined }));
                    setGlobalError(null);
                  }}
                  editable={!authBusy}
                  textContentType="username"
                  autoComplete="email"
                />
              </View>
              {loginIssues.email ? (
                <Text style={styles.fieldErr}>{loginIssues.email}</Text>
              ) : null}

              <View style={styles.pwRow}>
                <Text style={styles.lab}>Mot de passe</Text>
                <Pressable onPress={() => switchTab('forgot')} hitSlop={10} accessibilityRole="link">
                  <Text style={styles.forgot}>Mot de passe oublié ?</Text>
                </Pressable>
              </View>
              <View
                style={[styles.inputWrap, loginPasswordInvalid && styles.inputWrapInvalid]}
                accessibilityLabel="Mot de passe"
              >
                <Lock size={18} color={loginPasswordInvalid ? theme.red600 : theme.slate500} strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={theme.slate500}
                  secureTextEntry={!showPw}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setLoginIssues((p) => ({ ...p, password: undefined }));
                    setGlobalError(null);
                  }}
                  editable={!authBusy}
                  textContentType="password"
                  autoComplete="password"
                />
                <Pressable
                  onPress={() => setShowPw((v) => !v)}
                  accessibilityLabel={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  hitSlop={12}
                >
                  {showPw ? (
                    <EyeOff size={22} color={theme.slate500} />
                  ) : (
                    <Eye size={22} color={theme.slate500} />
                  )}
                </Pressable>
              </View>
              {loginIssues.password?.trim() ? (
                <Text style={styles.fieldErr}>{loginIssues.password.trim()}</Text>
              ) : null}

              <Pressable
                style={[styles.button, authBusy && styles.buttonDisabled]}
                onPress={onSubmitLogin}
                disabled={authBusy}
                accessibilityRole="button"
                accessibilityLabel="Se connecter"
              >
                {busy ? (
                  <ActivityIndicator color={theme.white} />
                ) : (
                  <Text style={styles.buttonText}>Se connecter</Text>
                )}
              </Pressable>
            </>
          ) : isForgot ? (
            <>
              <Text style={styles.lab}>E-mail</Text>
              <View style={[styles.inputWrap, forgotEmailInvalid && styles.inputWrapInvalid]}>
                <Mail size={18} color={forgotEmailInvalid ? theme.red600 : theme.slate500} strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  placeholder="ex. toi@domaine.sn"
                  placeholderTextColor={theme.slate500}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setForgotIssues({});
                    setForgotSent(false);
                    setGlobalError(null);
                  }}
                  editable={!resetting}
                  textContentType="emailAddress"
                  autoComplete="email"
                />
              </View>
              {forgotIssues.email ? <Text style={styles.fieldErr}>{forgotIssues.email}</Text> : null}
              {forgotSent ? (
                <Text style={styles.hintOk}>
                  Si un compte existe, vérifie ta boîte mail (et les spams) pour le lien de réinitialisation.
                </Text>
              ) : null}

              <Pressable
                style={[styles.button, resetting && styles.buttonDisabled]}
                onPress={onSubmitForgot}
                disabled={resetting}
                accessibilityRole="button"
              >
                {resetting ? (
                  <ActivityIndicator color={theme.white} />
                ) : (
                  <Text style={styles.buttonText}>Envoyer le lien</Text>
                )}
              </Pressable>

              <Pressable style={styles.secondaryBtn} onPress={() => switchTab('login')} accessibilityRole="button">
                <Text style={styles.secondaryBtnTxt}>Retour à la connexion</Text>
              </Pressable>
            </>
          ) : (
            <>
              <GoogleSignInButton
                label="S’inscrire avec Google"
                onPress={onGooglePress}
                disabled={authBusy}
                busy={googleBusy}
                theme={theme}
              />
              <View style={styles.authDividerRow}>
                <View style={styles.authDividerLine} />
                <Text style={styles.authDividerTxt}>ou</Text>
                <View style={styles.authDividerLine} />
              </View>

              <View style={styles.row2}>
                <View style={styles.colHalf}>
                  <Text style={styles.lab}>Prénom</Text>
                  <View style={[styles.inputWrap, regPrenomInvalid && styles.inputWrapInvalid]}>
                    <User size={18} color={regPrenomInvalid ? theme.red600 : theme.slate500} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ex. Amadou"
                      placeholderTextColor={theme.slate500}
                      value={regPrenom}
                      onChangeText={(t) => {
                        setRegPrenom(t);
                        setRegIssues((p) => {
                          const n = { ...p };
                          delete n.prenom;
                          return n;
                        });
                        setGlobalError(null);
                      }}
                      editable={!authBusy}
                      textContentType="givenName"
                      autoComplete="given-name"
                    />
                  </View>
                  {regIssues.prenom ? <Text style={styles.fieldErr}>{regIssues.prenom}</Text> : null}
                </View>
                <View style={styles.colHalf}>
                  <Text style={styles.lab}>Nom</Text>
                  <View style={[styles.inputWrap, regNomInvalid && styles.inputWrapInvalid]}>
                    <User size={18} color={regNomInvalid ? theme.red600 : theme.slate500} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ex. Diop"
                      placeholderTextColor={theme.slate500}
                      value={regNom}
                      onChangeText={(t) => {
                        setRegNom(t);
                        setRegIssues((p) => {
                          const n = { ...p };
                          delete n.nom;
                          return n;
                        });
                        setGlobalError(null);
                      }}
                      editable={!authBusy}
                      textContentType="familyName"
                      autoComplete="family-name"
                    />
                  </View>
                  {regIssues.nom ? <Text style={styles.fieldErr}>{regIssues.nom}</Text> : null}
                </View>
              </View>

              <Text style={styles.lab}>
                Nom de la volière <Text style={styles.labMuted}>(optionnel)</Text>
              </Text>
              <View style={styles.inputWrap}>
                <Building2 size={18} color={theme.slate500} />
                <TextInput
                  style={styles.input}
                  placeholder="Ex. Élevage de la Médina"
                  placeholderTextColor={theme.slate500}
                  value={regNomVoliere}
                  onChangeText={setRegNomVoliere}
                  editable={!authBusy}
                />
              </View>
              <Text style={styles.hintMuted}>
                Si tu laisses vide, « Ma volière » sera utilisé par défaut.
              </Text>

              <Text style={styles.lab}>E-mail</Text>
              <View style={[styles.inputWrap, regEmailInvalid && styles.inputWrapInvalid]}>
                <Mail size={18} color={regEmailInvalid ? theme.red600 : theme.slate500} strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  placeholder="ex. toi@domaine.sn"
                  placeholderTextColor={theme.slate500}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setRegIssues((p) => {
                      const n = { ...p };
                      delete n.email;
                      return n;
                    });
                    setGlobalError(null);
                  }}
                  editable={!authBusy}
                  textContentType="emailAddress"
                  autoComplete="email"
                />
              </View>
              {regIssues.email ? <Text style={styles.fieldErr}>{regIssues.email}</Text> : null}

              <Text style={styles.lab}>Mot de passe</Text>
              <View style={[styles.inputWrap, regPasswordInvalid && styles.inputWrapInvalid]}>
                <Lock size={18} color={regPasswordInvalid ? theme.red600 : theme.slate500} />
                <TextInput
                  style={styles.input}
                  placeholder="Au moins 6 caractères"
                  placeholderTextColor={theme.slate500}
                  secureTextEntry={!showRegPw}
                  value={regPassword}
                  onChangeText={(t) => {
                    setRegPassword(t);
                    setRegIssues((p) => {
                      const n = { ...p };
                      delete n.password;
                      return n;
                    });
                    setGlobalError(null);
                  }}
                  editable={!authBusy}
                  textContentType="newPassword"
                  autoComplete="password-new"
                />
                <Pressable onPress={() => setShowRegPw((v) => !v)} hitSlop={12}>
                  {showRegPw ? <EyeOff size={22} color={theme.slate500} /> : <Eye size={22} color={theme.slate500} />}
                </Pressable>
              </View>
              {regIssues.password ? <Text style={styles.fieldErr}>{regIssues.password}</Text> : null}

              <Text style={styles.lab}>Confirmation</Text>
              <View style={[styles.inputWrap, regConfirmInvalid && styles.inputWrapInvalid]}>
                <Lock size={18} color={regConfirmInvalid ? theme.red600 : theme.slate500} />
                <TextInput
                  style={styles.input}
                  placeholder="Répète le mot de passe"
                  placeholderTextColor={theme.slate500}
                  secureTextEntry={!showRegPw}
                  value={regConfirm}
                  onChangeText={(t) => {
                    setRegConfirm(t);
                    setRegIssues((p) => {
                      const n = { ...p };
                      delete n.confirm;
                      return n;
                    });
                    setGlobalError(null);
                  }}
                  editable={!authBusy}
                  textContentType="newPassword"
                  autoComplete="password-new"
                />
              </View>
              {regIssues.confirm ? <Text style={styles.fieldErr}>{regIssues.confirm}</Text> : null}

              <Pressable
                style={[styles.button, authBusy && styles.buttonDisabled]}
                onPress={onSubmitRegister}
                disabled={authBusy}
                accessibilityRole="button"
              >
                {busy ? (
                  <ActivityIndicator color={theme.white} />
                ) : (
                  <Text style={styles.buttonText}>Créer mon compte</Text>
                )}
              </Pressable>

              <Pressable style={styles.secondaryBtn} onPress={() => switchTab('login')} accessibilityRole="button">
                <Text style={styles.secondaryBtnTxt}>Déjà un compte ? Connexion</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
  );
}

function createLoginStyles(theme: ThemeColors) {
  return StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: theme.slate100,
    position: 'relative',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.screenPadding,
  },
  card: {
    backgroundColor: theme.surfaceElevated,
    borderRadius: theme.radiusLg,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    width: '100%',
    height: 76,
    marginBottom: 8,
  },
  segment: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: theme.minTap,
    paddingHorizontal: 4,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.slate50,
  },
  segBtnOn: {
    backgroundColor: theme.surfaceHighlight,
    borderColor: theme.teal600,
    borderWidth: 2,
  },
  segTxt: { fontSize: 12, fontWeight: '700', color: theme.slate600 },
  segTxtOn: { color: theme.teal800 },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.slate900,
    marginBottom: 6,
  },
  screenSub: {
    fontSize: 14,
    color: theme.slate600,
    marginBottom: 16,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.rose50,
    borderWidth: 1,
    borderColor: '#fecdd3',
    marginBottom: 14,
  },
  errorBannerTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.rose900, lineHeight: 20 },
  lab: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.slate800,
    marginBottom: 6,
  },
  labMuted: { fontWeight: '500', color: theme.slate500 },
  pwRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  forgot: { fontSize: 13, fontWeight: '600', color: theme.teal700 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    minHeight: theme.minTap,
    backgroundColor: theme.slate50,
  },
  inputWrapInvalid: {
    borderColor: theme.red600,
    backgroundColor: theme.rose50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.slate900,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  fieldErr: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.red600,
    marginTop: 4,
    marginBottom: 4,
  },
  hintOk: { fontSize: 13, color: theme.teal800, marginTop: 8, lineHeight: 18 },
  hintMuted: { fontSize: 12, color: theme.slate500, marginTop: 4, marginBottom: 10, lineHeight: 17 },
  row2: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  colHalf: { flex: 1, minWidth: 0 },
  button: {
    marginTop: 18,
    backgroundColor: theme.teal600,
    borderRadius: theme.radiusMd,
    minHeight: theme.minTap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryBtnTxt: { fontSize: 15, fontWeight: '700', color: theme.teal700 },
  authDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.border,
  },
  authDividerTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
}
