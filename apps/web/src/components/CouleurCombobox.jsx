import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Pipette } from 'lucide-react'
import toast from 'react-hot-toast'
import { HexColorPicker } from 'react-colorful'
import { hexForCouleurReference } from '@shared/data/pigeonCouleurHex'

/** Préréglages pour la « bibliothèque » de teintes (robes / plumage). */
const COULEUR_PRESETS = [
  '#f4f4f5', '#e2e8f0', '#94a3b8', '#64748b', '#334155', '#0f172a',
  '#5b7fc7', '#3d5a80', '#1e3a5f', '#38bdf8', '#0ea5e9', '#0369a1',
  '#22c55e', '#15803d', '#14532d', '#eab308', '#ca8a04', '#a16207',
  '#fdba74', '#ea580c', '#c2410c', '#f87171', '#dc2626', '#991b1b',
  '#c084fc', '#7c3aed', '#5b21b6', '#fbcfe8', '#db2777', '#831843',
]

function comboShellClass(err) {
  return `relative flex w-full items-stretch rounded-lg border bg-white pr-10 transition-[box-shadow,border-color] ${
    err
      ? 'border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-200'
      : 'border-slate-300 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/30'
  }`
}

function Swatch({ hex, title, size = 'md' }) {
  const cls = size === 'sm' ? 'size-4 shrink-0' : 'size-5 shrink-0'
  return (
    <span
      title={title}
      className={`inline-block rounded border border-slate-300/80 shadow-inner ${cls}`}
      style={{ backgroundColor: hex }}
      aria-hidden
    />
  )
}

/** Teinte affichée : d’abord la surcouche locale (localStorage), sinon le catalogue. */
function resolveDisplayHex(nom, extrasMap) {
  const t = nom?.trim()
  if (!t) return '#94a3b8'
  const fromExtra = extrasMap.get(t.toLowerCase())
  if (fromExtra && /^#[0-9A-Fa-f]{6}$/i.test(fromExtra)) return fromExtra
  return hexForCouleurReference(t) ?? '#94a3b8'
}

/**
 * Combobox couleur : pastille cliquable → nuancier ; liste avec aperçu en fin de ligne.
 */
export function CouleurCombobox({
  label,
  id,
  value,
  onChange,
  onBlur,
  optionsNoms,
  customExtras,
  error,
  required,
  hint,
  placeholder = 'Rechercher ou saisir…',
  onAddCustom,
}) {
  const listId = useId()
  const dialogId = useId()
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const dialogRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [pendingName, setPendingName] = useState('')
  const [pendingHex, setPendingHex] = useState('#64748b')

  const extrasMap = useMemo(() => {
    const m = new Map()
    for (const e of customExtras ?? []) {
      if (e?.nom?.trim() && e?.hex) m.set(e.nom.trim().toLowerCase(), e.hex)
    }
    return m
  }, [customExtras])

  const filtered = useMemo(() => {
    const q = (value ?? '').trim().toLowerCase()
    if (!q) return [...optionsNoms].slice(0, 100)
    return optionsNoms.filter((o) => o.toLowerCase().includes(q)).slice(0, 120)
  }, [optionsNoms, value])

  const trimmed = (value ?? '').trim()
  const exactMatch = useMemo(
    () => optionsNoms.some((o) => o.toLowerCase() === trimmed.toLowerCase()),
    [optionsNoms, trimmed],
  )
  const showAddRow = trimmed.length > 0 && !exactMatch

  const rowsCount = filtered.length + (showAddRow ? 1 : 0)

  const currentHex = resolveDisplayHex(value ?? '', extrasMap)

  /** Ouvre le nuancier (pastille, raccourci, ou ajout depuis la liste). */
  const openPaletteDialog = (nameFromCaller) => {
    const n = (nameFromCaller ?? value ?? '').trim()
    setPendingName(n)
    setPendingHex(n ? resolveDisplayHex(n, extrasMap) : '#64748b')
    setOpen(false)
    setHighlight(-1)
    requestAnimationFrame(() => dialogRef.current?.showModal())
  }

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setHighlight(-1)
        onBlur?.()
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onBlur])

  const pick = (v) => {
    onChange(v)
    setOpen(false)
    setHighlight(-1)
    onBlur?.()
    inputRef.current?.focus()
  }

  const openAddDialog = () => {
    if (!trimmed) return
    openPaletteDialog(trimmed)
  }

  const confirmAddDialog = () => {
    const n = pendingName.trim()
    if (!n) {
      toast.error('Indique un nom de couleur (ex. Bleu barré), ou choisis une ligne dans la liste.')
      return
    }
    onAddCustom?.(n, pendingHex)
    onChange(n)
    onBlur?.()
    dialogRef.current?.close()
    inputRef.current?.focus()
  }

  const onKeyDown = (e) => {
    if (e.key === 'F2') {
      e.preventDefault()
      openPaletteDialog()
      return
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      setHighlight(0)
      e.preventDefault()
      return
    }
    if (!open) return

    if (e.key === 'Escape') {
      setOpen(false)
      setHighlight(-1)
      e.preventDefault()
      return
    }
    if (e.key === 'ArrowDown') {
      setHighlight((h) => Math.min(h + 1, rowsCount - 1))
      e.preventDefault()
      return
    }
    if (e.key === 'ArrowUp') {
      setHighlight((h) => Math.max(h - 1, 0))
      e.preventDefault()
      return
    }
    if (e.key === 'Enter') {
      if (highlight >= 0 && highlight < filtered.length) {
        pick(filtered[highlight])
      } else if (showAddRow && highlight === filtered.length) {
        openAddDialog()
      } else if (trimmed) {
        if (!exactMatch) {
          openAddDialog()
          return
        }
        pick(trimmed)
      }
      e.preventDefault()
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required ? ' *' : ''}
      </label>

      <div className={comboShellClass(error)}>
        <div className="flex min-w-0 flex-1 items-center gap-1 pl-2">
          <button
            type="button"
            className="flex shrink-0 items-center gap-0.5 rounded-md p-0.5 text-slate-600 hover:bg-slate-100 hover:text-teal-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-teal-500/50"
            title="Choisir la teinte d’aperçu (nuancier)"
            aria-label="Ouvrir le nuancier pour choisir la couleur d’aperçu"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => openPaletteDialog()}
          >
            <Swatch hex={currentHex} title={value?.trim() ? `Aperçu : ${value.trim()}` : 'Aucune couleur — clique pour choisir'} />
            <Pipette className="size-3.5 shrink-0 opacity-70" aria-hidden />
          </button>
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-describedby={hint ? `${id}-hint` : undefined}
            aria-autocomplete="list"
            aria-invalid={error ? 'true' : 'false'}
            autoComplete="off"
            placeholder={placeholder}
            className="min-w-0 flex-1 border-0 bg-transparent py-2 pl-0.5 pr-1 text-slate-900 outline-none focus:ring-0"
            value={value ?? ''}
            onChange={(e) => {
              onChange(e.target.value)
              setOpen(true)
              setHighlight(-1)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
        </div>
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Ouvrir la liste"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setOpen((o) => !o)
            inputRef.current?.focus()
          }}
        >
          <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      </div>

      {open && (filtered.length > 0 || showAddRow) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtered.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={value === opt}
              className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${
                highlight === i ? 'bg-teal-50 text-teal-900' : 'text-slate-800 hover:bg-slate-50'
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(opt)}
            >
              <span className="min-w-0 flex-1 truncate">{opt}</span>
              <Swatch hex={resolveDisplayHex(opt, extrasMap)} title={opt} size="sm" />
            </li>
          ))}
          {showAddRow ? (
            <li
              role="option"
              className={`cursor-pointer border-t border-slate-100 px-3 py-2 text-sm font-medium text-teal-700 ${
                highlight === filtered.length ? 'bg-teal-50' : 'hover:bg-teal-50/80'
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(filtered.length)}
              onClick={openAddDialog}
            >
              + Ajouter « {trimmed} »… (bibliothèque de couleur)
            </li>
          ) : null}
        </ul>
      ) : null}

      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <dialog
        ref={dialogRef}
        id={dialogId}
        className="z-[100] w-[min(100%,24rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl backdrop:bg-slate-900/40"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-slate-900">Teinte d’aperçu</h2>
        <p className="mt-1 text-xs text-slate-600">
          Nuancier interactif et pastilles rapides. Le nom reste celui de la robe ; la teinte sert uniquement à l’aperçu sur cet
          appareil.
        </p>
        <div className="mt-4 space-y-4" onPointerDown={(e) => e.stopPropagation()}>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor={`${dialogId}-nom`}>
              Nom de la couleur
            </label>
            <input
              id={`${dialogId}-nom`}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
            />
          </div>

          <div>
            <span className="mb-2 block text-xs font-medium text-slate-600">Bibliothèque — nuancier</span>
            <div
              className="flex touch-none justify-center rounded-lg border border-slate-100 bg-slate-50 p-2"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <HexColorPicker
                color={pendingHex}
                onChange={setPendingHex}
                style={{ width: 'min(100%, 220px)', height: '180px' }}
              />
            </div>
            <p className="mt-1 text-center font-mono text-[11px] text-slate-500">{pendingHex}</p>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Pastilles rapides</span>
            <div className="grid grid-cols-8 gap-1.5" role="group" aria-label="Couleurs prédéfinies">
              {COULEUR_PRESETS.map((h) => (
                <button
                  key={h}
                  type="button"
                  title={h}
                  className={`size-6 rounded border border-slate-300 shadow-sm transition-transform hover:scale-110 focus-visible:outline focus-visible:ring-2 focus-visible:ring-teal-500 ${
                    pendingHex.toLowerCase() === h.toLowerCase() ? 'ring-2 ring-teal-600 ring-offset-1' : ''
                  }`}
                  style={{ backgroundColor: h }}
                  onClick={() => setPendingHex(h)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <label className="text-xs font-medium text-slate-600" htmlFor={`${dialogId}-native`}>
              Sélecteur natif
            </label>
            <input
              id={`${dialogId}-native`}
              type="color"
              className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
              value={pendingHex}
              onChange={(e) => setPendingHex(e.target.value)}
              aria-label="Sélecteur de couleur natif du navigateur"
            />
            <Swatch hex={pendingHex} title={pendingHex} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => dialogRef.current?.close()}
          >
            Annuler
          </button>
          <button
            type="button"
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
            onClick={confirmAddDialog}
          >
            Enregistrer
          </button>
        </div>
      </dialog>
    </div>
  )
}
