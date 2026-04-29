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
    <div className="w-full max-w-4xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <p className="text-sm text-[#999]">
          {centros ? `${centros.length} centro${centros.length !== 1 ? 's' : ''} registrado${centros.length !== 1 ? 's' : ''}` : ''}
        </p>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-[#CC1A00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#AA1500] transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo centro
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-sm text-[#999]">
            Cargando centros...
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center py-16 text-sm text-[#CC1A00]">
            Error al cargar los centros.
          </div>
        )}
        {!isLoading && !error && centros && centros.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center mb-1">
              <svg className="w-6 h-6 text-[#CCC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <p className="text-[#999] text-sm">No hay centros cargados.</p>
            <button onClick={openNew} className="text-sm font-semibold text-[#CC1A00] hover:text-[#AA1500] transition">
              Agregar el primero
            </button>
          </div>
        )}
        {!isLoading && !error && centros && centros.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-[#E8E8E8] bg-[#FAFAFA]">
                  <th className="text-left px-5 py-3.5 font-semibold text-[#555] text-xs uppercase tracking-wide">Nombre</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-[#555] text-xs uppercase tracking-wide">Latitud</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-[#555] text-xs uppercase tracking-wide">Longitud</th>
                  <th className="px-5 py-3.5 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {centros.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#FAFAFA] transition"
                  >
                    <td className="px-5 py-3.5 font-medium text-[#1A1A1A]">{c.nombre}</td>
                    <td className="px-5 py-3.5 text-right text-[#555] font-mono tabular-nums text-xs">{c.lat.toFixed(4)}</td>
                    <td className="px-5 py-3.5 text-right text-[#555] font-mono tabular-nums text-xs">{c.lon.toFixed(4)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-2 rounded-lg text-[#AAA] hover:text-[#CC1A00] hover:bg-[#CC1A00]/8 transition"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deleteId === c.id}
                          className="p-2 rounded-lg text-[#AAA] hover:text-[#CC1A00] hover:bg-[#CC1A00]/8 transition disabled:opacity-40"
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
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-[#1A1A1A]">
                {editingId ? 'Editar centro operativo' : 'Nuevo centro operativo'}
              </h2>
              <button
                onClick={closeForm}
                className="p-1.5 rounded-lg text-[#AAA] hover:bg-[#F5F5F5] transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-[#1A1A1A]">Nombre</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Centro Sur - Córdoba"
                  className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#BBB] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/25 focus:border-[#CC1A00] transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-[#1A1A1A]">Latitud</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={form.lat}
                    onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                    placeholder="-31.4135"
                    className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#BBB] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/25 focus:border-[#CC1A00] transition font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-[#1A1A1A]">Longitud</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={form.lon}
                    onChange={e => setForm(f => ({ ...f, lon: e.target.value }))}
                    placeholder="-64.1811"
                    className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#BBB] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/25 focus:border-[#CC1A00] transition font-mono"
                  />
                </div>
              </div>

              {formError && (
                <p className="rounded-xl bg-[#CC1A00]/8 border border-[#CC1A00]/20 px-3.5 py-2.5 text-sm text-[#CC1A00]">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 rounded-xl border border-[#E0E0E0] px-4 py-2.5 text-sm font-semibold text-[#555] hover:bg-[#F5F5F5] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[#CC1A00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#AA1500] disabled:opacity-60 disabled:cursor-not-allowed transition"
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
