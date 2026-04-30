'use client'

import { useMemo, useState } from 'react'

type BulkResultMeta = {
  warnings?: string
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const v = bytes / Math.pow(1024, i)
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

export default function BusquedaMasivaClient() {
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [meta, setMeta] = useState<BulkResultMeta | null>(null)

  const [latCol, setLatCol] = useState('H')
  const [lonCol, setLonCol] = useState('I')
  const [kmCol, setKmCol] = useState('J')
  const [centroCol, setCentroCol] = useState('')
  const [startRow, setStartRow] = useState('2')
  const [endRow, setEndRow] = useState('')

  const fileLabel = useMemo(() => {
    if (!file) return null
    return `${file.name} · ${formatBytes(file.size)}`
  }, [file])

  function resetOutput() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setDownloadUrl(null)
    setMeta(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setProcessing(true)
    setError(null)
    resetOutput()

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('lat_col', latCol.trim())
      fd.append('lon_col', lonCol.trim())
      fd.append('km_col', kmCol.trim())
      if (centroCol.trim()) fd.append('centro_col', centroCol.trim())
      if (startRow.trim()) fd.append('start_row', startRow.trim())
      if (endRow.trim()) fd.append('end_row', endRow.trim())

      const res = await fetch('/api/busqueda-masiva', {
        method: 'POST',
        body: fd,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al procesar el archivo')
      }

      const warnings = res.headers.get('x-bulk-warnings') ?? undefined
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      setMeta(warnings ? { warnings } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm p-6 mb-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#1A1A1A]">Archivo Excel (.xlsx)</label>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setFile(f)
                setError(null)
                resetOutput()
              }}
              className="block w-full text-sm text-[#555] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#F5F5F5] file:text-[#555] hover:file:bg-[#EEE] transition"
            />
            <p className="text-xs text-[#999]">
              Indicá las columnas (letras tipo <span className="font-mono">A</span>, <span className="font-mono">B</span>, <span className="font-mono">AA</span>) y el rango de filas a procesar.
            </p>
            {fileLabel && (
              <p className="text-xs text-[#777]">
                Seleccionado: <span className="font-semibold">{fileLabel}</span>
              </p>
            )}
          </div>

          <div className="bg-[#FAFAFA] border border-[#E8E8E8] rounded-2xl p-4">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-3">Mapeo de columnas y rango</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#777]">Columna latitud</label>
                <input
                  value={latCol}
                  onChange={(e) => setLatCol(e.target.value.toUpperCase())}
                  placeholder="Ej: H"
                  className="w-full rounded-xl border border-[#E0E0E0] bg-white px-3.5 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#BBB] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/25 focus:border-[#CC1A00] transition font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#777]">Columna longitud</label>
                <input
                  value={lonCol}
                  onChange={(e) => setLonCol(e.target.value.toUpperCase())}
                  placeholder="Ej: I"
                  className="w-full rounded-xl border border-[#E0E0E0] bg-white px-3.5 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#BBB] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/25 focus:border-[#CC1A00] transition font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#777]">Columna salida (km)</label>
                <input
                  value={kmCol}
                  onChange={(e) => setKmCol(e.target.value.toUpperCase())}
                  placeholder="Ej: J"
                  className="w-full rounded-xl border border-[#E0E0E0] bg-white px-3.5 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#BBB] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/25 focus:border-[#CC1A00] transition font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#777]">
                  Columna salida (sede) <span className="text-[#BBB]">— opcional</span>
                </label>
                <input
                  value={centroCol}
                  onChange={(e) => setCentroCol(e.target.value.toUpperCase())}
                  placeholder="Vacío = no se escribe sede"
                  className="w-full rounded-xl border border-[#E0E0E0] bg-white px-3.5 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#BBB] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/25 focus:border-[#CC1A00] transition font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#777]">Fila inicio (1 = primera fila)</label>
                <input
                  type="number"
                  min="1"
                  value={startRow}
                  onChange={(e) => setStartRow(e.target.value)}
                  placeholder="Ej: 2"
                  className="w-full rounded-xl border border-[#E0E0E0] bg-white px-3.5 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#BBB] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/25 focus:border-[#CC1A00] transition font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#777]">
                  Fila fin <span className="text-[#BBB]">— opcional</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={endRow}
                  onChange={(e) => setEndRow(e.target.value)}
                  placeholder="Vacío = hasta el final"
                  className="w-full rounded-xl border border-[#E0E0E0] bg-white px-3.5 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#BBB] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/25 focus:border-[#CC1A00] transition font-mono"
                />
              </div>
            </div>
            <p className="text-xs text-[#999] mt-3">
              Ejemplo: si tu Excel tiene lat en <span className="font-mono">C</span> y lon en <span className="font-mono">D</span>, poné <span className="font-mono">C</span> y <span className="font-mono">D</span>. Si querés km en <span className="font-mono">J</span>, poné <span className="font-mono">J</span>.
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-[#CC1A00]/8 border border-[#CC1A00]/20 px-3.5 py-2.5 text-sm text-[#CC1A00]">
              {error}
            </p>
          )}

          {meta?.warnings && (
            <p className="rounded-xl bg-[#FFF7E6] border border-[#FFD18A] px-3.5 py-2.5 text-sm text-[#7A4B00]">
              {meta.warnings}
            </p>
          )}

          <button
            type="submit"
            disabled={!file || processing}
            className="w-full rounded-xl bg-[#CC1A00] px-4 py-3 text-sm font-semibold text-white hover:bg-[#AA1500] disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
          >
            {processing ? 'Procesando...' : 'Procesar y descargar Excel'}
          </button>
        </form>
      </div>

      {processing && (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm p-10 flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#CC1A00] border-t-transparent animate-spin" />
          <p className="text-sm text-[#999]">Calculando distancias por lotes (OSRM) y completando el Excel...</p>
        </div>
      )}

      {downloadUrl && !processing && (
        <div className="bg-white rounded-2xl border border-[#E8E8E8] shadow-sm p-6">
          <p className="text-sm font-semibold text-[#1A1A1A] mb-3">Archivo listo</p>
          <a
            href={downloadUrl}
            download={`resultado_${file?.name ?? 'busqueda_masiva.xlsx'}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#CC1A00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#AA1500] transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
            Descargar Excel completado
          </a>
          <p className="text-xs text-[#999] mt-3">
            Tip: si cambiás el archivo, se genera un nuevo resultado.
          </p>
        </div>
      )}
    </div>
  )
}

