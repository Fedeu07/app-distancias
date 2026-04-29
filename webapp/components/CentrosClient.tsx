'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'

type Centro = {
  id: string
  nombre: string
  lat: number
  lon: number
  created_at: string
}

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al cargar centros')
  return res.json()
}

const EMPTY_FORM = { nombre: '', lat: '', lon: '' }

export default function CentrosClient() {
  const { data: centros, error, isLoading } = useSWR<Centro[]>('/api/centros', fetcher)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  function openNew() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(c: Centro) {
    setForm({ nombre: c.nombre, lat: String(c.lat), lon: String(c.lon) })
    setEditingId(c.id)
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const lat = parseFloat(form.lat)
    const lon = parseFloat(form.lon)
    if (isNaN(lat) || lat < -90 || lat > 90) return setFormError('Latitud inválida (-90 a 90)')
    if (isNaN(lon) || lon < -180 || lon > 180) return setFormError('Longitud inválida (-180 a 180)')
    if (!form.nombre.trim()) return setFormError('El nombre es requerido')

    setSaving(true)
    setFormError(null)
    const method = editingId ? 'PUT' : 'POST'
    const url = editingId ? `/api/centros/${editingId}` : '/api/centros'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: form.nombre.trim(), lat, lon }),
    })
    setSaving(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setFormError(body.error ?? 'Error al guardar')
      return
    }
    mutate('/api/centros')
    closeForm()
  }

  async function handleDelete(id: string) {
    setDeleteId(id)
    await fetch(`/api/centros/${id}`, { method: 'DELETE' })
    mutate('/api/centros')
    setDeleteId(null)
  }

  return (
    <div className="max-w-4xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#9C8E84]">
          {centros ? `${centros.length} centros registrados` : ''}
        </p>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-[#E07B39] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C86B2A] transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo centro
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E5DDD5] shadow-sm overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-sm text-[#9C8E84]">
            Cargando centros...
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center py-16 text-sm text-[#D94F3B]">
            Error al cargar los centros.
          </div>
        )}
        {!isLoading && !error && centros && centros.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[#9C8E84] text-sm">No hay centros cargados.</p>
            <button onClick={openNew} className="mt-3 text-sm font-medium text-[#E07B39] hover:text-[#C86B2A] transition">
              Agregar el primero
            </button>
          </div>
        )}
        {!isLoading && !error && centros && centros.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5DDD5] bg-[#FAF7F4]">
                <th className="text-left px-5 py-3 font-semibold text-[#5C4A3A]">Nombre</th>
                <th className="text-right px-5 py-3 font-semibold text-[#5C4A3A]">Latitud</th>
                <th className="text-right px-5 py-3 font-semibold text-[#5C4A3A]">Longitud</th>
                <th className="px-5 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {centros.map((c, i) => (
                <tr
                  key={c.id}
                  className={`border-b border-[#E5DDD5] last:border-0 transition hover:bg-[#FAF7F4] ${i % 2 === 1 ? 'bg-[#FAF7F4]/40' : ''}`}
                >
                  <td className="px-5 py-3.5 font-medium text-[#2C1F14]">{c.nombre}</td>
                  <td className="px-5 py-3.5 text-right text-[#5C4A3A] font-mono tabular-nums">{c.lat.toFixed(4)}</td>
                  <td className="px-5 py-3.5 text-right text-[#5C4A3A] font-mono tabular-nums">{c.lon.toFixed(4)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-[#9C8E84] hover:text-[#E07B39] hover:bg-[#E07B39]/10 transition"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deleteId === c.id}
                        className="p-1.5 rounded-lg text-[#9C8E84] hover:text-[#D94F3B] hover:bg-[#D94F3B]/10 transition disabled:opacity-50"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl border border-[#E5DDD5] shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-bold text-[#2C1F14] mb-5">
              {editingId ? 'Editar centro operativo' : 'Nuevo centro operativo'}
            </h2>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#2C1F14]">Nombre</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Centro Sur - Córdoba"
                  className="w-full rounded-lg border border-[#E5DDD5] bg-[#FAF7F4] px-3 py-2.5 text-sm text-[#2C1F14] placeholder:text-[#9C8E84] focus:outline-none focus:ring-2 focus:ring-[#E07B39]/40 focus:border-[#E07B39] transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#2C1F14]">Latitud</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={form.lat}
                    onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                    placeholder="-31.4135"
                    className="w-full rounded-lg border border-[#E5DDD5] bg-[#FAF7F4] px-3 py-2.5 text-sm text-[#2C1F14] placeholder:text-[#9C8E84] focus:outline-none focus:ring-2 focus:ring-[#E07B39]/40 focus:border-[#E07B39] transition font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#2C1F14]">Longitud</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={form.lon}
                    onChange={e => setForm(f => ({ ...f, lon: e.target.value }))}
                    placeholder="-64.1811"
                    className="w-full rounded-lg border border-[#E5DDD5] bg-[#FAF7F4] px-3 py-2.5 text-sm text-[#2C1F14] placeholder:text-[#9C8E84] focus:outline-none focus:ring-2 focus:ring-[#E07B39]/40 focus:border-[#E07B39] transition font-mono"
                  />
                </div>
              </div>

              {formError && (
                <p className="rounded-lg bg-[#D94F3B]/10 border border-[#D94F3B]/20 px-3 py-2 text-sm text-[#D94F3B]">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 rounded-lg border border-[#E5DDD5] px-4 py-2.5 text-sm font-medium text-[#5C4A3A] hover:bg-[#F2EDE8] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-[#E07B39] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C86B2A] disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear centro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
