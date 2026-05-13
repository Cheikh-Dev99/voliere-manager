import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

function fieldClass(err) {
  return `w-full rounded-lg border px-3 py-2 pr-9 text-slate-900 outline-none focus:ring-2 ${
    err ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-500/30'
  }`
}

/**
 * Champ type combobox : saisie libre + liste filtrée + ajout d’une valeur hors liste.
 */
export function SearchableCombobox({
  label,
  id,
  value,
  onChange,
  onBlur,
  options,
  error,
  required,
  hint,
  placeholder = 'Rechercher ou saisir…',
  onAddCustom,
}) {
  const listId = useId()
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)

  const filtered = useMemo(() => {
    const q = (value ?? '').trim().toLowerCase()
    if (!q) return [...options].slice(0, 100)
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 120)
  }, [options, value])

  const trimmed = (value ?? '').trim()
  const exactMatch = useMemo(
    () => options.some((o) => o.toLowerCase() === trimmed.toLowerCase()),
    [options, trimmed],
  )
  const showAddRow = trimmed.length > 0 && !exactMatch

  const rowsCount = filtered.length + (showAddRow ? 1 : 0)

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

  const pickAddCustom = () => {
    if (!trimmed) return
    onAddCustom?.(trimmed)
    pick(trimmed)
  }

  const onKeyDown = (e) => {
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
        pickAddCustom()
      } else if (trimmed) {
        if (!exactMatch) onAddCustom?.(trimmed)
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
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={error ? 'true' : 'false'}
          autoComplete="off"
          placeholder={placeholder}
          className={fieldClass(error)}
          value={value ?? ''}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
            setHighlight(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
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
              className={`cursor-pointer px-3 py-2 text-sm ${
                highlight === i ? 'bg-teal-50 text-teal-900' : 'text-slate-800 hover:bg-slate-50'
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(opt)}
            >
              {opt}
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
              onClick={pickAddCustom}
            >
              + Ajouter « {trimmed} » à la liste
            </li>
          ) : null}
        </ul>
      ) : null}

      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
