import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import toast from 'react-hot-toast'
import { AlertCircle, Building2, Eye, EyeOff, KeyRound, LayoutGrid, Lock, Mail, User, UserPlus } from 'lucide-react'
import { auth } from '@shared/firebase/authClient'
import useAuthStore from '../stores/authStore'
import logoUrl from '../assets/logo.png'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'
import { AuthDivider, GoogleSignInButton } from '../components/auth/GoogleSignInButton'
import { SiteBackgroundDecor } from '../components/layout/SiteBackgroundDecor'
import { resolvePostAuthPath } from '../router/postAuthRedirect'

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 pl-9 text-sm text-slate-900 shadow-inner transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/25 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:bg-slate-900'

const inputInvalidClass =
  'border-red-400 bg-red-50/50 focus:border-red-500 focus:ring-red-500/25 dark:border-red-500 dark:bg-red-950/30 dark:focus:border-red-400'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(value) {
  return EMAIL_RE.test(value.trim())
}

/** URL de retour après clic sur le lien dans l’e-mail — le domaine doit être dans Firebase → Domaines autorisés. */
function passwordResetActionCodeSettings() {
  if (typeof window === 'undefined') return undefined
  return {
    url         : `${window.location.origin}/login`,
    handleCodeInApp: false,
  }
}

export function LoginPage() {
  const error = useAuthStore((s) => s.error)
  const errorFieldFlags = useAuthStore((s) => s.errorFieldFlags)
  const errorFieldMessages = useAuthStore((s) => s.errorFieldMessages)
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const clearError = useAuthStore((s) => s.clearError)
  const loading = useAuthStore((s) => s.loading)
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [regPrenom, setRegPrenom] = useState('')
  const [regNom, setRegNom] = useState('')
  const [regNomVoliere, setRegNomVoliere] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [loginIssues, setLoginIssues] = useState(() => (/** @type {{ email?: string; password?: string }} */ ({})))
  const [regIssues, setRegIssues] = useState(
    () => (/** @type {{ email?: string; password?: string; confirm?: string; prenom?: string; nom?: string }} */ ({})),
  )
  const [forgotIssues, setForgotIssues] = useState(() => (/** @type {{ email?: string }} */ ({})))
  const [forgotSent, setForgotSent] = useState(false)

  const switchMode = (next) => {
    setMode(next)
    clearError()
    setLoginIssues({})
    setRegIssues({})
    setForgotIssues({})
    setForgotSent(false)
    setRegPrenom('')
    setRegNom('')
    setRegNomVoliere('')
    setPassword('')
    setRegPassword('')
    setRegConfirm('')
    setShowPassword(false)
    setShowRegPassword(false)
  }

  const handleGoogleSignIn = async () => {
    clearError()
    setGoogleBusy(true)
    try {
      const user = await signInWithGoogle()
      if (!user) return
      toast.success('Connexion Google réussie')
      navigate(resolvePostAuthPath(location.state?.from?.pathname), { replace: true })
    } catch (err) {
      toast.error(err?.message || 'Connexion Google impossible')
    } finally {
      setGoogleBusy(false)
    }
  }

  const authBusy = submitting || googleBusy

  const handleSubmitLogin = async (e) => {
    e.preventDefault()
    clearError()
    setLoginIssues({})
    const em = email.trim()
    if (!em) {
      setLoginIssues({ email: 'L’adresse e-mail est obligatoire pour te connecter.' })
      return
    }
    if (!isValidEmail(em)) {
      setLoginIssues({ email: 'Ce format d’e-mail n’est pas valide (ex. nom@domaine.sn).' })
      return
    }
    if (!password) {
      setLoginIssues({ password: 'Saisis ton mot de passe.' })
      return
    }
    setSubmitting(true)
    try {
      await login(em, password)
      toast.success('Connexion réussie')
      navigate(resolvePostAuthPath(location.state?.from?.pathname), { replace: true })
    } catch (err) {
      toast.error(err?.message || 'Échec de la connexion')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitRegister = async (e) => {
    e.preventDefault()
    clearError()
    setRegIssues({})
    const em = email.trim()
    const prenom = regPrenom.trim()
    const nom = regNom.trim()
    if (!prenom) {
      setRegIssues({ prenom: 'Le prénom est obligatoire.' })
      return
    }
    if (!nom) {
      setRegIssues({ nom: 'Le nom est obligatoire.' })
      return
    }
    if (!em) {
      setRegIssues({ email: 'L’adresse e-mail est obligatoire.' })
      return
    }
    if (!isValidEmail(em)) {
      setRegIssues({ email: 'Ce format d’e-mail n’est pas valide (ex. nom@domaine.sn).' })
      return
    }
    if (!regPassword) {
      setRegIssues({ password: 'Choisis un mot de passe.' })
      return
    }
    if (regPassword.length < 6) {
      setRegIssues({ password: 'Le mot de passe doit contenir au moins 6 caractères.' })
      return
    }
    if (regPassword !== regConfirm) {
      setRegIssues({ confirm: 'Les deux mots de passe doivent être identiques.' })
      return
    }
    setSubmitting(true)
    try {
      await register(em, regPassword, {
        prenom,
        nom,
        nomElevage: regNomVoliere.trim() || undefined,
      })
      toast.success('Compte créé — tu es connecté.')
      navigate(resolvePostAuthPath(location.state?.from?.pathname), { replace: true })
    } catch (err) {
      toast.error(err?.message || 'Inscription impossible')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitForgot = async (e) => {
    e.preventDefault()
    setForgotIssues({})
    setForgotSent(false)
    const trimmed = email.trim()
    if (!trimmed) {
      setForgotIssues({ email: 'Indique l’adresse e-mail de ton compte.' })
      return
    }
    if (!isValidEmail(trimmed)) {
      setForgotIssues({ email: 'Ce format d’e-mail n’est pas valide (ex. nom@domaine.sn).' })
      return
    }
    setResetting(true)
    try {
      const action = passwordResetActionCodeSettings()
      try {
        await sendPasswordResetEmail(auth, trimmed, action)
      } catch (firstErr) {
        if (firstErr?.code === 'auth/unauthorized-continue-uri') {
          await sendPasswordResetEmail(auth, trimmed)
          toast(
            'Lien de retour désactivé : ajoute ton domaine dans Firebase → Authentication → Domaines autorisés pour activer la redirection vers la page de connexion.',
            { duration: 8000, icon: 'ℹ️' },
          )
        } else {
          throw firstErr
        }
      }
      setForgotSent(true)
      toast.success(
        'Si un compte correspond à cette adresse, tu recevras un e-mail pour choisir un nouveau mot de passe.',
        { duration: 6500 },
      )
    } catch (err) {
      const code = err?.code
      if (code === 'auth/invalid-email') {
        setForgotIssues({ email: 'Adresse e-mail invalide.' })
      } else if (code === 'auth/too-many-requests') {
        setForgotIssues({ email: 'Trop de demandes. Réessaie dans quelques minutes.' })
      } else if (code === 'auth/user-not-found') {
        setForgotIssues({
          email: 'Aucun compte avec cette adresse. Vérifie l’orthographe ou crée un compte via Inscription.',
        })
      } else if (code === 'auth/unauthorized-continue-uri') {
        setForgotIssues({
          email:
            `L’URL de retour n’est pas autorisée. Dans Firebase Console → Authentication → Paramètres → Domaines autorisés, ajoute : ${typeof window !== 'undefined' ? window.location.host : 'ton-domaine'}`,
        })
      } else {
        setForgotIssues({ email: 'Impossible d’envoyer l’e-mail. Réessaie plus tard ou vérifie ta connexion.' })
      }
    } finally {
      setResetting(false)
    }
  }

  const isLogin = mode === 'login'
  const isForgot = mode === 'forgot'

  const loginEmailInvalid = !!(loginIssues.email || errorFieldFlags?.email)
  const loginPasswordInvalid = !!(loginIssues.password || errorFieldFlags?.password)
  const loginEmailHelp = loginIssues.email || errorFieldMessages?.email
  const loginPasswordHelp = loginIssues.password || errorFieldMessages?.password

  const regEmailInvalid = !!(regIssues.email || errorFieldFlags?.email)
  const regPasswordInvalid = !!(regIssues.password || errorFieldFlags?.password)
  const regConfirmInvalid = !!regIssues.confirm
  const regPrenomInvalid = !!regIssues.prenom
  const regNomInvalid = !!regIssues.nom
  const regEmailHelp = regIssues.email || errorFieldMessages?.email
  const regPasswordHelp = regIssues.password || errorFieldMessages?.password

  const forgotEmailInvalid = !!forgotIssues.email
  const forgotEmailHelp = forgotIssues.email

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-teal-50/40 px-4 py-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 sm:py-8">
      <SiteBackgroundDecor />
      <div className="relative z-[1] w-full max-w-md">
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200/40 backdrop-blur-sm dark:border-slate-600/80 dark:bg-slate-900/95 dark:shadow-black/40 dark:ring-slate-700/50 sm:p-5">
          <div className="px-0.5 pb-2" role="tablist" aria-label="Connexion, inscription ou réinitialisation du mot de passe">
            <div className="grid grid-cols-3 gap-0.5 rounded-lg border border-slate-200/80 bg-slate-50/90 p-0.5 shadow-inner dark:border-slate-600/80 dark:bg-slate-800/90 sm:flex sm:flex-wrap sm:gap-0.5">
              <button
                type="button"
                role="tab"
                aria-selected={isLogin}
                id="auth-tab-login"
                onClick={() => switchMode('login')}
                className={`flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-xs font-medium transition sm:gap-1.5 sm:px-2 sm:text-sm ${
                  isLogin
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-700 dark:text-slate-50 dark:ring-slate-500/60'
                    : 'text-slate-600 hover:bg-white/60 dark:text-slate-400 dark:hover:bg-slate-700/60'
                }`}
              >
                <LayoutGrid className="size-3.5 shrink-0 opacity-80 sm:size-4" aria-hidden />
                <span className="truncate">Connexion</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                id="auth-tab-register"
                onClick={() => switchMode('register')}
                className={`flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-xs font-medium transition sm:gap-1.5 sm:px-2 sm:text-sm ${
                  mode === 'register'
                    ? 'bg-white text-teal-900 shadow-sm ring-1 ring-teal-200/70 dark:bg-slate-700 dark:text-teal-100 dark:ring-teal-600/50'
                    : 'text-slate-600 hover:bg-white/60 hover:text-teal-900 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-teal-200'
                }`}
              >
                <UserPlus className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                <span className="truncate">Inscription</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isForgot}
                id="auth-tab-forgot"
                aria-label="Mot de passe oublié"
                title="Mot de passe oublié"
                onClick={() => switchMode('forgot')}
                className={`flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-xs font-medium transition sm:gap-1.5 sm:px-2 sm:text-sm ${
                  isForgot
                    ? 'bg-white text-amber-900 shadow-sm ring-1 ring-amber-200/80 dark:bg-slate-700 dark:text-amber-100 dark:ring-amber-700/50'
                    : 'text-slate-600 hover:bg-white/60 hover:text-amber-900 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-amber-200'
                }`}
              >
                <KeyRound className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                <span className="truncate sm:hidden">Oublié</span>
                <span className="hidden truncate sm:inline">Mot de passe oublié</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            <img
              src={logoUrl}
              alt="Volière Manager"
              className="h-20 w-auto sm:h-24"
              decoding="async"
              fetchPriority="high"
            />
            <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              {isLogin ? 'Connexion' : isForgot ? 'Mot de passe oublié' : 'Créer un compte'}
            </h1>
            <p className="mt-1 max-w-sm text-xs leading-snug text-slate-600 dark:text-slate-300 sm:text-sm">
              {isLogin
                ? 'Connecte-toi pour accéder à ta volière.'
                : isForgot
                  ? 'Indique l’e-mail de ton compte : nous t’envoyons un lien pour définir un nouveau mot de passe.'
                  : ''}
            </p>
            {loading ? (
              <AppLoadingScreen variant="inline" message="" />
            ) : null}
          </div>

          {error ? (
            <div
              id="auth-error"
              className="mt-3 flex gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-left shadow-sm"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
              <p className="text-sm font-medium leading-snug text-red-900">{error}</p>
            </div>
          ) : null}

          {isLogin ? (
            <>
            <div className="mt-4">
              <GoogleSignInButton
                onClick={handleGoogleSignIn}
                busy={googleBusy}
                disabled={authBusy}
              />
              <AuthDivider />
            </div>
            <form className="space-y-3" onSubmit={handleSubmitLogin} noValidate>
              <div>
                <label
                  htmlFor="auth-email"
                  className={`mb-1 flex items-center gap-1 text-xs font-medium sm:text-sm ${loginEmailInvalid ? 'text-red-800' : 'text-slate-700'}`}
                >
                  {loginEmailInvalid ? <AlertCircle className="size-3.5 shrink-0 text-red-600" aria-hidden /> : null}
                  E-mail
                </label>
                <div className="relative">
                  <Mail
                    className={`pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 ${loginEmailInvalid ? 'text-red-400' : 'text-slate-400'}`}
                    aria-hidden
                  />
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setLoginIssues((p) => {
                        const n = { ...p }
                        delete n.email
                        return n
                      })
                      if (error) clearError()
                    }}
                    placeholder="exemple@domaine.sn"
                    className={`${inputClass} ${loginEmailInvalid ? inputInvalidClass : ''}`}
                    aria-invalid={loginEmailInvalid ? 'true' : 'false'}
                    aria-describedby={
                      [loginEmailHelp ? 'login-email-desc' : '', error ? 'auth-error' : ''].filter(Boolean).join(' ') ||
                      undefined
                    }
                  />
                </div>
                {loginEmailHelp ? (
                  <p id="login-email-desc" className="mt-1 flex items-start gap-1.5 text-xs text-red-700">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0 opacity-90" aria-hidden />
                    <span>{loginEmailHelp}</span>
                  </p>
                ) : null}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label
                    htmlFor="auth-password"
                    className={`flex items-center gap-1 text-xs font-medium sm:text-sm ${loginPasswordInvalid ? 'text-red-800' : 'text-slate-700'}`}
                  >
                    {loginPasswordInvalid ? <AlertCircle className="size-3.5 shrink-0 text-red-600" aria-hidden /> : null}
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    disabled={submitting}
                    className="shrink-0 text-xs font-medium text-teal-700 underline-offset-2 hover:text-teal-900 hover:underline disabled:opacity-50"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    className={`pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 ${loginPasswordInvalid ? 'text-red-400' : 'text-slate-400'}`}
                    aria-hidden
                  />
                  <input
                    id="auth-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setLoginIssues((p) => {
                        const n = { ...p }
                        delete n.password
                        return n
                      })
                      if (error) clearError()
                    }}
                    className={`${inputClass} pr-10 ${loginPasswordInvalid ? inputInvalidClass : ''}`}
                    aria-invalid={loginPasswordInvalid ? 'true' : 'false'}
                    aria-describedby={
                      [loginPasswordHelp ? 'login-password-desc' : '', error ? 'auth-error' : ''].filter(Boolean).join(' ') ||
                      undefined
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
                  </button>
                </div>
                {loginPasswordHelp ? (
                  <p id="login-password-desc" className="mt-1 flex items-start gap-1.5 text-xs text-red-700">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0 opacity-90" aria-hidden />
                    <span>{loginPasswordHelp}</span>
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={authBusy}
                aria-busy={submitting}
                title={submitting ? 'Connexion en cours…' : undefined}
                className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-900/15 transition hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Connexion en cours…' : 'Se connecter'}
              </button>
            </form>
            </>
          ) : isForgot ? (
            <form className="mt-4 space-y-3" onSubmit={handleSubmitForgot} noValidate>
              {forgotSent ? (
                <>
                </>
              ) : null}
              <div>
                <label
                  htmlFor="forgot-email"
                  className={`mb-1 flex items-center gap-1 text-xs font-medium sm:text-sm ${forgotEmailInvalid ? 'text-red-800' : 'text-slate-700'}`}
                >
                  {forgotEmailInvalid ? <AlertCircle className="size-3.5 shrink-0 text-red-600" aria-hidden /> : null}
                  E-mail du compte
                </label>
                <div className="relative">
                  <Mail
                    className={`pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 ${forgotEmailInvalid ? 'text-red-400' : 'text-slate-400'}`}
                    aria-hidden
                  />
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setForgotIssues((p) => {
                        const n = { ...p }
                        delete n.email
                        return n
                      })
                      setForgotSent(false)
                    }}
                    placeholder="exemple@domaine.sn"
                    className={`${inputClass} ${forgotEmailInvalid ? inputInvalidClass : ''}`}
                    aria-invalid={forgotEmailInvalid ? 'true' : 'false'}
                    aria-describedby={forgotEmailHelp ? 'forgot-email-desc' : undefined}
                  />
                </div>
                {forgotEmailHelp ? (
                  <p id="forgot-email-desc" className="mt-1 flex items-start gap-1.5 text-xs text-red-700">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0 opacity-90" aria-hidden />
                    <span>{forgotEmailHelp}</span>
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={resetting}
                aria-busy={resetting}
                className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-900/15 transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resetting ? 'Envoi en cours…' : 'Envoyer le lien de réinitialisation'}
              </button>

              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Retour à la connexion
              </button>
            </form>
          ) : (
            <>
            <div className="mt-4">
              <GoogleSignInButton
                onClick={handleGoogleSignIn}
                busy={googleBusy}
                disabled={authBusy}
                label="S’inscrire avec Google"
              />
              <AuthDivider />
            </div>
            <form className="space-y-3" onSubmit={handleSubmitRegister} noValidate>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-prenom"
                    className={`mb-1 flex items-center gap-1 text-xs font-medium sm:text-sm ${regPrenomInvalid ? 'text-red-800' : 'text-slate-700'}`}
                  >
                    {regPrenomInvalid ? <AlertCircle className="size-3.5 shrink-0 text-red-600" aria-hidden /> : null}
                    Prénom
                  </label>
                  <div className="relative">
                    <User
                      className={`pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 ${regPrenomInvalid ? 'text-red-400' : 'text-slate-400'}`}
                      aria-hidden
                    />
                    <input
                      id="reg-prenom"
                      name="givenName"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={regPrenom}
                      onChange={(e) => {
                        setRegPrenom(e.target.value)
                        setRegIssues((p) => {
                          const n = { ...p }
                          delete n.prenom
                          return n
                        })
                        if (error) clearError()
                      }}
                      placeholder="Prénom"
                      maxLength={80}
                      className={`${inputClass} ${regPrenomInvalid ? inputInvalidClass : ''}`}
                      aria-invalid={regPrenomInvalid ? 'true' : 'false'}
                      aria-describedby={regIssues.prenom ? 'reg-prenom-desc' : undefined}
                    />
                  </div>
                  {regIssues.prenom ? (
                    <p id="reg-prenom-desc" className="mt-1 flex items-start gap-1.5 text-xs text-red-700">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 opacity-90" aria-hidden />
                      <span>{regIssues.prenom}</span>
                    </p>
                  ) : null}
                </div>
                <div>
                  <label
                    htmlFor="reg-nom"
                    className={`mb-1 flex items-center gap-1 text-xs font-medium sm:text-sm ${regNomInvalid ? 'text-red-800' : 'text-slate-700'}`}
                  >
                    {regNomInvalid ? <AlertCircle className="size-3.5 shrink-0 text-red-600" aria-hidden /> : null}
                    Nom
                  </label>
                  <div className="relative">
                    <User
                      className={`pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 ${regNomInvalid ? 'text-red-400' : 'text-slate-400'}`}
                      aria-hidden
                    />
                    <input
                      id="reg-nom"
                      name="familyName"
                      type="text"
                      autoComplete="family-name"
                      required
                      value={regNom}
                      onChange={(e) => {
                        setRegNom(e.target.value)
                        setRegIssues((p) => {
                          const n = { ...p }
                          delete n.nom
                          return n
                        })
                        if (error) clearError()
                      }}
                      placeholder="Nom"
                      maxLength={80}
                      className={`${inputClass} ${regNomInvalid ? inputInvalidClass : ''}`}
                      aria-invalid={regNomInvalid ? 'true' : 'false'}
                      aria-describedby={regIssues.nom ? 'reg-nom-desc' : undefined}
                    />
                  </div>
                  {regIssues.nom ? (
                    <p id="reg-nom-desc" className="mt-1 flex items-start gap-1.5 text-xs text-red-700">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 opacity-90" aria-hidden />
                      <span>{regIssues.nom}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <label htmlFor="reg-nom-voliere" className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-700 sm:text-sm">
                  Nom de la volière <span className="font-normal text-slate-500">(optionnel)</span>
                </label>
                <div className="relative">
                  <Building2
                    className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    id="reg-nom-voliere"
                    name="organization"
                    type="text"
                    autoComplete="organization"
                    value={regNomVoliere}
                    onChange={(e) => setRegNomVoliere(e.target.value)}
                    placeholder="Ex. Élevage de la Médina"
                    maxLength={120}
                    className={inputClass}
                  />
                </div>
                <p className="mt-1 text-xs leading-snug text-slate-500">
                  Nom affiché pour ton élevage. Si tu laisses vide, « Ma volière » sera utilisé par défaut.
                </p>
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className={`mb-1 flex items-center gap-1 text-xs font-medium sm:text-sm ${regEmailInvalid ? 'text-red-800' : 'text-slate-700'}`}
                >
                  {regEmailInvalid ? <AlertCircle className="size-3.5 shrink-0 text-red-600" aria-hidden /> : null}
                  E-mail
                </label>
                <div className="relative">
                  <Mail
                    className={`pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 ${regEmailInvalid ? 'text-red-400' : 'text-slate-400'}`}
                    aria-hidden
                  />
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setRegIssues((p) => {
                        const n = { ...p }
                        delete n.email
                        return n
                      })
                      if (error) clearError()
                    }}
                    placeholder="exemple@domaine.sn"
                    className={`${inputClass} ${regEmailInvalid ? inputInvalidClass : ''}`}
                    aria-invalid={regEmailInvalid ? 'true' : 'false'}
                    aria-describedby={
                      [regEmailHelp ? 'reg-email-desc' : '', error ? 'auth-error' : ''].filter(Boolean).join(' ') || undefined
                    }
                  />
                </div>
                {regEmailHelp ? (
                  <p id="reg-email-desc" className="mt-1 flex items-start gap-1.5 text-xs text-red-700">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0 opacity-90" aria-hidden />
                    <span>{regEmailHelp}</span>
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-password"
                    className={`mb-1 flex items-center gap-1 text-xs font-medium sm:text-sm ${regPasswordInvalid ? 'text-red-800' : 'text-slate-700'}`}
                  >
                    {regPasswordInvalid ? <AlertCircle className="size-3.5 shrink-0 text-red-600" aria-hidden /> : null}
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock
                      className={`pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 ${regPasswordInvalid ? 'text-red-400' : 'text-slate-400'}`}
                      aria-hidden
                    />
                    <input
                      id="reg-password"
                      name="password"
                      type={showRegPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value)
                        setRegIssues((p) => {
                          const n = { ...p }
                          delete n.password
                          return n
                        })
                        if (error) clearError()
                      }}
                      placeholder="6 caractères min."
                      className={`${inputClass} pr-10 ${regPasswordInvalid ? inputInvalidClass : ''}`}
                      aria-describedby={
                        ['reg-password-hint', regPasswordHelp ? 'reg-password-desc' : '', error ? 'auth-error' : '']
                          .filter(Boolean)
                          .join(' ') || undefined
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword((v) => !v)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                      aria-pressed={showRegPassword}
                      aria-label={showRegPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showRegPassword ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
                    </button>
                  </div>
                  <span id="reg-password-hint" className="sr-only">
                    Le mot de passe doit contenir au moins 6 caractères.
                  </span>
                  {regPasswordHelp ? (
                    <p id="reg-password-desc" className="mt-1 flex items-start gap-1.5 text-xs text-red-700">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 opacity-90" aria-hidden />
                      <span>{regPasswordHelp}</span>
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="reg-confirm"
                    className={`mb-1 flex items-center gap-1 text-xs font-medium sm:text-sm ${regConfirmInvalid ? 'text-red-800' : 'text-slate-700'}`}
                  >
                    {regConfirmInvalid ? <AlertCircle className="size-3.5 shrink-0 text-red-600" aria-hidden /> : null}
                    Confirmation
                  </label>
                  <div className="relative">
                    <Lock
                      className={`pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 ${regConfirmInvalid ? 'text-red-400' : 'text-slate-400'}`}
                      aria-hidden
                    />
                    <input
                      id="reg-confirm"
                      name="passwordConfirm"
                      type={showRegPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={regConfirm}
                      onChange={(e) => {
                        setRegConfirm(e.target.value)
                        setRegIssues((p) => {
                          const n = { ...p }
                          delete n.confirm
                          return n
                        })
                        if (error) clearError()
                      }}
                      placeholder="Retaper le mot de passe"
                      className={`${inputClass} pr-10 ${regConfirmInvalid ? inputInvalidClass : ''}`}
                      aria-invalid={regConfirmInvalid ? 'true' : 'false'}
                      aria-describedby={
                        [regIssues.confirm ? 'reg-confirm-desc' : '', error ? 'auth-error' : ''].filter(Boolean).join(' ') ||
                        undefined
                      }
                    />
                  </div>
                  {regIssues.confirm ? (
                    <p id="reg-confirm-desc" className="mt-1 flex items-start gap-1.5 text-xs text-red-700">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 opacity-90" aria-hidden />
                      <span>{regIssues.confirm}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <button
                type="submit"
                disabled={authBusy}
                aria-busy={submitting}
                title={submitting ? 'Création du compte…' : undefined}
                className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-900/15 transition hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Création du compte…' : 'Créer mon compte'}
              </button>
            </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
