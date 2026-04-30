'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

interface Resultado {
  punto_id: string | null
  lat: number
  lon: number
  centro_mas_cercano: {
    id: string
    nombre: string
    distancia_km: number
    duracion_min: number | null
  } | null
}

export default function BusquedaMasivaClient() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [cargando, setCargando] = useState(false)
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [error, setError] = useState('')
  const [progreso, setProgreso] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setArchivo(f)
  }

  async function procesarArchivo() {
    if (!archivo) return
    setError('')
    setResultados([])
    setCargando(true)
    setProgreso(0)

    try {
      const buffer = await archivo.arrayBuffer()
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

      // Detectar columnas de lat/lon
      const sample = rows[0] as Record<string, unknown>
      const keys = Object.keys(sample || {})
      const latKey = keys.find((k) => /lat/i.test(k))
      const lonKey = keys.find((k) => /lon|lng|long/i.test(k))
      const idKey = keys.find((k) => /id|codigo|code/i.test(k))

      if (!latKey || !lonKey) {
        setError('El archivo debe tener columnas con "lat" y "lon" (o "lng")')
        setCargando(false)
        return
      }

      const puntos = rows
        .map((r, i) => ({
          id: idKey ? String(r[idKey]) : String(i + 1),
          lat: parseFloat(String(r[latKey])),
          lon: parseFloat(String(r[lonKey])),
        }))
        .filter((p) => !isNaN(p.lat) && !isNaN(p.lon))

      if (puntos.length === 0) {
        setError('No se encontraron coordenadas válidas en el archivo')
        setCargando(false)
        return
      }

      // Enviar en lotes de 20
      const LOTE = 20
      const todos: Resultado[] = []
      for (let i = 0; i < puntos.length; i += LOTE) {
        const lote = puntos.slice(i, i + LOTE)
        const res = await fetch('/api/busqueda-masiva', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puntos: lote }),
        })
        if (!res.ok) throw new Error('Error en el servidor')
        const data = await res.json()
        todos.push(...data.resultados)
        setProgreso(Math.round(((i + lote.length) / puntos.length) * 100))
      }

      setResultados(todos)
    } catch (e) {
      setError('Ocurrió un error al procesar el archivo')
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  function exportarExcel() {
    if (resultados.length === 0) return
    const filas = resultados.map((r) => ({
      ID: r.punto_id ?? '',
      Latitud: r.lat,
      Longitud: r.lon,
      'Centro más cercano': r.centro_mas_cercano?.nombre ?? 'Sin resultado',
      'Distancia (km)': r.centro_mas_cercano?.distancia_km ?? '',
      'Duración (min)': r.centro_mas_cercano?.duracion_min ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados')
    XLSX.writeFile(wb, 'resultados_distancias.xlsx')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Búsqueda Masiva</h1>
      <p className="text-gray-500 text-sm mb-6">
        Subí un archivo Excel o CSV con columnas <strong>lat</strong> y <strong>lon</strong> para
        calcular el centro operativo más cercano a cada punto.
      </p>

      {/* Upload */}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#CC1A00] hover:bg-red-50 transition-colors mb-4"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFile}
        />
        {archivo ? (
          <p className="text-gray-700 font-medium">{archivo.name}</p>
        ) : (
          <>
            <p className="text-gray-500 text-sm">Hac&eacute; clic o arrastr&aacute; tu archivo aqu&iacute;</p>
            <p className="text-gray-400 text-xs mt-1">Formatos soportados: .xlsx, .xls, .csv</p>
          </>
        )}
      </div>

      <button
        onClick={procesarArchivo}
        disabled={!archivo || cargando}
        className="w-full bg-[#CC1A00] text-white font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#aa1500] transition-colors mb-4"
      >
        {cargando ? `Procesando... ${progreso}%` : 'Procesar archivo'}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Barra de progreso */}
      {cargando && (
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-[#CC1A00] h-2 rounded-full transition-all"
            style={{ width: `${progreso}%` }}
          />
        </div>
      )}

      {/* Resultados */}
      {resultados.length > 0 && (
        <>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-gray-600">
              {resultados.length} puntos procesados
            </p>
            <button
              onClick={exportarExcel}
              className="bg-white border border-[#CC1A00] text-[#CC1A00] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              Exportar Excel
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">ID</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Lat</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Lon</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Centro más cercano</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Distancia</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resultados.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{r.punto_id ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.lat.toFixed(4)}</td>
                      <td className="px-4 py-3 text-gray-600">{r.lon.toFixed(4)}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {r.centro_mas_cercano?.nombre ?? (
                          <span className="text-gray-400">Sin resultado</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[#CC1A00] font-semibold">
                        {r.centro_mas_cercano ? `${r.centro_mas_cercano.distancia_km} km` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {r.centro_mas_cercano?.duracion_min != null
                          ? `${r.centro_mas_cercano.duracion_min} min`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
