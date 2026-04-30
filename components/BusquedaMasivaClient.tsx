'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

// Convierte letra(s) de columna Excel a índice 0-based: A=0, B=1, Z=25, AA=26 ...
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

export default function BusquedaMasivaClient() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [colLat, setColLat] = useState('')
  const [colLon, setColLon] = useState('')
  const [filaInicio, setFilaInicio] = useState('2')
  const [filaFin, setFilaFin] = useState('')
  const [colKm, setColKm] = useState('')
  const [colSede, setColSede] = useState('')
  const [cargando, setCargando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [progresoMsg, setProgresoMsg] = useState('')
  const [error, setError] = useState('')
  const [procesados, setProcesados] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setArchivo(f)
      setError('')
      setProcesados(null)
    }
  }

  async function procesar() {
    setError('')
    setProcesados(null)
    setProgreso(0)

    // Validaciones
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

    setCargando(true)

    try {
      const buffer = await archivo.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]

      // Obtener rango total de la hoja
      const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
      const lastRow = range.e.r + 1 // 1-based

      const latIdx = colLetterToIndex(colLat)
      const lonIdx = colLetterToIndex(colLon)
      const kmIdx = colLetterToIndex(colKm)
      const sedeIdx = colSede.trim() !== '' ? colLetterToIndex(colSede) : null

      const inicio = filaInicioNum // 1-based
      const fin = filaFinNum ?? lastRow // 1-based

      // Recolectar puntos válidos con su índice de fila original
      type Punto = { rowIdx: number; lat: number; lon: number }
      const puntos: Punto[] = []

      for (let row = inicio; row <= fin; row++) {
        const rowZ = row - 1 // 0-based
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

      // Procesar en lotes de 20
      const LOTE = 20
      let procesadosCount = 0

      for (let i = 0; i < puntos.length; i += LOTE) {
        const lote = puntos.slice(i, i + LOTE)
        setProgresoMsg(`Procesando filas ${puntos[i].rowIdx + 2}...`)

        const res = await fetch('/api/busqueda-masiva', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puntos: lote.map((p) => ({ lat: p.lat, lon: p.lon })) }),
        })

        if (!res.ok) throw new Error('Error en el servidor al calcular distancias.')
        const data = await res.json()

        // Escribir resultados en el workbook
        data.resultados.forEach((resultado: { centro_mas_cercano: { distancia_km: number; nombre: string } | null }, j: number) => {
          const { rowIdx } = lote[j]
          const centro = resultado.centro_mas_cercano

          // Escribir KM
          const kmCell = XLSX.utils.encode_cell({ r: rowIdx, c: kmIdx })
          ws[kmCell] = { t: 'n', v: centro?.distancia_km ?? '' }

          // Escribir sede si corresponde
          if (sedeIdx !== null) {
            const sedeCell = XLSX.utils.encode_cell({ r: rowIdx, c: sedeIdx })
            ws[sedeCell] = { t: 's', v: centro?.nombre ?? '' }
          }
        })

        procesadosCount += lote.length
        setProgreso(Math.round((procesadosCount / puntos.length) * 100))
      }

      // Actualizar el rango de la hoja para incluir las nuevas columnas escritas
      const newRange = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
      newRange.e.c = Math.max(newRange.e.c, kmIdx, sedeIdx ?? 0)
      ws['!ref'] = XLSX.utils.encode_range(newRange)

      // Descargar el Excel modificado
      XLSX.writeFile(wb, `resultados_${archivo.name}`)
      setProcesados(procesadosCount)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error inesperado.')
    } finally {
      setCargando(false)
      setProgresoMsg('')
    }
  }

  const inputClass =
    'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC1A00] focus:border-transparent w-full'
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
        <label className={labelClass}>Archivo Excel <span className="text-[#CC1A00]">*</span></label>
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-[#CC1A00] hover:bg-red-50 transition-colors"
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
          {archivo ? (
            <p className="text-gray-700 font-medium text-sm">{archivo.name}</p>
          ) : (
            <>
              <p className="text-gray-500 text-sm">Hac&eacute; clic o arrastr&aacute; tu archivo Excel aqu&iacute;</p>
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
            <label className={labelClass}>Columna Latitud <span className="text-[#CC1A00]">*</span></label>
            <input
              className={inputClass}
              placeholder="Ej: C"
              value={colLat}
              onChange={(e) => setColLat(e.target.value.toUpperCase())}
              maxLength={3}
            />
          </div>
          <div>
            <label className={labelClass}>Columna Longitud <span className="text-[#CC1A00]">*</span></label>
            <input
              className={inputClass}
              placeholder="Ej: D"
              value={colLon}
              onChange={(e) => setColLon(e.target.value.toUpperCase())}
              maxLength={3}
            />
          </div>
          <div>
            <label className={labelClass}>Fila de inicio <span className="text-[#CC1A00]">*</span></label>
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
            <label className={labelClass}>Fila de fin <span className="text-gray-400 font-normal">(opcional)</span></label>
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
            <label className={labelClass}>Columna para KM <span className="text-[#CC1A00]">*</span></label>
            <input
              className={inputClass}
              placeholder="Ej: J"
              value={colKm}
              onChange={(e) => setColKm(e.target.value.toUpperCase())}
              maxLength={3}
            />
          </div>
          <div>
            <label className={labelClass}>Columna para sede <span className="text-gray-400 font-normal">(opcional)</span></label>
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {procesados !== null && !cargando && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm mb-4">
          Listo. Se procesaron {procesados} filas. El archivo fue descargado automáticamente.
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
        {cargando ? `Procesando... ${progreso}%` : 'Procesar y descargar Excel'}
      </button>
    </div>
  )
}
