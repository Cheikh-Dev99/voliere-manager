import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { KeyRound, LayoutGrid, Mail, UserPlus, Eye, EyeOff, Lock } from 'lucide-react-native';

import { login as firebaseLogin } from '@shared/firebase/auth';

import { theme, shadowCard } from '../../constants/theme';

type AuthTab = 'login' | 'register' | 'forgot';

export default function LoginScreen() {
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    const e = email.trim();
    if (!e || !password) {
      Alert.alert('Connexion', 'Renseigne l’e-mail et le mot de passe.');
      return;
    }
    setBusy(true);
    try {
      await firebaseLogin(e, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Échec de la connexion.';
      Alert.alert('Connexion', message);
    } finally {
      setBusy(false);
    }
  };

  const onTab = (t: AuthTab) => {
    if (t === 'login') {
      setTab('login');
      return;
    }
    Alert.alert(
      t === 'register' ? 'Inscription' : 'Mot de passe oublié',
      'Cette action est disponible sur la version web pour l’instant.',
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <View style={[styles.card, shadowCard]}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Volière Manager"
        />

        <View style={styles.segment}>
          <Pressable
            onPress={() => onTab('login')}
            style={[styles.segBtn, tab === 'login' && styles.segBtnOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'login' }}
          >
            <LayoutGrid size={16} color={tab === 'login' ? theme.teal800 : theme.slate500} />
            <Text style={[styles.segTxt, tab === 'login' && styles.segTxtOn]}>Connexion</Text>
          </Pressable>
          <Pressable
            onPress={() => onTab('register')}
            style={[styles.segBtn, tab === 'register' && styles.segBtnOn]}
            accessibilityRole="tab"
          >
            <UserPlus size={16} color={tab === 'register' ? theme.teal800 : theme.slate500} />
            <Text style={[styles.segTxt, tab === 'register' && styles.segTxtOn]}>Inscription</Text>
          </Pressable>
          <Pressable
            onPress={() => onTab('forgot')}
            style={[styles.segBtn, tab === 'forgot' && styles.segBtnOn]}
            accessibilityRole="tab"
          >
            <KeyRound size={16} color={tab === 'forgot' ? theme.teal800 : theme.slate500} />
            <Text style={[styles.segTxt, tab === 'forgot' && styles.segTxtOn]} numberOfLines={1}>
              Oublié
            </Text>
          </Pressable>
        </View>

        <Text style={styles.screenTitle}>Connexion</Text>
        <Text style={styles.screenSub}>Connecte-toi pour accéder à ta volière.</Text>

        <Text style={styles.lab}>E-mail</Text>
        <View style={styles.inputWrap}>
          <Mail size={18} color={theme.slate500} strokeWidth={2} />
          <TextInput
            style={styles.input}
            placeholder="ex. toi@domaine.sn"
            placeholderTextColor={theme.slate500}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!busy}
            textContentType="username"
          />
        </View>

        <View style={styles.pwRow}>
          <Text style={styles.lab}>Mot de passe</Text>
          <Pressable onPress={() => onTab('forgot')} hitSlop={8}>
            <Text style={styles.forgot}>Mot de passe oublié ?</Text>
          </Pressable>
        </View>
        <View style={styles.inputWrap}>
          <Lock size={18} color={theme.slate500} strokeWidth={2} />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={theme.slate500}
            secureTextEntry={!showPw}
            value={password}
            onChangeText={setPassword}
            editable={!busy}
            textContentType="password"
          />
          <Pressable
            onPress={() => setShowPw((v) => !v)}
            accessibilityLabel={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            hitSlop={8}
          >
            {showPw ? (
              <EyeOff size={20} color={theme.slate500} />
            ) : (
              <Eye size={20} color={theme.slate500} />
            )}
          </Pressable>
        </View>

        <Pressable
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Se connecter"
        >
          <Text style={styles.buttonText}>{busy ? 'Connexion…' : 'Se connecter'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.screenPadding,
    backgroundColor: theme.slate100,
  },
  card: {
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    padding: 22,
    borderWidth: 1,
    borderColor: theme.border,
  },
  logo: {
    width: '100%',
    height: 72,
    marginBottom: 4,
  },
  segment: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.slate50,
  },
  segBtnOn: {
    backgroundColor: theme.white,
    borderColor: theme.teal600,
  },
  segTxt: { fontSize: 11, fontWeight: '700', color: theme.slate600 },
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
    marginBottom: 18,
    lineHeight: 20,
  },
  lab: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.slate800,
    marginBottom: 6,
  },
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
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    backgroundColor: theme.slate50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.slate900,
    paddingVertical: 0,
  },
  button: {
    marginTop: 20,
    backgroundColor: theme.teal600,
    borderRadius: theme.radiusMd,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
