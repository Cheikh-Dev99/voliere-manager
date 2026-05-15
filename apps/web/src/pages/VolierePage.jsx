import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  FilterX,
  GripVertical,
  Home,
  LayoutGrid,
  List as ListIcon,
  Search,
  Plus,
} from 'lucide-react'
import { useCages } from '@shared/hooks/useCages'
import { usePigeons } from '@shared/hooks/usePigeons'
import { useCouples } from '@shared/hooks/useCouples'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { mergeProfileVoliereCodesWithCages } from '@shared/utils/voliereCodesMerge'
import { useCageHistory } from '@shared/hooks/useCageHistory'
import {
  affecterPigeonACage,
  affecterCoupleACage,
  libererCage,
  deplacerPigeonVersCage,
  deplacerCoupleVersCage,
} from '@shared/services/cagesService'
import { creerCoupleParGlissement, rompreCouple } from '@shared/services/couplesService'
import { VoliereGrid } from '../features/voliere/VoliereGrid'
import { CageDetailPanel } from '../features/voliere/CageDetailPanel'
import { CageDescriptionTooltip } from '../features/voliere/CageDescriptionTooltip'
import {
  dmDataTableHeader,
  dmDataTableSub,
  dmDataTableTitle,
  dmTableClass,
  dmTableWrap,
  dmThead,
  dmTbody,
} from '../theme/voliereDarkUi'
import {
  cageMatchesQuery,
  compareCages,
  occupantPigeons,
} from '@shared/utils/voliereCageList'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'
import useAuthStore from '../stores/authStore'

const LS_VOLIERE_VISU = 'voliere-manager:voliere-visualisation-prefs'

function readVoliereVisuPrefs() {
  try {
    const raw = localStorage.getItem(LS_VOLIERE_VISU)
    if (!raw) {
      return { voliereCode: 'A', vue: 'grid', sortBy: 'numero', sortDir: 'asc' }
    }
    const o = JSON.parse(raw)
    return {
      voliereCode: typeof o.voliereCode === 'string' && o.voliereCode.length ? o.voliereCode : 'A',
      vue: o.vue === 'list' ? 'list' : 'grid',
      sortBy: ['numero', 'nom', 'race', 'statut'].includes(o.sortBy) ? o.sortBy : 'numero',
      sortDir: o.sortDir === 'desc' ? 'desc' : 'asc',
    }
  } catch {
    return { voliereCode: 'A', vue: 'grid', sortBy: 'numero', sortDir: 'asc' }
  }
}

function writeVoliereVisuPrefs(p) {
  try {
    localStorage.setItem(LS_VOLIERE_VISU, JSON.stringify(p))
  } catch {
    /* quota / navigation privée */
  }
}

const FILTRES = [
  { id: 'ALL', label: 'Toutes' },
  { id: 'LIBRE', label: 'Libres' },
  { id: 'OCCUPE_PIGEON', label: '1 pigeon' },
  { id: 'OCCUPE_COUPLE', label: 'Couples' },
]

/** Pastilles statut — mêmes couleurs que la légende et la vue grille. */
const STATUT_LISTE = {
  LIBRE: {
    label: 'Libre',
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-900 ring-emerald-500/15',
    dot: 'bg-emerald-500',
  },
  OCCUPE_PIGEON: {
    label: 'Occupée (1 pigeon)',
    className: 'border-rose-200 bg-rose-50 text-rose-900 ring-rose-500/15',
    dot: 'bg-rose-500',
  },
  OCCUPE_COUPLE: {
    label: 'Couple (2 pigeons)',
    className: 'border-amber-200 bg-amber-50 text-amber-950 ring-amber-500/15',
    dot: 'bg-amber-500',
  },
}

function StatutListeBadge({ statut }) {
  const cfg = STATUT_LISTE[statut] ?? STATUT_LISTE.LIBRE
  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm ring-1 ${cfg.className}`}
    >
      <span className={`size-2 shrink-0 rounded-full ${cfg.dot}`} aria-hidden />
      <span className="truncate">{cfg.label}</span>
    </span>
  )
}

export function VolierePage() {
  const authEmail = useAuthStore((s) => s.user?.email ?? '')
  const { profile } = useUserProfile(authEmail)
  const { cages, loading: loadCages, error: errCages } = useCages()
  const { pigeons, loading: loadPigeons, error: errPigeons } = usePigeons(false)
  const { couples, loading: loadCouples, error: errCouples } = useCouples(false)

  const initialVisu = readVoliereVisuPrefs()
  const [voliereCode, setVoliereCode] = useState(initialVisu.voliereCode)
  const [filtre, setFiltre] = useState('ALL')
  const [vue, setVue] = useState(initialVisu.vue)
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [filterRace, setFilterRace] = useState('')
  const [sortBy, setSortBy] = useState(initialVisu.sortBy)
  const [sortDir, setSortDir] = useState(initialVisu.sortDir)
  const [draggingPigeonId, setDraggingPigeonId] = useState(null)
  const [dragOverCageId, setDragOverCageId] = useState(null)

  const codesVoliere = useMemo(
    () => mergeProfileVoliereCodesWithCages(profile?.voliereCodes, cages),
    [profile?.voliereCodes, cages],
  )

  const pigeonById = useMemo(() => {
    const m = new Map()
    pigeons.forEach((p) => m.set(p.id, p))
    return m
  }, [pigeons])

  const coupleById = useMemo(() => {
    const m = new Map()
    couples.forEach((c) => m.set(c.id, c))
    return m
  }, [couples])

  const maleByCouple = useMemo(() => {
    const m = new Map()
    couples.forEach((c) => {
      const male = pigeonById.get(c.maleId)
      if (male) m.set(c.id, male)
    })
    return m
  }, [couples, pigeonById])

  const femelleByCouple = useMemo(() => {
    const m = new Map()
    couples.forEach((c) => {
      const f = pigeonById.get(c.femelleId)
      if (f) m.set(c.id, f)
    })
    return m
  }, [couples, pigeonById])

  const pigeonDansCoupleActif = useMemo(() => {
    const s = new Set()
    for (const c of couples) {
      if (c.statut !== 'ACTIF') continue
      s.add(c.maleId)
      s.add(c.femelleId)
    }
    return s
  }, [couples])

  const canDropPourCouple = useCallback(
    (dragId, cage) => {
      if (!dragId || !cage || cage.statut !== 'OCCUPE_PIGEON' || !cage.pigeonId) return false
      if (dragId === cage.pigeonId) return false
      const a = pigeonById.get(dragId)
      const b = pigeonById.get(cage.pigeonId)
      if (!a || !b) return false
      if (a.statut !== 'ACTIF' || b.statut !== 'ACTIF') return false
      if (a.sexe === b.sexe) return false
      if (pigeonDansCoupleActif.has(dragId) || pigeonDansCoupleActif.has(cage.pigeonId)) return false
      return true
    },
    [pigeonById, pigeonDansCoupleActif],
  )

  useEffect(() => {
    if (draggingPigeonId == null) return undefined
    const onEnd = () => {
      setDraggingPigeonId(null)
      setDragOverCageId(null)
    }
    window.addEventListener('dragend', onEnd)
    return () => window.removeEventListener('dragend', onEnd)
  }, [draggingPigeonId])

  const handleDragStartSolo = useCallback((pigeonId, e) => {
    setDraggingPigeonId(pigeonId)
    e.dataTransfer.setData('text/plain', pigeonId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOverCage = useCallback(
    (cage, e) => {
      if (!draggingPigeonId) return
      if (canDropPourCouple(draggingPigeonId, cage)) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverCageId(cage.id)
      }
    },
    [draggingPigeonId, canDropPourCouple],
  )

  const handleDragLeaveCage = useCallback((cage, e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return
    setDragOverCageId((prev) => (prev === cage.id ? null : prev))
  }, [])

  const handleDropOnCage = useCallback(
    async (cage, e) => {
      e.preventDefault()
      const dragId = e.dataTransfer.getData('text/plain') || draggingPigeonId
      if (!dragId || !canDropPourCouple(dragId, cage)) return
      try {
        await creerCoupleParGlissement({ pigeonGlissantId: dragId, cageCibleId: cage.id })
        toast.success('Couple créé — la cage cible affiche maintenant le couple.')
        setSelectedId(cage.id)
      } catch (err) {
        toast.error(err?.message || 'Impossible de créer le couple')
      } finally {
        setDraggingPigeonId(null)
        setDragOverCageId(null)
      }
    },
    [draggingPigeonId, canDropPourCouple],
  )

  const occupiedPigeonIds = useMemo(() => {
    const s = new Set()
    cages.forEach((c) => {
      if (c.pigeonId) s.add(c.pigeonId)
      if (c.coupleId) {
        const cp = coupleById.get(c.coupleId)
        if (cp) {
          s.add(cp.maleId)
          s.add(cp.femelleId)
        }
      }
    })
    return s
  }, [cages, coupleById])

  const pigeonsDisponibles = useMemo(
    () =>
      pigeons.filter(
        (p) => p.statut === 'ACTIF' && !p.deletedAt && !occupiedPigeonIds.has(p.id),
      ),
    [pigeons, occupiedPigeonIds],
  )

  const coupleOptions = useMemo(
    () =>
      couples
        .filter((c) => c.statut === 'ACTIF' && !c.cageId)
        .map((c) => ({
          id: c.id,
          label: `${pigeonById.get(c.maleId)?.matricule ?? '?'} + ${pigeonById.get(c.femelleId)?.matricule ?? '?'}`,
        })),
    [couples, pigeonById],
  )

  const cagesVoliere = useMemo(
    () => cages.filter((c) => (c.voliereCode ?? 'A') === voliereCode),
    [cages, voliereCode],
  )

  const raceOptionsVoliere = useMemo(() => {
    const set = new Set()
    for (const c of cagesVoliere) {
      for (const p of occupantPigeons(c, pigeonById, coupleById, maleByCouple, femelleByCouple)) {
        if (p.race?.trim()) set.add(p.race.trim())
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
  }, [cagesVoliere, pigeonById, coupleById, maleByCouple, femelleByCouple])

  const cagesFiltrees = useMemo(() => {
    const qNorm = query.trim().toLowerCase()
    let rows = cagesVoliere.filter((c) => filtre === 'ALL' || c.statut === filtre)

    rows = rows.filter((c) => cageMatchesQuery(c, qNorm, pigeonById, coupleById, maleByCouple, femelleByCouple))

    if (filterRace) {
      rows = rows.filter((c) => {
        const ps = occupantPigeons(c, pigeonById, coupleById, maleByCouple, femelleByCouple)
        return ps.some((p) => p.race === filterRace)
      })
    }

    rows = [...rows].sort((a, b) =>
      compareCages(a, b, sortBy, sortDir, pigeonById, coupleById, maleByCouple, femelleByCouple),
    )
    return rows
  }, [
    cagesVoliere,
    filtre,
    query,
    filterRace,
    sortBy,
    sortDir,
    pigeonById,
    coupleById,
    maleByCouple,
    femelleByCouple,
  ])

  const hasActiveFilters = Boolean(
    query.trim() || filterRace || filtre !== 'ALL' || sortBy !== 'numero' || sortDir !== 'asc',
  )

  const resetFilters = useCallback(() => {
    setQuery('')
    setFilterRace('')
    setFiltre('ALL')
    setSortBy('numero')
    setSortDir('asc')
  }, [])

  /** Sélection masquée si la cage n’est plus dans le résultat filtré (sans effet ni setState en cascade). */
  const selectedIdVisible = useMemo(() => {
    if (!selectedId) return null
    return cagesFiltrees.some((c) => c.id === selectedId) ? selectedId : null
  }, [selectedId, cagesFiltrees])

  const selectedCage = selectedIdVisible ? cages.find((c) => c.id === selectedIdVisible) : null
  const selectedPigeon = selectedCage?.pigeonId
    ? pigeonById.get(selectedCage.pigeonId)
    : null
  const selectedCouple = selectedCage?.coupleId
    ? coupleById.get(selectedCage.coupleId)
    : null
  const selectedMale = selectedCouple ? maleByCouple.get(selectedCouple.id) : null
  const selectedFemelle = selectedCouple ? femelleByCouple.get(selectedCouple.id) : null

  const selectedCoupleIdRompre =
    selectedCage?.statut === 'OCCUPE_COUPLE' && selectedCage.coupleId ? selectedCage.coupleId : null

  const {
    events: cageOccupancyEvents,
    loading: loadHistory,
    error: errHistory,
  } = useCageHistory(selectedIdVisible)

  const moveTargetCages = useMemo(() => {
    if (!selectedCage) return []
    return cages
      .filter((c) => c.statut === 'LIBRE' && c.id !== selectedCage.id)
      .sort((a, b) => {
        const sa = `${a.voliereCode ?? 'A'}-${a.numero}`
        const sb = `${b.voliereCode ?? 'B'}-${b.numero}`
        return sa.localeCompare(sb, undefined, { numeric: true })
      })
      .map((c) => ({
        id: c.id,
        label: `${c.voliereCode ?? 'A'} · ${c.numero} — ${c.nom}`,
      }))
  }, [cages, selectedCage])

  const loading = loadCages || loadPigeons || loadCouples
  const error = errCages || errPigeons || errCouples

  useEffect(() => {
    writeVoliereVisuPrefs({ voliereCode, vue, sortBy, sortDir })
  }, [voliereCode, vue, sortBy, sortDir])

  /* Corrige une volière (nom court) persistée qui n’existe plus dans la liste fusionnée (profil + cages). */
  useEffect(() => {
    if (loading) return
    if (codesVoliere.includes(voliereCode)) return
    const first = codesVoliere[0] ?? 'A'
    // eslint-disable-next-line react-hooks/set-state-in-effect -- alignement état / données au chargement uniquement
    setVoliereCode(first)
    setSelectedId(null)
  }, [loading, codesVoliere, voliereCode])

  const handleLibererWithReason = async (opts) => {
    if (!selectedCage) return
    try {
      await libererCage(selectedCage.id, opts)
      toast.success('Cage libérée')
      setSelectedId(null)
    } catch (e) {
      toast.error(e?.message || 'Impossible de libérer la cage')
      throw e
    }
  }

  const handleMoveToCage = async (targetCageId, opts = {}) => {
    if (!selectedCage) return
    try {
      if (selectedCage.statut === 'OCCUPE_PIGEON' && selectedCage.pigeonId) {
        await deplacerPigeonVersCage(selectedCage.pigeonId, selectedCage.id, targetCageId, opts)
      } else if (selectedCage.statut === 'OCCUPE_COUPLE' && selectedCage.coupleId) {
        await deplacerCoupleVersCage(selectedCage.coupleId, selectedCage.id, targetCageId, opts)
      } else {
        throw new Error('Rien à déplacer depuis cette cage')
      }
      toast.success('Déplacement effectué')
      setSelectedId(targetCageId)
    } catch (e) {
      toast.error(e?.message || 'Déplacement impossible')
      throw e
    }
  }

  const handleAssignPigeon = async (pigeonId) => {
    if (!selectedCage) return
    try {
      await affecterPigeonACage(pigeonId, selectedCage.id)
      toast.success('Pigeon affecté à la cage')
    } catch (e) {
      toast.error(e?.message || 'Affectation impossible')
      throw e
    }
  }

  const handleAssignCouple = async (coupleId) => {
    if (!selectedCage) return
    try {
      await affecterCoupleACage(coupleId, selectedCage.id)
      toast.success('Couple affecté à la cage')
    } catch (e) {
      toast.error(e?.message || 'Affectation impossible')
      throw e
    }
  }

  const handleRompreCouple = useCallback(async () => {
    if (!selectedCoupleIdRompre) return
    try {
      const r = await rompreCouple(selectedCoupleIdRompre)
      const parts = []
      if (r.restoredMale) parts.push('Mâle replacé dans sa cage d’origine.')
      if (r.restoredFemelle) parts.push('Femelle replacée dans sa cage d’origine.')
      for (const s of r.skipped) parts.push(s)
      toast.success(parts.length ? `Couple rompu. ${parts.join(' ')}` : 'Couple rompu.')
      setSelectedId(null)
    } catch (e) {
      toast.error(e?.message || 'Impossible de rompre le couple')
      throw e
    }
  }, [selectedCoupleIdRompre])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 w-full flex-1 lg:pr-4">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Home className="size-7 text-teal-600" aria-hidden />
            Volière {voliereCode}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500" aria-hidden />
              Libre
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-rose-500" aria-hidden />
              Occupée (1 pigeon)
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-amber-500" aria-hidden />
              Couple (2 pigeons)
            </span>
          </div>
          <p className="mt-2 w-full text-xs leading-relaxed text-slate-500">
            <strong>Création rapide de couple :</strong> sur une cage « 1 pigeon », utilise la poignée{' '}
            <GripVertical className="inline size-3.5 align-text-bottom text-rose-700" aria-hidden /> à droite, glisse
            le pigeon sur une <strong>autre</strong> cage occupée par un seul pigeon du <strong>sexe opposé</strong>
            (les deux doivent être actifs et sans couple). La cage cible devient la cage du couple ; la cage du pigeon
            glissant est libérée s’il en avait une. Les pigeons sans cage passent toujours par le menu{' '}
            <strong>Couples</strong> ou <strong>Affecter un pigeon</strong> puis glisser.
          </p>
          {!loading && cagesVoliere.length > 0 ? (
            <p className="mt-2 text-xs text-slate-500" aria-live="polite">
              <span className="font-medium text-slate-700">{cagesVoliere.length}</span> cage(s) dans la volière{' '}
              {voliereCode}
              {hasActiveFilters ? (
                <>
                  {' '}
                  · <span className="text-slate-700">{cagesFiltrees.length} affichée(s)</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-1 sm:items-end">
          <select
            value={voliereCode}
            onChange={(e) => {
              setVoliereCode(e.target.value)
              setSelectedId(null)
            }}
            className="rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm font-medium text-slate-800"
            aria-label="Choisir la volière"
          >
            {codesVoliere.map((code) => (
              <option key={code} value={code}>
                Volière {code}
              </option>
            ))}
          </select>
            <p className="max-w-[18rem] text-right text-[11px] leading-snug text-slate-500">
              Pour <span className="font-medium text-slate-600">ajouter une volière</span> : ouvre le{' '}
              <span className="font-medium text-slate-600">menu compte</span> (icône en haut à droite), rubrique{' '}
              <span className="font-medium text-slate-600">Mes volières</span>, puis indique le{' '}
              <span className="font-medium text-slate-600">nom court</span> de la volière (ex. B, Nord).
            </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {!loading && cages.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher par n° cage, nom, description ou pigeon (matricule, nom, race)…"
                className="w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                aria-label="Recherche sur les cages et leur contenu"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Affichage</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5" role="group" aria-label="Vue grille ou liste">
                <button
                  type="button"
                  onClick={() => setVue('grid')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                    vue === 'grid' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  aria-pressed={vue === 'grid'}
                >
                  <LayoutGrid className="size-4" aria-hidden />
                  Grille
                </button>
                <button
                  type="button"
                  onClick={() => setVue('list')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                    vue === 'list' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  aria-pressed={vue === 'list'}
                >
                  <ListIcon className="size-4" aria-hidden />
                  Liste
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label htmlFor="voliere-filter-situation" className="mb-1 block text-xs font-medium text-slate-600">
                Situation des cages
              </label>
              <select
                id="voliere-filter-situation"
                value={filtre}
                onChange={(e) => setFiltre(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              >
                {FILTRES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="voliere-filter-race" className="mb-1 block text-xs font-medium text-slate-600">
                Race (pigeon)
              </label>
              <select
                id="voliere-filter-race"
                value={filterRace}
                onChange={(e) => setFilterRace(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              >
                <option value="">Toutes les races</option>
                {raceOptionsVoliere.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="voliere-sort-by" className="mb-1 block text-xs font-medium text-slate-600">
                Tri
              </label>
              <div className="flex gap-2">
                <select
                  id="voliere-sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                >
                  <option value="numero">Numéro de cage</option>
                  <option value="nom">Nom de cage</option>
                  <option value="race">Race (occupant)</option>
                  <option value="statut">Statut cage</option>
                </select>
                <button
                  type="button"
                  title={
                    sortDir === 'asc'
                      ? 'Ordre croissant — cliquer pour décroissant'
                      : 'Ordre décroissant — cliquer pour croissant'
                  }
                  onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-2.5 py-2 text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                  aria-label={sortDir === 'asc' ? 'Trier en ordre décroissant' : 'Trier en ordre croissant'}
                >
                  {sortDir === 'asc' ? (
                    <ArrowDownNarrowWide className="size-4" aria-hidden />
                  ) : (
                    <ArrowUpNarrowWide className="size-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>
          </div>

          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">
                Filtres ou tri personnalisés : la grille ou la liste ci-dessous est ajustée. « Réinitialiser » remet
                aussi le tri sur le numéro de cage (croissant).
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <FilterX className="size-4" aria-hidden />
                Réinitialiser filtres, recherche et tri
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <AppLoadingScreen variant="embedded" loadingContext="cages" message="Chargement des cages…" subtitle="Grille, occupants et historique." />
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            {vue === 'grid' ? (
              cagesVoliere.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center text-slate-600 sm:p-6">
                  <p>Aucune cage pour cette volière ({voliereCode}).</p>
                  <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
                    Ajoute des cages depuis la gestion des cages (menu « Cages ») ou crée-en une pour cette volière.
                  </p>
                  <Link
                    to={`/cages/nouveau?voliere=${encodeURIComponent(voliereCode)}`}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
                  >
                    <Plus className="size-4" aria-hidden />
                    Nouvelle cage pour cette volière
                  </Link>
                </div>
              ) : cagesFiltrees.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 px-4 py-5 text-center text-sm text-slate-600 sm:py-6">
                  <p className="font-medium text-slate-800">Aucune cage ne correspond à ta sélection.</p>
                  <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
                    Essaie d’autres filtres ou vide la recherche.
                  </p>
                  <button
                    type="button"
                    className="mt-4 text-teal-700 underline hover:text-teal-800"
                    onClick={resetFilters}
                  >
                    Réinitialiser filtres, recherche et tri
                  </button>
                </div>
              ) : (
                <VoliereGrid
                  cages={cagesFiltrees}
                  selectedId={selectedIdVisible}
                  onSelect={setSelectedId}
                  pigeonById={pigeonById}
                  coupleById={coupleById}
                  maleByCouple={maleByCouple}
                  femelleByCouple={femelleByCouple}
                  dragOverCageId={dragOverCageId}
                  onDragStartSolo={handleDragStartSolo}
                  onDragOverCage={handleDragOverCage}
                  onDragLeaveCage={handleDragLeaveCage}
                  onDropOnCage={handleDropOnCage}
                />
              )
            ) : cagesVoliere.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 sm:p-6">
                <p>Aucune cage pour cette volière ({voliereCode}).</p>
                <p className="mx-auto mt-2 max-w-md text-xs text-slate-500 dark:text-slate-400">
                  Ajoute des cages depuis la gestion des cages (menu « Cages ») ou crée-en une pour cette volière.
                </p>
                <Link
                  to={`/cages/nouveau?voliere=${encodeURIComponent(voliereCode)}`}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
                >
                  <Plus className="size-4" aria-hidden />
                  Nouvelle cage pour cette volière
                </Link>
              </div>
            ) : cagesFiltrees.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 px-4 py-5 text-center text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/90 dark:text-slate-300 sm:py-6">
                <p className="font-medium text-slate-800 dark:text-slate-100">Aucune cage ne correspond à ta sélection.</p>
                <p className="mx-auto mt-2 max-w-md text-xs text-slate-500 dark:text-slate-400">
                  Essaie d’autres filtres ou vide la recherche.
                </p>
                <button
                  type="button"
                  className="mt-4 text-teal-700 underline hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200"
                  onClick={resetFilters}
                >
                  Réinitialiser filtres, recherche et tri
                </button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-md shadow-slate-900/5 ring-1 ring-slate-900/[0.04]">
                <div className={dmDataTableHeader}>
                  <p className={dmDataTableTitle}>Liste des cages</p>
                  <p className={dmDataTableSub}>
                    Cliquez sur une ligne pour le détail. Création de couple par glisser : poignée à gauche du contenu
                    lorsque la cage a un pigeon seul (comme en vue grille).
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 p-3 sm:gap-3 md:hidden">
                  {cagesFiltrees.map((c) => {
                    const pg = c.pigeonId ? pigeonById.get(c.pigeonId) : null
                    const cp = c.coupleId ? coupleById.get(c.coupleId) : null
                    const m = cp ? maleByCouple.get(cp.id) : null
                    const f = cp ? femelleByCouple.get(cp.id) : null
                    let contenu = '—'
                    if (c.statut === 'LIBRE') contenu = 'Libre'
                    if (c.statut === 'OCCUPE_PIGEON' && c.pigeonId) {
                      contenu = pg ? `${pg.matricule} — ${pg.nom}` : `Pigeon (${c.pigeonId.slice(0, 6)}…)`
                    }
                    if (m && f) contenu = `${m.matricule} (${m.nom}) + ${f.matricule} (${f.nom})`
                    const selected = selectedIdVisible === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        onDragOver={(e) => handleDragOverCage(c, e)}
                        onDragLeave={(e) => handleDragLeaveCage(c, e)}
                        onDrop={(e) => handleDropOnCage(c, e)}
                        className={`flex flex-col rounded-xl border p-3 text-left text-xs shadow-sm transition-colors dark:border-slate-600 dark:bg-slate-800/80 ${
                          selected
                            ? 'border-sky-400 bg-sky-50 ring-1 ring-sky-300 dark:border-sky-700 dark:bg-slate-800 dark:ring-sky-700/50'
                            : 'border-slate-200 bg-white dark:border-slate-600'
                        } ${dragOverCageId === c.id ? 'ring-2 ring-teal-400 dark:ring-teal-500' : ''}`}
                      >
                        <span className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {c.numero}
                        </span>
                        <span className="mt-1">
                          <StatutListeBadge statut={c.statut} />
                        </span>
                        <span className="mt-2 line-clamp-3 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
                          {contenu}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="hidden md:block">
                <div className={dmTableWrap}>
                  <table className={dmTableClass('min-w-[520px]')}>
                    <caption className="sr-only">
                      Cages de la volière {voliereCode}, numéro, statut et contenu
                    </caption>
                    <thead className={dmThead}>
                      <tr>
                        <th scope="col" className="whitespace-nowrap px-4 py-3.5">
                          Numéro
                        </th>
                        <th scope="col" className="whitespace-nowrap px-4 py-3.5">
                          Statut
                        </th>
                        <th scope="col" className="min-w-[12rem] px-4 py-3.5">
                          Contenu
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${dmTbody} text-slate-800 dark:text-slate-200`}>
                      {cagesFiltrees.map((c) => {
                        const pg = c.pigeonId ? pigeonById.get(c.pigeonId) : null
                        const cp = c.coupleId ? coupleById.get(c.coupleId) : null
                        const m = cp ? maleByCouple.get(cp.id) : null
                        const f = cp ? femelleByCouple.get(cp.id) : null
                        let contenu = '—'
                        if (c.statut === 'LIBRE') contenu = 'Libre'
                        if (c.statut === 'OCCUPE_PIGEON' && c.pigeonId) {
                          contenu = pg ? `${pg.matricule} — ${pg.nom}` : `Pigeon (${c.pigeonId.slice(0, 6)}…)`
                        }
                        if (m && f) contenu = `${m.matricule} (${m.nom}) + ${f.matricule} (${f.nom})`
                        const selected = selectedIdVisible === c.id
                        return (
                          <tr
                            key={c.id}
                            className={`cursor-pointer transition-colors hover:bg-teal-50/70 dark:hover:bg-teal-950/40 ${
                              selected
                                ? 'bg-sky-50 ring-1 ring-inset ring-sky-300/80 hover:bg-sky-50 dark:bg-slate-800/90 dark:ring-sky-700/50 dark:hover:bg-slate-800'
                                : 'odd:bg-white even:bg-slate-50/60 dark:odd:bg-slate-900 dark:even:bg-slate-800/50'
                            } ${dragOverCageId === c.id ? 'ring-2 ring-inset ring-teal-400 dark:ring-teal-500' : ''}`}
                            onClick={() => setSelectedId(c.id)}
                            onDragOver={(e) => handleDragOverCage(c, e)}
                            onDragLeave={(e) => handleDragLeaveCage(c, e)}
                            onDrop={(e) => handleDropOnCage(c, e)}
                          >
                            <td
                              className={`whitespace-nowrap px-4 py-3.5 font-semibold tabular-nums text-slate-900 dark:text-slate-100 ${
                                selected ? 'border-l-[3px] border-l-sky-500 pl-[13px]' : 'border-l-[3px] border-l-transparent'
                              }`}
                            >
                              <div className="flex flex-col items-start gap-1">
                                <span>{c.numero}</span>
                                <CageDescriptionTooltip description={c.description} tooltipPlacement="above" />
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 align-middle">
                              <StatutListeBadge statut={c.statut} />
                            </td>
                            <td className="max-w-[min(28rem,92vw)] px-4 py-3.5 text-slate-700 dark:text-slate-300 sm:max-w-[min(28rem,55vw)]">
                              <div className="flex items-start gap-2">
                                {c.statut === 'OCCUPE_PIGEON' && c.pigeonId ? (
                                  <div
                                    draggable
                                    role="presentation"
                                    onDragStart={(e) => {
                                      e.stopPropagation()
                                      handleDragStartSolo(c.pigeonId, e)
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-0.5 shrink-0 cursor-grab rounded border border-rose-200 bg-rose-50 p-1 text-rose-800 hover:bg-rose-100 active:cursor-grabbing"
                                    title={`Glisser ${pg?.matricule ?? 'le pigeon'} sur une autre cage « 1 pigeon » du sexe opposé pour créer un couple`}
                                    aria-label={`Glisser ${pg?.matricule ?? 'le pigeon'} pour former un couple`}
                                  >
                                    <GripVertical className="size-4" aria-hidden />
                                  </div>
                                ) : null}
                                <span className="line-clamp-2 min-w-0 flex-1">{contenu}</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                </div>
              </div>
            )}
          </div>

          {selectedCage ? (
            <CageDetailPanel
              key={selectedCage.id}
              cage={selectedCage}
              pigeon={selectedPigeon}
              male={selectedMale}
              femelle={selectedFemelle}
              couple={selectedCouple}
              occupancyEvents={cageOccupancyEvents}
              occupancyLoading={loadHistory}
              occupancyError={errHistory}
              onClose={() => setSelectedId(null)}
              onLibererWithReason={handleLibererWithReason}
              onMoveToCage={handleMoveToCage}
              moveTargetCages={moveTargetCages}
              onAssignPigeon={handleAssignPigeon}
              onAssignCouple={handleAssignCouple}
              onRompreCouple={selectedCoupleIdRompre ? handleRompreCouple : undefined}
              pigeonById={pigeonById}
              pigeonsDisponibles={pigeonsDisponibles}
              coupleOptions={coupleOptions}
            />
          ) : (
            <div className="hidden w-full max-w-sm shrink-0 rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-sm text-slate-500 lg:block">
              Sélectionnez une cage pour voir le détail et les actions.
            </div>
          )}
        </div>
      )}

      {selectedCage && (
        <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" aria-hidden onClick={() => setSelectedId(null)} />
      )}
    </div>
  )
}
