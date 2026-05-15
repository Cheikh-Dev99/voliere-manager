import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Egg,
  GitBranch,
  Heart,
  HeartCrack,
  History,
  LayoutGrid,
  MoveRight,
  ScrollText,
  Unlock,
  UserPlus,
  X,
} from 'lucide-react'
import { useReproductionsByCouple } from '@shared/hooks/useReproductionsByCouple'
import { getPigeonDisplayPhotoSrc } from '../../utils/localPigeonPhoto'
import { CageGenealogyView } from './CageGenealogyView'
import { vmElevation4, vmTransitionInteractive } from '../../theme/voliereMotionUi'

const CAGE_TAB_IDS = {
  detail: { tab: 'cage-tab-detail', panel: 'cage-tabpanel-detail' },
  genealogy: { tab: 'cage-tab-genealogy', panel: 'cage-tabpanel-genealogy' },
  reproductions: { tab: 'cage-tab-reproductions', panel: 'cage-tabpanel-reproductions' },
  history: { tab: 'cage-tab-history', panel: 'cage-tabpanel-history' },
}

function ageDepuisNaissance(ts) {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  const n = ts.toDate()
  const diff = Date.now() - n.getTime()
  const ans = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
  if (ans < 1) return '< 1 an'
  return `${ans} an${ans > 1 ? 's' : ''}`
}

function formatEventTime(ts) {
  if (!ts || typeof ts.toDate !== 'function') return ''
  try {
    return ts.toDate().toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function formatCalendarDate(ts) {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  try {
    return ts.toDate().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

const REASON_OPTIONS = [
  { value: '', label: 'Non précisé' },
  { value: 'VENTE', label: 'Vente / sortie définitive' },
  { value: 'AUTRE_CAGE', label: 'Autre cage (hors couple)' },
  { value: 'MISE_EN_COUPLE', label: 'Mise en couple ailleurs' },
  { value: 'SOIN', label: 'Soin / isolement' },
  { value: 'NETTOYAGE', label: 'Nettoyage / rotation' },
  { value: 'AUTRE', label: 'Autre (préciser ci-dessous)' },
]

function reasonDisplay(code, detail) {
  const hasDetail = Boolean(detail?.trim())
  const opt = code ? REASON_OPTIONS.find((o) => o.value === code) : null
  const base = opt?.label ?? null
  if (!base && !hasDetail) return null
  return (
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
      {base ? <span className="font-medium text-slate-600 dark:text-slate-300">{base}</span> : null}
      {detail?.trim() ? (
        <span className="mt-0.5 block italic text-slate-600 dark:text-slate-300">{detail.trim()}</span>
      ) : null}
    </p>
  )
}

const badgeCouple =
  'rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-100'
const badgePigeon =
  'rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-900 dark:bg-rose-950/45 dark:text-rose-100'
const badgeLibre =
  'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-100'

const PIGEON_STATUT_LABEL = {
  ACTIF: 'Actif',
  VENDU: 'Vendu',
  MORT: 'Mort',
  PERDU: 'Perdu',
}

/** Focus piège + fermeture Échap pour les modales plein écran. */
function useModalA11y(isOpen, onRequestClose) {
  const panelRef = useRef(null)
  useEffect(() => {
    if (!isOpen) return undefined
    const id = window.requestAnimationFrame(() => {
      panelRef.current?.focus()
    })
    const onKey = (e) => {
      if (e.key === 'Escape') onRequestClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.cancelAnimationFrame(id)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onRequestClose])
  return panelRef
}

/**
 * Panneau latéral — détail cage, affectations, libération (raison), déplacement, historique réel.
 */
export function CageDetailPanel({
  cage,
  pigeon,
  male,
  femelle,
  couple,
  occupancyEvents,
  occupancyLoading,
  occupancyError,
  onClose,
  onLibererWithReason,
  onMoveToCage,
  moveTargetCages,
  onAssignPigeon,
  onAssignCouple,
  onRompreCouple,
  pigeonById,
  pigeonsDisponibles,
  coupleOptions,
}) {
  const [pigeonPick, setPigeonPick] = useState('')
  const [couplePick, setCouplePick] = useState('')
  const [showPigeonModal, setShowPigeonModal] = useState(false)
  const [showCoupleModal, setShowCoupleModal] = useState(false)
  const [showLibererModal, setShowLibererModal] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [showRompreModal, setShowRompreModal] = useState(false)
  const [libReason, setLibReason] = useState('')
  const [libDetail, setLibDetail] = useState('')
  const [moveTargetId, setMoveTargetId] = useState('')
  const [moveReason, setMoveReason] = useState('')
  const [moveDetail, setMoveDetail] = useState('')
  const [pendingAction, setPendingAction] = useState(false)
  const [panelTab, setPanelTab] = useState('detail')
  const cageId = cage?.id ?? null
  const [panelTabCageId, setPanelTabCageId] = useState(cageId)
  if (cageId !== panelTabCageId) {
    setPanelTabCageId(cageId)
    setPanelTab('detail')
  }

  const showGenealogyTab =
    cage &&
    ((cage.statut === 'OCCUPE_PIGEON' && pigeon) ||
      (cage.statut === 'OCCUPE_COUPLE' && male && femelle))

  const showReproductionTab = Boolean(cage && cage.statut === 'OCCUPE_COUPLE' && couple)

  const { tab: tabPanelLabelledBy, panel: tabPanelId } =
    CAGE_TAB_IDS[panelTab] ?? CAGE_TAB_IDS.detail

  const { reproductions: coupleReproductions, loading: reproLoading, error: reproError } =
    useReproductionsByCouple(showReproductionTab ? couple?.id : null)

  const closeLibererModal = useCallback(() => {
    setShowLibererModal(false)
    setLibReason('')
    setLibDetail('')
  }, [])
  const closeMoveModal = useCallback(() => {
    setShowMoveModal(false)
    setMoveTargetId('')
    setMoveReason('')
    setMoveDetail('')
  }, [])
  const closeRompreModal = useCallback(() => setShowRompreModal(false), [])
  const closePigeonModal = useCallback(() => setShowPigeonModal(false), [])
  const closeCoupleModal = useCallback(() => setShowCoupleModal(false), [])

  const libererDialogRef = useModalA11y(showLibererModal, closeLibererModal)
  const moveDialogRef = useModalA11y(showMoveModal, closeMoveModal)
  const rompreDialogRef = useModalA11y(showRompreModal, closeRompreModal)
  const pigeonDialogRef = useModalA11y(showPigeonModal, closePigeonModal)
  const coupleDialogRef = useModalA11y(showCoupleModal, closeCoupleModal)

  if (!cage) return null

  const titre = `Cage ${cage.numero}`
  const pigeonPhotoSrc =
    cage.statut === 'OCCUPE_PIGEON' && pigeon ? getPigeonDisplayPhotoSrc(pigeon) : null

  const handleAssignPigeon = async () => {
    if (!pigeonPick) return
    try {
      await onAssignPigeon(pigeonPick)
      setShowPigeonModal(false)
      setPigeonPick('')
    } catch {
      /* toast côté parent */
    }
  }

  const handleAssignCouple = async () => {
    if (!couplePick) return
    try {
      await onAssignCouple(couplePick)
      setShowCoupleModal(false)
      setCouplePick('')
    } catch {
      /* toast côté parent */
    }
  }

  const handleConfirmLiberer = async () => {
    setPendingAction(true)
    try {
      await onLibererWithReason({
        reasonCode: libReason || null,
        reasonDetail: libDetail || null,
      })
      closeLibererModal()
    } catch {
      /* toast parent */
    } finally {
      setPendingAction(false)
    }
  }

  const occupantsHorsActif = []
  if (pigeon && pigeon.statut !== 'ACTIF') occupantsHorsActif.push(pigeon)
  if (male && male.statut !== 'ACTIF' && !occupantsHorsActif.some((p) => p.id === male.id)) {
    occupantsHorsActif.push(male)
  }
  if (femelle && femelle.statut !== 'ACTIF' && !occupantsHorsActif.some((p) => p.id === femelle.id)) {
    occupantsHorsActif.push(femelle)
  }

  const handleConfirmMove = async () => {
    if (!moveTargetId) return
    setPendingAction(true)
    try {
      await onMoveToCage(moveTargetId, {
        reasonCode: moveReason || null,
        reasonDetail: moveDetail || null,
      })
      closeMoveModal()
    } catch {
      /* toast parent */
    } finally {
      setPendingAction(false)
    }
  }

  const handleConfirmRompre = async () => {
    if (!onRompreCouple) return
    setPendingAction(true)
    try {
      await onRompreCouple()
      closeRompreModal()
    } catch {
      /* toast parent */
    } finally {
      setPendingAction(false)
    }
  }

  return (
    <>
      <aside
        className={`vm-panel-enter fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${vmElevation4} md:static md:max-w-sm md:shadow-none lg:max-w-md`}
      >
        <div className="shrink-0 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{titre}</h2>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 ${vmTransitionInteractive}`}
              aria-label="Fermer le panneau"
            >
              <X className="size-5" />
            </button>
          </div>
          {cage.description?.trim() ? (
            <div className="border-b border-slate-100 px-4 pb-3 dark:border-slate-700">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Description</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{cage.description.trim()}</p>
            </div>
          ) : null}
          <div className="px-3 pb-3" role="tablist" aria-label="Vue du panneau cage">
            <div className="pb-0.5">
              <div className="flex w-full gap-1 rounded-xl border border-slate-200/80 bg-slate-50/90 p-1 shadow-inner dark:border-slate-600 dark:bg-slate-800/90">
                <button
                  type="button"
                  role="tab"
                  aria-selected={panelTab === 'detail'}
                  id="cage-tab-detail"
                  aria-controls="cage-tabpanel-detail"
                  onClick={() => setPanelTab('detail')}
                  className={`flex min-h-11 min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 rounded-lg px-1.5 py-2 text-xs font-medium transition sm:gap-2 sm:px-2 sm:text-sm ${
                    panelTab === 'detail'
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600'
                      : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-100'
                  }`}
                >
                  <LayoutGrid className="size-4 shrink-0 opacity-80" aria-hidden />
                  <span className="min-w-0 truncate text-center">Cage</span>
                </button>
                {showGenealogyTab ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={panelTab === 'genealogy'}
                    id="cage-tab-genealogy"
                    aria-controls="cage-tabpanel-genealogy"
                    onClick={() => setPanelTab('genealogy')}
                    className={`flex min-h-11 min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 rounded-lg px-1.5 py-2 text-xs font-medium transition sm:gap-2 sm:px-2 sm:text-sm ${
                      panelTab === 'genealogy'
                        ? 'bg-white text-teal-900 shadow-sm ring-1 ring-teal-200/70 dark:bg-teal-950/50 dark:text-teal-100 dark:ring-teal-800'
                        : 'text-slate-600 hover:bg-white/60 hover:text-teal-900 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-teal-200'
                    }`}
                  >
                    <GitBranch className="size-4 shrink-0 opacity-90" aria-hidden />
                    <span className="min-w-0 truncate text-center">Généalogie</span>
                  </button>
                ) : null}
                {showReproductionTab ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={panelTab === 'reproductions'}
                    id="cage-tab-reproductions"
                    aria-controls="cage-tabpanel-reproductions"
                    onClick={() => setPanelTab('reproductions')}
                    className={`flex min-h-11 min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 rounded-lg px-1.5 py-2 text-xs font-medium transition sm:gap-2 sm:px-2 sm:text-sm ${
                      panelTab === 'reproductions'
                        ? 'bg-white text-teal-900 shadow-sm ring-1 ring-teal-200/70 dark:bg-teal-950/50 dark:text-teal-100 dark:ring-teal-800'
                        : 'text-slate-600 hover:bg-white/60 hover:text-teal-900 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-teal-200'
                    }`}
                  >
                    <Egg className="size-4 shrink-0 opacity-90" aria-hidden />
                    <span className="min-w-0 truncate text-center">Portées</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  role="tab"
                  aria-selected={panelTab === 'history'}
                  id="cage-tab-history"
                  aria-controls="cage-tabpanel-history"
                  onClick={() => setPanelTab('history')}
                  className={`flex min-h-11 min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 rounded-lg px-1.5 py-2 text-xs font-medium transition sm:gap-2 sm:px-2 sm:text-sm ${
                    panelTab === 'history'
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600'
                      : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-100'
                  }`}
                >
                  <History className="size-4 shrink-0 opacity-90" aria-hidden />
                  <span className="min-w-0 truncate text-center">Historique</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto px-3 py-3"
          id={tabPanelId}
          role="tabpanel"
          aria-labelledby={tabPanelLabelledBy}
        >
          {panelTab === 'reproductions' && showReproductionTab ? (
            <section className="mb-2" aria-label="Portées du couple dans cette cage">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <Egg className="size-4 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden />
                Reproductions
              </h3>
              <p className="mb-3 text-xs leading-snug text-slate-500 dark:text-slate-400">
                Portées enregistrées pour le couple assigné à cette cage (dates de ponte, œufs, jeunes).
              </p>
              <Link
                to={`/reproductions/nouveau?coupleId=${encodeURIComponent(couple.id)}`}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-teal-200 bg-teal-50 py-2.5 text-sm font-medium text-teal-900 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-900/50"
              >
                <Egg className="size-4 shrink-0" aria-hidden />
                Nouvelle reproduction (ce couple)
              </Link>
              {reproError ? (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{reproError}</p>
              ) : null}
              {reproLoading ? (
                <div className="space-y-2" aria-busy="true">
                  <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                  <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                </div>
              ) : coupleReproductions.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                  Aucune portée enregistrée pour ce couple. Tu peux créer une fiche depuis le bouton ci-dessus ou depuis
                  le menu Reproductions.
                </p>
              ) : (
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  {coupleReproductions.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2.5 shadow-sm dark:border-slate-600 dark:bg-slate-800/90"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Ponte · {formatCalendarDate(r.datePonte)}
                      </p>
                      <p className="mt-1 text-slate-900 dark:text-slate-100">
                        Œufs : <strong>{r.nombreOeufs}</strong> · Jeunes :{' '}
                        <strong>{r.nombrePigeonneaux}</strong>
                      </p>
                      {r.dateEclosion ? (
                        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                          Éclosion : {formatCalendarDate(r.dateEclosion)}
                        </p>
                      ) : null}
                      {r.notes?.trim() ? (
                        <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">{r.notes.trim()}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-center">
                <Link to="/reproductions" className="text-xs font-medium text-teal-700 underline hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-200">
                  Voir toutes les reproductions
                </Link>
              </p>
            </section>
          ) : null}

          {panelTab === 'genealogy' && showGenealogyTab ? (
            <section className="pb-2" aria-label="Arbre généalogique">
              <CageGenealogyView
                mode={cage.statut === 'OCCUPE_COUPLE' ? 'couple' : 'solo'}
                pigeon={pigeon}
                male={male}
                femelle={femelle}
                pigeonById={pigeonById}
              />
            </section>
          ) : null}

          {panelTab === 'history' ? (
            <section className="mb-2" aria-label="Historique des mouvements de la cage">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <History className="size-4" aria-hidden />
                Historique de la cage
              </h3>
              <p className="mb-3 text-xs leading-snug text-slate-500 dark:text-slate-400">
                Mouvements et affectations (pas le carnet santé). Aperçu des derniers événements (40 max). Ouvre l’écran
                dédié pour parcourir jusqu’à <strong>500 entrées</strong>, filtrer ou supprimer des lignes.
              </p>
              <Link
                to={`/cages/${cage.id}/historique`}
                state={{ back: { path: '/', label: 'Visualisation' } }}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <ScrollText className="size-4 shrink-0" aria-hidden />
                Afficher l’historique complet
              </Link>
              {occupancyError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{occupancyError}</p>
              ) : null}
              {occupancyLoading ? (
                <div className="space-y-2" aria-busy="true">
                  <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                  <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                </div>
              ) : occupancyEvents.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:bg-slate-800/80 dark:text-slate-300">
                  Aucun événement pour l’instant. Les affectations, libérations et déplacements apparaissent ici.
                </p>
              ) : (
                <ul
                  className="max-h-[min(55vh,22rem)] space-y-2 overflow-y-auto overflow-x-hidden pr-1 text-sm text-slate-600 dark:text-slate-300 scrollbar-gutter-stable"
                  aria-label="Liste des événements, faire défiler pour tout voir"
                >
                  {occupancyEvents.map((ev) => (
                    <li key={ev.id} className="rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/90">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {formatEventTime(ev.createdAt)}
                      </p>
                      <p className="text-slate-800 dark:text-slate-100">{ev.summary}</p>
                      {reasonDisplay(ev.reasonCode, ev.reasonDetail)}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {panelTab === 'detail' ? (
            <>
          {cage.statut === 'LIBRE' ? (
            <p className={`mb-4 inline-block ${badgeLibre}`}>Libre</p>
          ) : null}
          {cage.statut === 'OCCUPE_PIGEON' ? (
            <p className={`mb-4 inline-block ${badgePigeon}`}>Occupée (1 pigeon)</p>
          ) : null}
          {cage.statut === 'OCCUPE_COUPLE' ? (
            <p className={`mb-4 inline-block ${badgeCouple}`}>Occupée par un couple</p>
          ) : null}

          {occupantsHorsActif.length > 0 ? (
            <div
              className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100"
              role="status"
            >
              <p className="flex items-start gap-2 font-semibold">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
                Attention : occupant(s) sans statut « Actif »
              </p>
              <ul className="mt-2 list-inside list-disc text-xs leading-relaxed">
                {occupantsHorsActif.map((p) => (
                  <li key={p.id}>
                    {p.matricule} ({p.nom}) — {PIGEON_STATUT_LABEL[p.statut] ?? p.statut}. Mets à jour la fiche pigeon
                    ou libère la cage si la situation est terminée.
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {cage.statut === 'OCCUPE_PIGEON' && pigeon ? (
            <section className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Pigeon</h3>
              <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-800/80">
                {pigeonPhotoSrc ? (
                  <img
                    src={pigeonPhotoSrc}
                    alt=""
                    className="size-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-lg bg-slate-200 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                    Sans photo
                  </div>
                )}
                <div className="min-w-0 flex-1 text-sm">
                  <p className={`font-medium ${pigeon.sexe === 'MALE' ? 'text-sky-700 dark:text-sky-300' : 'text-pink-700 dark:text-pink-300'}`}>
                    {pigeon.sexe === 'MALE' ? 'Mâle' : 'Femelle'}
                  </p>
                  <p className="truncate text-slate-800 dark:text-slate-100">
                    <span className="text-slate-500 dark:text-slate-400">Matricule</span> {pigeon.matricule}
                  </p>
                  <p className="truncate text-slate-800 dark:text-slate-100">
                    <span className="text-slate-500 dark:text-slate-400">Nom</span> {pigeon.nom}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    <span className="text-slate-500 dark:text-slate-400">Race</span> {pigeon.race}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    <span className="text-slate-500 dark:text-slate-400">Âge</span> {ageDepuisNaissance(pigeon.dateNaissance)}
                  </p>
                  <p className="mt-2">
                    <Link
                      to={`/pigeons/${pigeon.id}/sante`}
                      state={{ back: { path: '/', label: 'Visualisation' } }}
                      className="text-xs font-medium text-teal-700 underline hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-200"
                    >
                      Ouvrir le carnet de santé
                    </Link>
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {cage.statut === 'OCCUPE_COUPLE' && male && femelle ? (
            <section className="mb-6 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pigeons</h3>
              {[
                { label: 'Mâle', p: male, cls: 'text-sky-700 dark:text-sky-300' },
                { label: 'Femelle', p: femelle, cls: 'text-pink-700 dark:text-pink-300' },
              ].map(({ label, p, cls }) => {
                const couplePhotoSrc = getPigeonDisplayPhotoSrc(p)
                return (
                <div
                  key={p.id}
                  className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-800/80"
                >
                  {couplePhotoSrc ? (
                    <img src={couplePhotoSrc} alt="" className="size-14 rounded-lg object-cover" />
                  ) : (
                    <div className="flex size-14 items-center justify-center rounded-lg bg-slate-200 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                      Sans photo
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className={`font-medium ${cls}`}>{label}</p>
                    <p className="truncate text-slate-800 dark:text-slate-100">
                      <span className="text-slate-500 dark:text-slate-400">Matricule</span> {p.matricule}
                    </p>
                    <p className="truncate text-slate-800 dark:text-slate-100">
                      <span className="text-slate-500 dark:text-slate-400">Nom</span> {p.nom}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Race</span> {p.race}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Âge</span> {ageDepuisNaissance(p.dateNaissance)}
                    </p>
                    <p className="mt-1">
                      <Link
                        to={`/pigeons/${p.id}/sante`}
                        state={{ back: { path: '/', label: 'Visualisation' } }}
                        className="text-xs font-medium text-teal-700 underline hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-200"
                      >
                        Carnet de santé
                      </Link>
                    </p>
                  </div>
                </div>
                )
              })}
              {couple?.notes?.trim() ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80 dark:text-amber-200">Notes du couple</p>
                  <p className="mt-1 whitespace-pre-wrap text-amber-950/90 dark:text-amber-50">{couple.notes}</p>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="space-y-2">
            <h3 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Actions</h3>
            {cage.statut === 'LIBRE' ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowPigeonModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-sky-500 py-2.5 text-sm font-medium text-sky-700 hover:bg-sky-50 dark:text-sky-200 dark:hover:bg-sky-950/40"
                >
                  <UserPlus className="size-4" aria-hidden />
                  Affecter un pigeon
                </button>
                <button
                  type="button"
                  onClick={() => setShowCoupleModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-500 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-950/35"
                >
                  <Heart className="size-4" aria-hidden />
                  Affecter un couple
                </button>
              </>
            ) : null}
            {cage.statut !== 'LIBRE' ? (
              <>
                {cage.statut === 'OCCUPE_COUPLE' && couple && onRompreCouple ? (
                  <button
                    type="button"
                    onClick={() => setShowRompreModal(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-600 bg-amber-50 py-2.5 text-sm font-medium text-amber-950 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/50"
                  >
                    <HeartCrack className="size-4 shrink-0" aria-hidden />
                    Rompre le couple
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowMoveModal(true)}
                  disabled={moveTargetCages.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-teal-500 py-2.5 text-sm font-medium text-teal-800 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-teal-200 dark:hover:bg-teal-950/40"
                >
                  <MoveRight className="size-4" aria-hidden />
                  Déplacer vers une autre cage
                </button>
                <button
                  type="button"
                  onClick={() => setShowLibererModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-rose-500 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-200 dark:hover:bg-rose-950/35"
                >
                  <Unlock className="size-4" aria-hidden />
                  Libérer la cage
                </button>
              </>
            ) : null}
          </section>
            </>
          ) : null}
        </div>
      </aside>

      {showLibererModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={closeLibererModal}
        >
          <div
            ref={libererDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="voliere-dialog-liberer-title"
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl border border-transparent bg-white p-4 shadow-xl outline-none dark:border-slate-600 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="voliere-dialog-liberer-title" className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Libérer la cage
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              La cage redeviendra libre. Tu peux indiquer une <strong>raison</strong> (facultatif) pour l’historique.
            </p>
            <label htmlFor="lib-reason" className="mt-4 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Motif
            </label>
            <select
              id="lib-reason"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={libReason}
              onChange={(e) => setLibReason(e.target.value)}
            >
              {REASON_OPTIONS.map((o) => (
                <option key={o.value || 'none'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <label htmlFor="lib-detail" className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Précision (optionnel)
            </label>
            <textarea
              id="lib-detail"
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={libDetail}
              onChange={(e) => setLibDetail(e.target.value)}
              placeholder="Ex. vendu à M. Dupont…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={closeLibererModal}>
                Annuler
              </button>
              <button
                type="button"
                disabled={pendingAction}
                className="rounded-lg bg-rose-600 px-4 py-2 font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                onClick={handleConfirmLiberer}
              >
                {pendingAction ? '…' : 'Confirmer la libération'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showMoveModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={closeMoveModal}
        >
          <div
            ref={moveDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="voliere-dialog-move-title"
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl border border-transparent bg-white p-4 shadow-xl outline-none dark:border-slate-600 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="voliere-dialog-move-title" className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Déplacer vers une autre cage
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choisis une cage <strong>libre</strong>. Le pigeon ou le couple sera basculé en une seule opération.</p>
            <label htmlFor="move-cage" className="mt-4 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Cage de destination
            </label>
            <select
              id="move-cage"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={moveTargetId}
              onChange={(e) => setMoveTargetId(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {moveTargetCages.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <label htmlFor="move-reason" className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Motif (optionnel)
            </label>
            <select
              id="move-reason"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={moveReason}
              onChange={(e) => setMoveReason(e.target.value)}
            >
              {REASON_OPTIONS.map((o) => (
                <option key={`m-${o.value || 'none'}`} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <label htmlFor="move-detail" className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Précision (optionnel)
            </label>
            <textarea
              id="move-detail"
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={moveDetail}
              onChange={(e) => setMoveDetail(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={closeMoveModal}>
                Annuler
              </button>
              <button
                type="button"
                disabled={pendingAction || !moveTargetId}
                className="rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                onClick={handleConfirmMove}
              >
                {pendingAction ? '…' : 'Déplacer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRompreModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={closeRompreModal}
        >
          <div
            ref={rompreDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="voliere-dialog-rompre-title"
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl border border-transparent bg-white p-4 shadow-xl outline-none dark:border-slate-600 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="voliere-dialog-rompre-title" className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Rompre le couple
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Le couple sera marqué comme rompu et cette cage sera libérée. Si le couple a été créé depuis l’app, chaque pigeon peut être replacé automatiquement dans la cage où il était seul avant la mise en couple, lorsque cette cage est encore disponible.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={closeRompreModal}>
                Annuler
              </button>
              <button
                type="button"
                disabled={pendingAction}
                className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-50"
                onClick={handleConfirmRompre}
              >
                {pendingAction ? '…' : 'Confirmer la rupture'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPigeonModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={closePigeonModal}
        >
          <div
            ref={pigeonDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="voliere-dialog-pigeon-title"
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl border border-transparent bg-white p-4 shadow-xl outline-none dark:border-slate-600 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="voliere-dialog-pigeon-title" className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Affecter un pigeon
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pigeons actifs non logés ailleurs.</p>
            <label htmlFor="voliere-pigeon-pick" className="sr-only">
              Choisir le pigeon
            </label>
            <select
              id="voliere-pigeon-pick"
              className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={pigeonPick}
              onChange={(e) => setPigeonPick(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {pigeonsDisponibles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.matricule} — {p.nom} ({p.sexe === 'MALE' ? 'M' : 'F'})
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={closePigeonModal}>
                Annuler
              </button>
              <button
                type="button"
                disabled={!pigeonPick}
                className="rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                onClick={handleAssignPigeon}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCoupleModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={closeCoupleModal}
        >
          <div
            ref={coupleDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="voliere-dialog-couple-title"
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl border border-transparent bg-white p-4 shadow-xl outline-none dark:border-slate-600 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="voliere-dialog-couple-title" className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Affecter un couple
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Couples actifs sans cage attribuée.</p>
            <label htmlFor="voliere-couple-pick" className="sr-only">
              Choisir le couple
            </label>
            <select
              id="voliere-couple-pick"
              className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={couplePick}
              onChange={(e) => setCouplePick(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {coupleOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={closeCoupleModal}>
                Annuler
              </button>
              <button
                type="button"
                disabled={!couplePick}
                className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                onClick={handleAssignCouple}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
