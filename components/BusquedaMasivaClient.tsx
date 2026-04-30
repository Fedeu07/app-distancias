'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

function colLetterToIndex(col: string): number {
  const upper = col.trim().toUpperCase()
  let idx = 0
  for (let i = 0; i < upper.length; i++) {
    idx = idx * 26 + (upper.charCodeAt(i) - 64)
  }
  return idx - 1
}

function isValidColLetter(col: string) {
  return /^[A-Za-z]{1,3}$/.test(col.trim())
}

interface Resultado {
  rowIdx: number
  distancia_km: number | null
  nombre: string | null
}

export default function BusquedaMasivaClient() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [colLat, setColLat] = useState('')
  const [colLon, setColLon] = useState('')
  const [filaInicio, setFilaInicio] = useState('2')
  const [filaFin, setFilaFin] = useState('')
  const [colKm, setColKm] = useState('')
  const [colSede, setColSede] = useState('')
  const [concurrencia, setConcurrencia] = useState('4')
  const [cargando, setCargando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [progresoMsg, setProgresoMsg] = useState('')
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<{
    totalFilas: number
    totalKm: number
    excelBytes: Uint8Array
    nombreArchivo: string
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function descargarExcel() {
    if (!resultado) return
    const blob = new Blob([resultado.excelBytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = resultado.nombreArchivo
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setArchivo(f)
      setError('')
      setResultado(null)
    }
  }

  async function procesar() {
    setError('')
    setResultado(null)
    setProgreso(0)
    setProgresoMsg('')

    if (!archivo) return setError('Seleccioná un archivo Excel.')
    if (!isValidColLetter(colLat)) return setError('Ingresá una letra de columna válida para Latitud (ej: C).')
    if (!isValidColLetter(colLon)) return setError('Ingresá una letra de columna válida para Longitud (ej: D).')
    const filaInicioNum = parseInt(filaInicio)
    if (isNaN(filaInicioNum) || filaInicioNum < 1) return setError('La fila de inicio debe ser un número mayor a 0.')
    const filaFinNum = filaFin.trim() !== '' ? parseInt(filaFin) : null
    if (filaFinNum !== null && (isNaN(filaFinNum) || filaFinNum < filaInicioNum))
      return setError('La fila de fin debe ser mayor o igual a la fila de inicio.')
    if (!isValidColLetter(colKm)) return setError('Ingresá una letra de columna válida para KM salida (ej: J).')
    if (colSede.trim() !== '' && !isValidColLetter(colSede))
      return setError('La columna de sede no es válida (ej: K).')
    const concurrenciaNum = Math.max(1, Math.min(10, parseInt(concurrencia) || 4))

    setCargando(true)

    try {
      // Leer el archivo y extraer puntos
      const buffer = await archivo.arrayBuffer()
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
      const lastRow = range.e.r + 1

      const latIdx = colLetterToIndex(colLat)
      const lonIdx = colLetterToIndex(colLon)
      const kmIdx = colLetterToIndex(colKm)
      const sedeIdx = colSede.trim() !== '' ? colLetterToIndex(colSede) : null
      const inicio = filaInicioNum
      const fin = filaFinNum ?? lastRow

      type Punto = { rowIdx: number; lat: number; lon: number }
      const puntos: Punto[] = []

      for (let row = inicio; row <= fin; row++) {
        const rowZ = row - 1
        const cellLat = ws[XLSX.utils.encode_cell({ r: rowZ, c: latIdx })]
        const cellLon = ws[XLSX.utils.encode_cell({ r: rowZ, c: lonIdx })]
        const latVal = cellLat ? parseFloat(String(cellLat.v)) : NaN
        const lonVal = cellLon ? parseFloat(String(cellLon.v)) : NaN
        if (!isNaN(latVal) && !isNaN(lonVal) && Math.abs(latVal) <= 90 && Math.abs(lonVal) <= 180) {
          puntos.push({ rowIdx: rowZ, lat: latVal, lon: lonVal })
        }
      }

      if (puntos.length === 0) {
        setError('No se encontraron coordenadas válidas en el rango indicado.')
        setCargando(false)
        return
      }

      // Procesar con concurrencia configurable
      const resultados: Resultado[] = []
      let procesados = 0

      async function procesarPunto(p: Punto): Promise<Resultado> {
        const res = await fetch('/api/busqueda-masiva', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puntos: [{ lat: p.lat, lon: p.lon }] }),
        })
        if (res.status === 401) throw new Error('Sesión expirada. Recargá la página e ingresá nuevamente.')
        if (!res.ok) throw new Error(`Error del servidor (${res.status})`)
        const data = await res.json()
        const centro = data.resultados?.[0]?.centro_mas_cercano ?? null
        return {
          rowIdx: p.rowIdx,
          distancia_km: centro?.distancia_km ?? null,
          nombre: centro?.nombre ?? null,
        }
      }

      // Procesar en lotes de tamaño = concurrencia
      for (let i = 0; i < puntos.length; i += concurrenciaNum) {
        const lote = puntos.slice(i, i + concurrenciaNum)
        setProgresoMsg(`Calculando filas ${lote[0].rowIdx + 1}–${lote[lote.length - 1].rowIdx + 1} (${procesados + lote.length} de ${puntos.length})...`)

        const lotResults = await Promise.all(lote.map(procesarPunto))
        resultados.push(...lotResults)
        procesados += lote.length
        setProgreso(Math.round((procesados / puntos.length) * 100))
      }

      // Escribir resultados en el workbook
      for (const r of resultados) {
        if (r.distancia_km !== null) {
          const kmCell = XLSX.utils.encode_cell({ r: r.rowIdx, c: kmIdx })
          ws[kmCell] = { t: 'n', v: r.distancia_km }
        }
        if (sedeIdx !== null && r.nombre !== null) {
          const sedeCell = XLSX.utils.encode_cell({ r: r.rowIdx, c: sedeIdx })
          ws[sedeCell] = { t: 's', v: r.nombre }
        }
      }

      // Expandir el rango del sheet para incluir las columnas nuevas
      const newRange = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
      newRange.e.c = Math.max(newRange.e.c, kmIdx, sedeIdx ?? 0)
      newRange.e.r = Math.max(newRange.e.r, ...resultados.map((r) => r.rowIdx))
      ws['!ref'] = XLSX.utils.encode_range(newRange)

      // Serializar el workbook a bytes para descarga
      // XLSX.write con type:'array' devuelve number[] — lo convertimos explícitamente a Uint8Array
      const wbRaw: number[] = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const wbOut = new Uint8Array(wbRaw)
      const totalKm = resultados.reduce((sum, r) => sum + (r.distancia_km ?? 0), 0)

      setResultado({
        totalFilas: resultados.length,
        totalKm: Math.round(totalKm * 100) / 100,
        excelBytes: wbOut,
        nombreArchivo: `resultados_${archivo.name.replace(/\.xlsx?$/i, '')}.xlsx`,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error inesperado.')
    } finally {
      setCargando(false)
      setProgresoMsg('')
    }
  }

  const inputClass =
    'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC1A00] focus:border-transparent w-full bg-white'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Búsqueda Masiva</h1>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        Subí un Excel, indicá en qué columnas están las coordenadas y dónde escribir los resultados.
        El sistema devuelve el mismo archivo con los km calculados.
      </p>

      {/* Archivo */}
      <div className="mb-5">
        <label className={labelClass}>
          Archivo Excel <span className="text-[#CC1A00]">*</span>
        </label>
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-[#CC1A00] hover:bg-red-50 transition-colors"
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
          {archivo ? (
            <p className="text-gray-700 font-medium text-sm">{archivo.name}</p>
          ) : (
            <>
              <p className="text-gray-500 text-sm">Hacé clic o arrastrá tu archivo Excel aquí</p>
              <p className="text-gray-400 text-xs mt-1">Formatos: .xlsx, .xls</p>
            </>
          )}
        </div>
      </div>

      {/* Configuracion de columnas */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Configuración de columnas</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Columna Latitud <span className="text-[#CC1A00]">*</span>
            </label>
            <input
              className={inputClass}
              placeholder="Ej: C"
              value={colLat}
              onChange={(e) => setColLat(e.target.value.toUpperCase())}
              maxLength={3}
            />
          </div>
          <div>
            <label className={labelClass}>
              Columna Longitud <span className="text-[#CC1A00]">*</span>
            </label>
            <input
              className={inputClass}
              placeholder="Ej: D"
              value={colLon}
              onChange={(e) => setColLon(e.target.value.toUpperCase())}
              maxLength={3}
            />
          </div>
          <div>
            <label className={labelClass}>
              Fila de inicio <span className="text-[#CC1A00]">*</span>
            </label>
            <input
              className={inputClass}
              placeholder="Ej: 2"
              type="number"
              min={1}
              value={filaInicio}
              onChange={(e) => setFilaInicio(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              Fila de fin{' '}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              className={inputClass}
              placeholder="Ej: 500"
              type="number"
              min={1}
              value={filaFin}
              onChange={(e) => setFilaFin(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Columnas de salida */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Columnas de salida</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Columna para KM <span className="text-[#CC1A00]">*</span>
            </label>
            <input
              className={inputClass}
              placeholder="Ej: J"
              value={colKm}
              onChange={(e) => setColKm(e.target.value.toUpperCase())}
              maxLength={3}
            />
          </div>
          <div>
            <label className={labelClass}>
              Columna para sede{' '}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              className={inputClass}
              placeholder="Ej: K"
              value={colSede}
              onChange={(e) => setColSede(e.target.value.toUpperCase())}
              maxLength={3}
            />
          </div>
        </div>
      </div>

      {/* Concurrencia */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Velocidad de procesamiento</p>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className={labelClass}>
              Consultas simultáneas{' '}
              <span className="text-gray-400 font-normal">(1 = más lento y seguro · 6 = más rápido)</span>
            </label>
            <input
              className={inputClass}
              type="number"
              min={1}
              max={10}
              value={concurrencia}
              onChange={(e) => setConcurrencia(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => setConcurrencia(String(n))}
                className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                  concurrencia === String(n)
                    ? 'bg-[#CC1A00] text-white'
                    : 'bg-white border border-gray-300 text-gray-600 hover:border-[#CC1A00] hover:text-[#CC1A00]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>
      )}

      {resultado && !cargando && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-green-700 font-semibold text-sm">
                Procesamiento completo — {resultado.totalFilas} filas calculadas.
              </p>
              <p className="text-green-600 text-sm mt-0.5">
                Total de kilómetros:{' '}
                <span className="font-bold">{resultado.totalKm.toLocaleString('es-AR')} km</span>
              </p>
            </div>
            <button
              onClick={descargarExcel}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              Descargar Excel
            </button>
          </div>
        </div>
      )}

      {cargando && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{progresoMsg}</span>
            <span>{progreso}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#CC1A00] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={procesar}
        disabled={!archivo || cargando}
        className="w-full bg-[#CC1A00] text-white font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#aa1500] transition-colors"
      >
        {cargando ? `Procesando... ${progreso}%` : 'Procesar Excel'}
      </button>
    </div>
  )
}
