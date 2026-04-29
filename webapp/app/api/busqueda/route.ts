import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OSRM_BASE = 'https://router.project-osrm.org'

interface Centro {
  id: string
  nombre: string
  lat: number
  lon: number
}

// Haversine prefilter (km)
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lon = parseFloat(searchParams.get('lon') ?? '')
  const limitN = Math.min(parseInt(searchParams.get('limit') ?? '5', 10), 50)
  const maxKm = searchParams.get('max_km') ? parseFloat(searchParams.get('max_km')!) : null

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'lat y lon son requeridos y deben ser números' }, { status: 400 })
  }

  // Fetch all centros
  const supabase = await createClient()
  const { data: centros, error } = await supabase
    .from('centros_operativos')
    .select('id, nombre, lat, lon')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!centros || centros.length === 0) return NextResponse.json([])

  // Haversine pre-filter: keep closest N*4 to reduce OSRM calls
  const withHaversine = (centros as Centro[])
    .map(c => ({ ...c, hav: haversine(lat, lon, c.lat, c.lon) }))
    .sort((a, b) => a.hav - b.hav)

  // Apply max_km filter on haversine (conservative prefilter, multiply by 1.5)
  const candidates = maxKm
    ? withHaversine.filter(c => c.hav <= maxKm * 1.5)
    : withHaversine

  const pool = candidates.slice(0, Math.min(limitN * 4, 50))

  if (pool.length === 0) return NextResponse.json([])

  // Build OSRM Table API request
  // Format: /table/v1/{profile}/{src};{dst1};{dst2}...?sources=0&destinations=1;2;...
  const coords = [[lon, lat], ...pool.map(c => [c.lon, c.lat])]
  const coordStr = coords.map(([ln, lt]) => `${ln},${lt}`).join(';')
  const destinations = pool.map((_, i) => i + 1).join(';')
  const osrmUrl = `${OSRM_BASE}/table/v1/driving/${coordStr}?sources=0&destinations=${destinations}&annotations=duration,distance`

  let osrmData: {
    durations?: (number | null)[][]
    distances?: (number | null)[][]
    code?: string
  }
  try {
    const res = await fetch(osrmUrl, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)
    osrmData = await res.json()
  } catch (err) {
    return NextResponse.json({ error: `Error al consultar OSRM: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 502 })
  }

  if (osrmData.code !== 'Ok') {
    return NextResponse.json({ error: `OSRM error: ${osrmData.code}` }, { status: 502 })
  }

  const durations = osrmData.durations?.[0] ?? []
  const distances = osrmData.distances?.[0] ?? []

  // Build results
  const results = pool
    .map((c, i) => {
      const dur = durations[i]
      const dist = distances[i]
      if (dur === null || dist === null) return null
      return {
        id: c.id,
        nombre: c.nombre,
        lat: c.lat,
        lon: c.lon,
        distance_km: dist / 1000,
        duration_min: dur / 60,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .filter(r => maxKm === null || r.distance_km <= maxKm)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limitN)

  return NextResponse.json(results)
}
