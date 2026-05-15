import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '@shared/firebase/authClient';
import { signInWithGoogle as signInWithGooglePopup } from '@shared/firebase/googleAuth';
import { isGoogleAuthCancelled, messageForGoogleAuthError } from '@shared/firebase/googleAuthErrors';
import { mergeUserProfileOnRegister } from '@shared/services/usersProfileService';

/** @typedef {{ email?: boolean, password?: boolean }} AuthFieldFlags */
/** @typedef {{ email?: string, password?: string }} AuthFieldMessages */

const emptyFieldState = () => ({
  errorFieldFlags    : null,
  errorFieldMessages : null,
});

const useAuthStore = create((set, get) => ({
  user    : null,
  loading : true,
  error   : null,
  /** Indique quels champs sont concernés (bordure / focus erreur). */
  errorFieldFlags    : /** @type {AuthFieldFlags | null} */ (null),
  /** Courtes explications sous chaque champ concerné. */
  errorFieldMessages : /** @type {AuthFieldMessages | null} */ (null),

  init: () => {
    const unsub = onAuthStateChanged(auth, (user) => {
      set({ user, loading: false });
    });

    void auth
      .authStateReady()
      .then(() => {
        set({ user: auth.currentUser, loading: false });
      })
      .catch(() => {
        set({ loading: false });
      });

    const safetyMs = 15000;
    const safetyId = setTimeout(() => {
      if (get().loading) {
        set({ loading: false });
      }
    }, safetyMs);

    return () => {
      clearTimeout(safetyId);
      unsub();
    };
  },

  login: async (email, password) => {
    set({ error: null, ...emptyFieldState() });
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      set({ user: cred.user, loading: false });
    } catch (err) {
      const code = err?.code || '';
      /** @type {Record<string, { msg: string, flags: AuthFieldFlags, hints?: AuthFieldMessages }>} */
      const map = {
        'auth/invalid-email': {
          msg   : 'Adresse e-mail invalide',
          flags : { email: true, password: false },
          hints : {
            email: 'Utilise un format du type nom@domaine.sn',
          },
        },
        'auth/missing-email': {
          msg   : 'Adresse e-mail manquante',
          flags : { email: true, password: false },
          hints : { email: 'Saisis une adresse e-mail complète.' },
        },
        'auth/user-not-found': {
          msg   : 'Aucun compte pour cette adresse e-mail',
          flags : { email: true, password: false },
          hints : {
            email: 'Vérifie l’orthographe ou crée un compte via l’onglet Inscription.',
          },
        },
        'auth/wrong-password': {
          msg   : 'Mot de passe incorrect',
          flags : { email: false, password: true },
          hints : {
            password: 'Mot de passe erroné. Tu peux utiliser « Mot de passe oublié ».',
          },
        },
        'auth/invalid-credential': {
          msg   : 'E-mail ou mot de passe incorrect',
          flags : { email: true, password: true },
          hints : {
            email    : 'Si tu n’as pas de compte, passe par Inscription.',
            password : 'Vérifie majuscules / minuscules et le bon mot de passe.',
          },
        },
        'auth/user-disabled': {
          msg   : 'Ce compte a été désactivé',
          flags : { email: true, password: false },
          hints : { email: 'Contacte l’administrateur de l’application.' },
        },
        'auth/too-many-requests': {
          msg   : 'Trop de tentatives, réessaie dans quelques minutes',
          flags : { email: true, password: true },
          hints : {
            email    : 'Connexion temporairement bloquée pour cette adresse.',
            password : 'Attends un peu avant une nouvelle tentative.',
          },
        },
        'auth/network-request-failed': {
          msg   : 'Erreur réseau',
          flags : { email: true, password: true },
          hints : {
            email    : 'Vérifie ta connexion Internet.',
            password : 'Vérifie ta connexion Internet.',
          },
        },
        'auth/invalid-api-key': {
          msg   : 'Configuration Firebase incorrecte (clé API)',
          flags : { email: false, password: false },
        },
        'auth/operation-not-allowed': {
          msg   : 'La connexion par e-mail / mot de passe n’est pas activée',
          flags : { email: false, password: false },
        },
      };

      const entry = map[code];
      if (entry) {
        set({
          error              : entry.msg,
          errorFieldFlags    : entry.flags,
          errorFieldMessages : entry.hints || null,
        });
        throw new Error(entry.msg, { cause: err });
      }

      const generic = code
        ? `Erreur de connexion (${code}). Réessaie ou contacte l’administrateur.`
        : 'Erreur de connexion inattendue.';
      set({
        error              : generic,
        errorFieldFlags    : { email: true, password: true },
        errorFieldMessages : {
          email    : 'Si le problème persiste, note le code affiché dans le message.',
          password : 'Si le problème persiste, note le code affiché dans le message.',
        },
      });
      throw new Error(generic, { cause: err });
    }
  },

  register: async (email, password, registrationProfile) => {
    set({ error: null, ...emptyFieldState() });
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (
        registrationProfile &&
        typeof registrationProfile.prenom === 'string' &&
        typeof registrationProfile.nom === 'string'
      ) {
        await mergeUserProfileOnRegister(cred.user.uid, cred.user.email || email, {
          prenom    : registrationProfile.prenom,
          nom       : registrationProfile.nom,
          nomElevage: registrationProfile.nomElevage,
        });
      }
      set({ user: cred.user, loading: false });
    } catch (err) {
      const code = err?.code || '';
      const map = {
        'auth/email-already-in-use': {
          msg   : 'Cette adresse e-mail est déjà utilisée',
          flags : { email: true, password: false },
          hints : { email: 'Connecte-toi avec cet e-mail ou choisis une autre adresse.' },
        },
        'auth/invalid-email': {
          msg   : 'Adresse e-mail invalide',
          flags : { email: true, password: false },
          hints : { email: 'Utilise un format du type nom@domaine.sn' },
        },
        'auth/weak-password': {
          msg   : 'Mot de passe trop faible',
          flags : { email: false, password: true },
          hints : { password: 'Au moins 6 caractères (exigence Firebase).' },
        },
        'auth/operation-not-allowed': {
          msg   : 'Inscription impossible : la méthode e-mail / mot de passe n’est pas autorisée',
          flags : { email: true, password: false },
          hints : {
            email:
              'Dans Firebase Console → Authentication → Sign-in method, active « E-mail / mot de passe » et l’inscription si besoin.',
          },
        },
        'auth/too-many-requests': {
          msg   : 'Trop de tentatives, réessaie plus tard',
          flags : { email: true, password: true },
          hints : {
            email    : 'La création de compte est temporairement limitée.',
            password : 'Attends quelques minutes avant de réessayer.',
          },
        },
        'auth/network-request-failed': {
          msg   : 'Erreur réseau, vérifie ta connexion',
          flags : { email: true, password: true },
          hints : {
            email    : 'Vérifie ta connexion Internet puis réessaie.',
            password : 'Vérifie ta connexion Internet puis réessaie.',
          },
        },
      };

      const entry = map[code];
      if (entry) {
        set({
          error              : entry.msg,
          errorFieldFlags    : entry.flags,
          errorFieldMessages : entry.hints || null,
        });
        throw new Error(entry.msg, { cause: err });
      }

      const generic = code
        ? `Impossible de créer le compte (${code}).`
        : 'Impossible de créer le compte.';
      set({
        error              : generic,
        errorFieldFlags    : { email: true, password: true },
        errorFieldMessages : {
          email    : 'Si le code d’erreur est inconnu, vérifie la configuration Firebase (.env) et la console du navigateur (F12).',
          password : 'Réessaie avec un autre mot de passe ou un autre e-mail selon le message ci-dessus.',
        },
      });
      throw new Error(generic, { cause: err });
    }
  },

  signInWithGoogle: async () => {
    set({ error: null, ...emptyFieldState() });
    try {
      const user = await signInWithGooglePopup();
      set({ user, loading: false });
      return user;
    } catch (err) {
      if (isGoogleAuthCancelled(err)) {
        set({ error: null, ...emptyFieldState() });
        return null;
      }
      const msg = messageForGoogleAuthError(err);
      set({
        error              : msg,
        errorFieldFlags    : null,
        errorFieldMessages : null,
      });
      throw new Error(msg, { cause: err });
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch {
      // Déconnexion locale même si l’appel réseau échoue (ex. hors ligne).
    } finally {
      set({
        user               : null,
        loading            : false,
        error              : null,
        ...emptyFieldState(),
      });
    }
  },

  clearError: () => set({ error: null, ...emptyFieldState() }),
}));

export default useAuthStore;
