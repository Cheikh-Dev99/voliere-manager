import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ChevronDown, Loader2, LogOut, Maximize2, PencilLine, Save, UserRound, X } from 'lucide-react'
import { useCages } from '@shared/hooks/useCages'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { ElevageStatsSection } from '../profile/ElevageStatsSection'
import { VoliereCodesPanel } from '../settings/VoliereCodesPanel'
import { updateUserProfile } from '@shared/services/usersProfileService'
import useAuthStore from '../../stores/authStore'
import { ThemeModeControl } from '../../theme/ThemeModeControl'

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
 * Menu profil colombophile + déconnexion (header).
 */
export function UserProfileMenu() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const email = user?.email ?? ''

  const { profile, loading: profileLoading } = useUserProfile(email)
  const { cages, loading: lc } = useCages()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [draftPrenom, setDraftPrenom] = useState('')
  const [draftNom, setDraftNom] = useState('')
  const [draftElevage, setDraftElevage] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!profile) return
    setDraftPrenom(profile.prenom ?? '')
    setDraftNom(profile.nom ?? '')
    setDraftElevage(profile.nomElevage ?? '')
  }, [profile])

  useEffect(() => {
    function onDocClick(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', onDocClick)
      document.addEventListener('keydown', onKey)
    }
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

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
      setOpen(false)
      await logout()
    } finally {
      setSigningOut(false)
    }
  }

  const inn = initials(profile?.prenom, profile?.nom, email)
  const nameLine = displayName(profile, email)
  const elevage = (profile?.nomElevage ?? '').trim() || 'Ma volière'

  return (
    <div className="relative flex min-w-0 shrink-0 max-w-[min(13rem,42vw)] sm:max-w-none sm:w-auto" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex w-full max-w-full items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 shadow-sm transition-colors hover:border-teal-200 hover:bg-teal-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-teal-500/40 dark:hover:bg-slate-700/60 dark:focus-visible:ring-offset-slate-900 sm:min-w-[12rem] sm:justify-start"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="user-profile-panel"
        id="user-profile-trigger"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-teal-700 text-xs font-bold text-white shadow-inner ring-2 ring-white dark:ring-slate-800"
            aria-hidden
          >
            {profileLoading ? <Loader2 className="size-4 animate-spin opacity-90" /> : inn}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-slate-900 dark:text-slate-50">{nameLine}</span>
            <span className="hidden max-w-full truncate text-xs font-normal text-slate-500 dark:text-slate-400 sm:block">{elevage}</span>
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id="user-profile-panel"
          role="dialog"
          aria-labelledby="user-profile-trigger"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(32rem,85vh)] w-[min(22rem,calc(100vw-1.5rem))] origin-top-right overflow-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/[0.06] dark:border-slate-600 dark:bg-slate-900 dark:shadow-black/40 dark:ring-white/10"
        >
          <div className="border-b border-slate-100 bg-gradient-to-br from-teal-600 via-teal-600 to-teal-700 px-4 py-4 text-white">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg font-bold shadow-inner ring-1 ring-white/20">
                  {inn}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold leading-snug">{nameLine}</p>
                  <p className="mt-0.5 truncate text-sm text-teal-100">{elevage}</p>
                  <p className="mt-2 truncate text-xs text-teal-200/95">{email}</p>
                </div>
              </div>
              <Link
                to="/profil"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg bg-white/15 p-2 text-white ring-1 ring-white/25 transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Ouvrir le profil en plein écran"
                title="Profil plein écran"
              >
                <Maximize2 className="size-4" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="space-y-3 px-3 py-3">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Mon élevage</p>
            <ElevageStatsSection
              cages={cages}
              cagesLoading={lc}
              profile={profile}
              variant="menu"
              maxTiles={4}
              onNavigate={() => setOpen(false)}
            />
          </div>

          <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-700">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Mes volières</p>
            <p className="mt-1 px-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Une <span className="font-medium text-slate-700 dark:text-slate-200">volière</span> est un bâtiment ou une zone ; dans l’app tu
              lui donnes un <span className="font-medium text-slate-700 dark:text-slate-200">nom court</span> (ex.{' '}
              <span className="font-medium text-slate-700 dark:text-slate-200">A</span>,{' '}
              <span className="font-medium text-slate-700 dark:text-slate-200">B</span>, <span className="font-medium text-slate-700 dark:text-slate-200">Nord</span>
              ) pour classer tes cages et te repérer dans les listes, même avant d’y mettre des cages.
            </p>
            {user?.uid ? (
              <div className="mt-2">
                <VoliereCodesPanel uid={user.uid} profile={profile} cages={cages} />
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-700">
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <PencilLine className="size-4 shrink-0 text-teal-700" aria-hidden />
                Modifier mes informations
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label htmlFor="prof-prenom" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Prénom
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden />
                    <input
                      id="prof-prenom"
                      value={draftPrenom}
                      onChange={(e) => setDraftPrenom(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      autoComplete="given-name"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="prof-nom" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Nom
                  </label>
                  <input
                    id="prof-nom"
                    value={draftNom}
                    onChange={(e) => setDraftNom(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    autoComplete="family-name"
                  />
                </div>
                <div>
                  <label htmlFor="prof-elevage" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Nom de la volière / élevage
                  </label>
                  <input
                    id="prof-elevage"
                    value={draftElevage}
                    onChange={(e) => setDraftElevage(e.target.value)}
                    placeholder="Ex. Volière Grand Yoff"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSaveProfile()}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
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
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <X className="size-4" aria-hidden />
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-700">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Apparence
            </p>
            <ThemeModeControl />
          </div>

          <div className="border-t border-slate-100 px-3 pb-3 dark:border-slate-700">
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={signingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-900 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-950/60"
            >
              <LogOut className="size-4 shrink-0 opacity-90" aria-hidden />
              {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
