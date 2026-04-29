'use client'

import { useState } from 'react'

type RouteResult = {
  id: string
  nombre: string
  lat: number
  lon: number
  distance_km: number
  duration_min: number
}

export default function BusquedaClient() {
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [limit, setLimit] = useState('5')
  const [maxKm, setMaxKm] = useState('')
  const [results, setResults] = useState<RouteResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude.toFixed(6))
        setLon(pos.coords.longitude.toFixed(6))
        setLocating(false)
        setError(null)
      },
      () => {
        setError('No se pudo obtener tu ubicación')
        setLocating(false)
      }
    )
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const latN = parseFloat(lat)
    const lonN = parseFloat(lon)
    if (isNaN(latN) || latN < -90 || latN > 90) return setError('Latitud inválida (-90 a 90)')
    if (isNaN(lonN) || lonN < -180 || lonN > 180) return setError('Longitud inválida (-180 a 180)')

    setLoading(true)
    setError(null)
    setResults(null)

    const params = new URLSearchParams({
      lat: String(latN),
      lon: String(lonN),
      limit: limit || '5',
      ...(maxKm ? { max_km: maxKm } : {}),
    })

    const res = await fetch(`/api/busqueda?${params}`)
    setLoading(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Error al buscar')
      return
    }
    const data = await res.json()
    setResults(data)
  }

  return (
    <div className="w-full max-w-3xl">
      {/* Search form */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm p-6 mb-5">
        <form onSubmit={handleSearch} className="flex flex-col gap-5">

          {/* Ubicacion origen */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[#1A1A1A]">Ubicación de origen</span>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#CC1A00] hover:text-[#AA1500] disabled:opacity-50 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {locating ? 'Buscando...' : 'Usar mi ubicación'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#777]">Latitud</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={lat}
                  onChange={e => setLat(e.target.value)}
                  placeholder="-31.4135"
                  className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#BBB] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/25 focus:border-[#CC1A00] transition font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#777]">Longitud</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={lon}
                  onChange={e => setLon(e.target.value)}
                  placeholder="-64.1811"
                  className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#BBB] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/25 focus:border-[#CC1A00] transition font-mono"
                />
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#777]">Cantidad de resultados</label>
              <select
                value={limit}
                onChange={e => setLimit(e.target.value)}
                className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/25 focus:border-[#CC1A00] transition"
              >
                {[3, 5, 10, 20].map(n => (
                  <option key={n} value={n}>{n} centros</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#777]">
                Distancia máxima (km) <span className="text-[#BBB]">— opcional</span>
              </label>
              <input
                type="number"
                min="1"
                value={maxKm}
                onChange={e => setMaxKm(e.target.value)}
                placeholder="Sin límite"
                className="w-full rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#BBB] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/25 focus:border-[#CC1A00] transition"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-[#CC1A00]/8 border border-[#CC1A00]/20 px-3.5 py-2.5 text-sm text-[#CC1A00]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#CC1A00] px-4 py-3 text-sm font-semibold text-white hover:bg-[#AA1500] disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
          >
            {loading ? 'Calculando rutas...' : 'Buscar centros cercanos'}
          </button>
        </form>
      </div>

      {/* Results */}
      {loading && (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm p-10 flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#CC1A00] border-t-transparent animate-spin" />
          <p className="text-sm text-[#999]">Consultando OSRM y calculando distancias...</p>
        </div>
      )}

      {results !== null && !loading && (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center justify-between">
            <p className="text-sm font-semibold text-[#1A1A1A]">
              {results.length === 0
                ? 'Sin resultados'
                : `${results.length} centro${results.length !== 1 ? 's' : ''} encontrado${results.length !== 1 ? 's' : ''}`}
            </p>
            {results.length > 0 && (
              <span className="text-xs text-[#999]">ordenados por distancia</span>
            )}
          </div>
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#CCC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3" />
                </svg>
              </div>
              <p className="text-sm text-[#999]">No se encontraron centros dentro del rango indicado.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#F0F0F0]">
              {results.map((r, i) => (
                <li key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFA] transition">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0
                        ? 'bg-[#CC1A00] text-white shadow-sm'
                        : i === 1
                        ? 'bg-[#F5F5F5] text-[#555]'
                        : 'bg-[#F5F5F5] text-[#AAA]'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#1A1A1A] truncate">{r.nombre}</p>
                    <p className="text-xs text-[#AAA] mt-0.5 font-mono">
                      {r.lat.toFixed(4)}, {r.lon.toFixed(4)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${i === 0 ? 'text-[#CC1A00]' : 'text-[#1A1A1A]'}`}>
                      {r.distance_km.toFixed(1)} km
                    </p>
                    <p className="text-xs text-[#999] mt-0.5">
                      ~{Math.round(r.duration_min)} min
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
