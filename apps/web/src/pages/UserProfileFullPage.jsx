import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2, LogOut, PencilLine, Save, UserRound, X } from 'lucide-react'
import { useCages } from '@shared/hooks/useCages'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { ElevageStatsSection } from '../components/profile/ElevageStatsSection'
import { VoliereCodesPanel } from '../components/settings/VoliereCodesPanel'
import { updateUserProfile } from '@shared/services/usersProfileService'
import useAuthStore from '../stores/authStore'
import { ThemeHeaderToggle } from '../theme/ThemeHeaderToggle'

function initials(prenom, nom, email) {
  const p = (prenom ?? '').trim()
  const n = (nom ?? '').trim()
  if (p || n) {
    const a = p.charAt(0).toUpperCase()
    const b = n.charAt(0).toUpperCase()
    return (a + b).slice(0, 2) || a || '?'
  }
  const em = (email ?? '').trim()
  if (em.length >= 2) return em.slice(0, 2).toUpperCase()
  return '?'
}

function displayName(profile, email) {
  const p = (profile?.prenom ?? '').trim()
  const n = (profile?.nom ?? '').trim()
  if (p && n) return `${p} ${n}`
  if (p) return p
  if (n) return n
  const em = (email ?? '').split('@')[0]
  return em || 'Éleveur'
}

/**
 * Écran dédié : profil complet (hors panneau header), scroll vertical, retour vers l’app.
 */
export function UserProfileFullPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const email = user?.email ?? ''

  const { profile, loading: profileLoading } = useUserProfile(email)
  const { cages, loading: lc } = useCages()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [draftPrenom, setDraftPrenom] = useState('')
  const [draftNom, setDraftNom] = useState('')
  const [draftElevage, setDraftElevage] = useState('')

  useEffect(() => {
    if (!profile) return
    setDraftPrenom(profile.prenom ?? '')
    setDraftNom(profile.nom ?? '')
    setDraftElevage(profile.nomElevage ?? '')
  }, [profile])

  const handleSaveProfile = useCallback(async () => {
    if (!user?.uid) return
    setSaving(true)
    try {
      await updateUserProfile(user.uid, {
        prenom    : draftPrenom.trim(),
        nom       : draftNom.trim(),
        nomElevage: draftElevage.trim() || 'Ma volière',
      })
      toast.success('Profil enregistré')
      setEditing(false)
    } catch (e) {
      toast.error(e?.message ?? 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }, [user?.uid, draftPrenom, draftNom, draftElevage])

  async function handleLogout() {
    setSigningOut(true)
    try {
      await logout()
    } finally {
      setSigningOut(false)
    }
  }

  const inn = initials(profile?.prenom, profile?.nom, email)
  const nameLine = displayName(profile, email)
  const elevage = (profile?.nomElevage ?? '').trim() || 'Ma volière'

  return (
    <div className="flex min-h-dvh w-full max-w-none flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 w-full shrink-0 border-b border-slate-200/90 bg-white/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90 dark:border-slate-700 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/90 sm:px-6 lg:px-10">
        <div className="flex w-full items-center gap-3">
          <Link
            to="/"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            Retour
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-slate-900 dark:text-slate-50">Mon profil</h1>
          <ThemeHeaderToggle />
        </div>
      </header>

      <main className="flex w-full min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex w-full min-w-0 flex-1 flex-col bg-white shadow-none ring-0 dark:bg-slate-900">
          <div className="w-full bg-gradient-to-br from-teal-600 via-teal-600 to-teal-700 px-4 py-6 text-white sm:px-8 lg:px-12">
            <div className="flex w-full max-w-none items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl font-bold shadow-inner ring-1 ring-white/20">
                {profileLoading ? <Loader2 className="size-7 animate-spin opacity-90" aria-hidden /> : inn}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold leading-snug">{nameLine}</p>
                <p className="mt-1 text-sm text-teal-100">{elevage}</p>
                <p className="mt-2 break-all text-xs text-teal-200/95">{email}</p>
              </div>
            </div>
          </div>

          <div className="w-full space-y-4 border-b border-slate-100 px-4 py-6 sm:px-8 lg:px-12 dark:border-slate-700">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Mon élevage</p>
            <ElevageStatsSection cages={cages} cagesLoading={lc} profile={profile} variant="page" />
          </div>

          <div
            id="mes-volieres"
            className="scroll-mt-[4.5rem] w-full border-b border-slate-100 px-4 py-6 sm:px-8 lg:px-12"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Mes volières</p>
            <p className="mt-2 max-w-none text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Une <span className="font-medium text-slate-800 dark:text-slate-100">volière</span> est un bâtiment ou une zone ; dans l’app tu
              lui donnes un <span className="font-medium text-slate-800 dark:text-slate-100">nom court</span> (ex.{' '}
              <span className="font-medium text-slate-800 dark:text-slate-100">A</span>,{' '}
              <span className="font-medium text-slate-800 dark:text-slate-100">B</span>, <span className="font-medium text-slate-800 dark:text-slate-100">Nord</span>
              ) pour classer tes cages et te repérer dans les listes, même avant d’y mettre des cages.
            </p>
            {user?.uid ? (
              <div className="mt-4 w-full max-w-none">
                <VoliereCodesPanel uid={user.uid} profile={profile} cages={cages} />
              </div>
            ) : null}
          </div>

          <div className="w-full border-b border-slate-100 px-4 py-6 sm:px-8 lg:px-12">
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
              >
                <PencilLine className="size-4 shrink-0 text-teal-700" aria-hidden />
                Modifier mes informations
              </button>
            ) : (
              <div className="w-full space-y-4">
                <div>
                  <label htmlFor="full-prof-prenom" className="mb-1 block text-xs font-medium text-slate-600">
                    Prénom
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                    <input
                      id="full-prof-prenom"
                      value={draftPrenom}
                      onChange={(e) => setDraftPrenom(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25"
                      autoComplete="given-name"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="full-prof-nom" className="mb-1 block text-xs font-medium text-slate-600">
                    Nom
                  </label>
                  <input
                    id="full-prof-nom"
                    value={draftNom}
                    onChange={(e) => setDraftNom(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25"
                    autoComplete="family-name"
                  />
                </div>
                <div>
                  <label htmlFor="full-prof-elevage" className="mb-1 block text-xs font-medium text-slate-600">
                    Nom de la volière / élevage
                  </label>
                  <input
                    id="full-prof-elevage"
                    value={draftElevage}
                    onChange={(e) => setDraftElevage(e.target.value)}
                    placeholder="Ex. Volière Grand Yoff"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSaveProfile()}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Save className="size-4" aria-hidden />
                    )}
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false)
                      if (profile) {
                        setDraftPrenom(profile.prenom ?? '')
                        setDraftNom(profile.nom ?? '')
                        setDraftElevage(profile.nomElevage ?? '')
                      }
                    }}
                    className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <X className="size-4" aria-hidden />
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="w-full px-4 pb-10 pt-2 sm:px-8 lg:px-12">
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={signingOut}
              className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="size-4 shrink-0 opacity-90" aria-hidden />
              {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
