import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import * as XLSX from 'xlsx'

const OSRM_BASE = 'https://router.project-osrm.org'

interface Centro {
  id: string
  nombre: string
  lat: number
  lon: number
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('powersis_session')?.value === 'authenticated'
}

type RowTask = {
  rowIndex: number
  lat: number
  lon: number
}

type RowResult = {
  rowIndex: number
  distanceKm: number | null
  centroNombre: string | null
  error?: string
}

function parseNumberLoose(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const trimmed = v.trim()
    if (!trimmed) return null
    // Soporta coma decimal
    const normalized = trimmed.replace(',', '.')
    const n = Number(normalized)
    if (Number.isFinite(n)) return n
  }
  return null
}

function isValidLatLon(lat: number, lon: number) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}

async function osrmTableDistancesKm(
  sources: { lat: number; lon: number }[],
  destinos: { lat: number; lon: number }[]
): Promise<(number | null)[][]> {
  const coords = [...sources.map(p => [p.lon, p.lat] as const), ...destinos.map(p => [p.lon, p.lat] as const)]
  const coordStr = coords.map(([ln, lt]) => `${ln},${lt}`).join(';')
  const sourcesIdx = sources.map((_, i) => i).join(';')
  const destIdx = destinos.map((_, i) => i + sources.length).join(';')
  const osrmUrl = `${OSRM_BASE}/table/v1/driving/${coordStr}?sources=${sourcesIdx}&destinations=${destIdx}&annotations=distance`

  const res = await fetch(osrmUrl, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)
  const data: { code?: string; distances?: (number | null)[][] } = await res.json()
  if (data.code !== 'Ok') throw new Error(`OSRM error: ${data.code}`)

  const distancesM = data.distances ?? []
  return distancesM.map(row => row.map(v => (v === null ? null : v / 1000)))
}

function setCellAoA(
  sheet: XLSX.WorkSheet,
  r: number,
  c: number,
  v: string | number | boolean | Date | null | undefined
) {
  // r y c son 0-based sobre el AoA. XLSX usa 1-based internamente.
  const addr = XLSX.utils.encode_cell({ r, c })
  const mutable = sheet as Record<string, unknown>
  if (v === null || v === undefined || v === '') {
    delete mutable[addr]
    return
  }
  const cell: XLSX.CellObject =
    typeof v === 'number'
      ? { t: 'n', v }
      : typeof v === 'boolean'
        ? { t: 'b', v }
        : v instanceof Date
          ? { t: 'd', v }
          : { t: 's', v }
  mutable[addr] = cell
}

function ensureRange(sheet: XLSX.WorkSheet, r: number, c: number) {
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1')
  range.e.r = Math.max(range.e.r, r)
  range.e.c = Math.max(range.e.c, c)
  sheet['!ref'] = XLSX.utils.encode_range(range)
}

function excelColToIndex(col: string): number | null {
  const c = col.trim().toUpperCase()
  if (!/^[A-Z]+$/.test(c)) return null
  let n = 0
  for (let i = 0; i < c.length; i++) {
    n = n * 26 + (c.charCodeAt(i) - 64) // A=1
  }
  return n - 1 // 0-based
}

export async function POST(request: Request) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const latColRaw = (form?.get('lat_col') ?? 'H') as string
  const lonColRaw = (form?.get('lon_col') ?? 'I') as string
  const kmColRaw = (form?.get('km_col') ?? 'J') as string
  const centroColRaw = (form?.get('centro_col') ?? '') as string
  const startRowRaw = (form?.get('start_row') ?? '2') as string
  const endRowRaw = (form?.get('end_row') ?? '') as string

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo .xlsx (campo "file")' }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return NextResponse.json({ error: 'El archivo debe ser .xlsx' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: centros, error } = await supabase
    .from('centros_operativos')
    .select('id, nombre, lat, lon')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!centros || centros.length === 0) {
    return NextResponse.json({ error: 'No hay centros operativos cargados' }, { status: 400 })
  }

  // Parse del Excel
  const buf = Buffer.from(await file.arrayBuffer())
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return NextResponse.json({ error: 'El Excel no tiene hojas' }, { status: 400 })
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return NextResponse.json({ error: 'No se pudo leer la hoja del Excel' }, { status: 400 })

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' }) as unknown[][]

  const colLat = excelColToIndex(latColRaw)
  const colLon = excelColToIndex(lonColRaw)
  const colKm = excelColToIndex(kmColRaw)
  const colCentroProvided = centroColRaw.trim() ? excelColToIndex(centroColRaw) : null

  if (colLat === null) return NextResponse.json({ error: `Columna latitud inválida: "${latColRaw}"` }, { status: 400 })
  if (colLon === null) return NextResponse.json({ error: `Columna longitud inválida: "${lonColRaw}"` }, { status: 400 })
  if (colKm === null) return NextResponse.json({ error: `Columna salida km inválida: "${kmColRaw}"` }, { status: 400 })
  if (colCentroProvided === null && centroColRaw.trim()) {
    return NextResponse.json({ error: `Columna salida sede inválida: "${centroColRaw}"` }, { status: 400 })
  }

  const startRow1 = Math.max(parseInt(startRowRaw || '1', 10) || 1, 1)
  const endRow1 = endRowRaw.trim() ? (parseInt(endRowRaw, 10) || 0) : 0
  if (endRow1 && endRow1 < startRow1) {
    return NextResponse.json({ error: 'Fila fin no puede ser menor que fila inicio' }, { status: 400 })
  }

  const startRow0 = startRow1 - 1
  const endRow0 = endRow1 ? endRow1 - 1 : (rows.length - 1)

  const colCentro = colCentroProvided

  const tasks: RowTask[] = []
  let invalidCount = 0

  for (let r = startRow0; r <= Math.min(endRow0, rows.length - 1); r++) {
    const row = rows[r] ?? []
    const lat = parseNumberLoose(row[colLat])
    const lon = parseNumberLoose(row[colLon])
    if (lat === null || lon === null || !isValidLatLon(lat, lon)) {
      invalidCount++
      ensureRange(sheet, r, colKm)
      setCellAoA(sheet, r, colKm, null)
      if (colCentro !== null) {
        ensureRange(sheet, r, colCentro)
        setCellAoA(sheet, r, colCentro, 'Coordenadas inválidas')
      }
      continue
    }
    tasks.push({ rowIndex: r, lat, lon })
  }

  const centrosArr = centros as Centro[]
  const warnings: string[] = []
  if (invalidCount > 0) warnings.push(`${invalidCount} fila(s) con coordenadas inválidas (no se calcularon).`)

  // Lotes para OSRM: coordinadas via URL, evitamos URLs gigantes.
  // Incluimos todos los centros como destinos por lote (matriz N x M).
  const MAX_SOURCES_PER_BATCH = 25
  const results: RowResult[] = []
  let osrmFailures = 0

  for (let i = 0; i < tasks.length; i += MAX_SOURCES_PER_BATCH) {
    const batch = tasks.slice(i, i + MAX_SOURCES_PER_BATCH)
    try {
      const matrixKm = await osrmTableDistancesKm(
        batch.map(b => ({ lat: b.lat, lon: b.lon })),
        centrosArr.map(c => ({ lat: c.lat, lon: c.lon }))
      )

      for (let bi = 0; bi < batch.length; bi++) {
        const rowDistances = matrixKm[bi] ?? []
        let bestIdx = -1
        let bestKm = Number.POSITIVE_INFINITY
        for (let ci = 0; ci < rowDistances.length; ci++) {
          const km = rowDistances[ci]
          if (km === null || !Number.isFinite(km)) continue
          if (km < bestKm) {
            bestKm = km
            bestIdx = ci
          }
        }

        if (bestIdx === -1) {
          results.push({
            rowIndex: batch[bi].rowIndex,
            distanceKm: null,
            centroNombre: null,
            error: 'OSRM sin datos',
          })
        } else {
          results.push({
            rowIndex: batch[bi].rowIndex,
            distanceKm: bestKm,
            centroNombre: centrosArr[bestIdx]?.nombre ?? null,
          })
        }
      }
    } catch {
      osrmFailures++
      // Fallback rápido (línea recta): garantiza salida aunque OSRM falle o limite.
      for (const t of batch) {
        let best = centrosArr[0]
        let bestKm = haversine(t.lat, t.lon, best.lat, best.lon)
        for (let ci = 1; ci < centrosArr.length; ci++) {
          const c = centrosArr[ci]
          const km = haversine(t.lat, t.lon, c.lat, c.lon)
          if (km < bestKm) {
            bestKm = km
            best = c
          }
        }
        results.push({
          rowIndex: t.rowIndex,
          distanceKm: bestKm,
          centroNombre: best?.nombre ?? null,
          error: 'OSRM falló; se usó Haversine',
        })
      }
    }
  }

  if (osrmFailures > 0) {
    warnings.push(`OSRM falló en ${osrmFailures} lote(s); esas filas se resolvieron con distancia Haversine (aproximada).`)
  }

  // Escribir resultados en columnas J y K.
  for (const r of results) {
    ensureRange(sheet, r.rowIndex, colKm)
    if (colCentro !== null) ensureRange(sheet, r.rowIndex, colCentro)
    if (r.distanceKm === null) {
      setCellAoA(sheet, r.rowIndex, colKm, null)
      if (colCentro !== null) setCellAoA(sheet, r.rowIndex, colCentro, r.error ?? 'Sin resultado')
      continue
    }

    // Redondeo a 2 decimales, sin perder tipo numérico.
    const kmRounded = Math.round(r.distanceKm * 100) / 100
    setCellAoA(sheet, r.rowIndex, colKm, kmRounded)
    if (colCentro !== null) setCellAoA(sheet, r.rowIndex, colCentro, r.centroNombre ?? (r.error ?? ''))
  }

  const outBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer
  const body = new Uint8Array(outBuf)
  const headers = new Headers()
  headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  headers.set('Content-Disposition', `attachment; filename="resultado_${file.name.replace(/"/g, '')}"`)
  if (warnings.length > 0) headers.set('x-bulk-warnings', warnings.join(' '))

  return new NextResponse(body, { status: 200, headers })
}

