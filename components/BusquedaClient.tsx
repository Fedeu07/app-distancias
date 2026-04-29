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
    <div className="max-w-3xl">
      {/* Search form */}
      <div className="bg-white rounded-2xl border border-[#E5DDD5] shadow-sm p-6 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#2C1F14]">Ubicación de origen</span>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="flex items-center gap-1.5 text-xs text-[#E07B39] hover:text-[#C86B2A] disabled:opacity-50 transition font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {locating ? 'Buscando...' : 'Usar mi ubicación'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#9C8E84]">Latitud</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={lat}
                  onChange={e => setLat(e.target.value)}
                  placeholder="-31.4135"
                  className="w-full rounded-lg border border-[#E5DDD5] bg-[#FAF7F4] px-3 py-2.5 text-sm text-[#2C1F14] placeholder:text-[#9C8E84] focus:outline-none focus:ring-2 focus:ring-[#E07B39]/40 focus:border-[#E07B39] transition font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#9C8E84]">Longitud</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={lon}
                  onChange={e => setLon(e.target.value)}
                  placeholder="-64.1811"
                  className="w-full rounded-lg border border-[#E5DDD5] bg-[#FAF7F4] px-3 py-2.5 text-sm text-[#2C1F14] placeholder:text-[#9C8E84] focus:outline-none focus:ring-2 focus:ring-[#E07B39]/40 focus:border-[#E07B39] transition font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#2C1F14]">
                Cantidad de resultados
              </label>
              <select
                value={limit}
                onChange={e => setLimit(e.target.value)}
                className="w-full rounded-lg border border-[#E5DDD5] bg-[#FAF7F4] px-3 py-2.5 text-sm text-[#2C1F14] focus:outline-none focus:ring-2 focus:ring-[#E07B39]/40 focus:border-[#E07B39] transition"
              >
                {[3, 5, 10, 20].map(n => (
                  <option key={n} value={n}>{n} centros</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#2C1F14]">
                Distancia máxima (km) <span className="text-[#9C8E84] font-normal">opcional</span>
              </label>
              <input
                type="number"
                min="1"
                value={maxKm}
                onChange={e => setMaxKm(e.target.value)}
                placeholder="Sin límite"
                className="w-full rounded-lg border border-[#E5DDD5] bg-[#FAF7F4] px-3 py-2.5 text-sm text-[#2C1F14] placeholder:text-[#9C8E84] focus:outline-none focus:ring-2 focus:ring-[#E07B39]/40 focus:border-[#E07B39] transition"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-[#D94F3B]/10 border border-[#D94F3B]/20 px-3 py-2 text-sm text-[#D94F3B]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#E07B39] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C86B2A] disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Calculando rutas...' : 'Buscar centros cercanos'}
          </button>
        </form>
      </div>

      {/* Results */}
      {loading && (
        <div className="bg-white rounded-2xl border border-[#E5DDD5] shadow-sm p-8 flex items-center justify-center">
          <p className="text-sm text-[#9C8E84]">Consultando OSRM y calculando distancias...</p>
        </div>
      )}

      {results !== null && !loading && (
        <div className="bg-white rounded-2xl border border-[#E5DDD5] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E5DDD5] bg-[#FAF7F4]">
            <p className="text-sm font-semibold text-[#2C1F14]">
              {results.length === 0 ? 'Sin resultados' : `${results.length} centro${results.length !== 1 ? 's' : ''} encontrado${results.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {results.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-[#9C8E84]">
              No se encontraron centros dentro del rango indicado.
            </div>
          ) : (
            <ul className="divide-y divide-[#E5DDD5]">
              {results.map((r, i) => (
                <li key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAF7F4] transition">
                  {/* Rank badge */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      i === 0
                        ? 'bg-[#E07B39] text-white'
                        : 'bg-[#F2EDE8] text-[#5C4A3A]'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#2C1F14] truncate">{r.nombre}</p>
                    <p className="text-xs text-[#9C8E84] mt-0.5 font-mono">
                      {r.lat.toFixed(4)}, {r.lon.toFixed(4)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#2C1F14]">
                      {r.distance_km.toFixed(1)} km
                    </p>
                    <p className="text-xs text-[#9C8E84] mt-0.5">
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
