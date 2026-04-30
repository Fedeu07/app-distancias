import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

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

// Calcula el centro más cercano a UN punto, idéntico al flujo de búsqueda individual
async function calcularCentroMasCercano(
  lat: number,
  lon: number,
  centros: Centro[]
): Promise<{ nombre: string; distancia_km: number } | null> {
  // Pre-filtro Haversine: los 10 más cercanos en línea recta
  const candidatos = centros
    .map((c) => ({ ...c, hav: haversine(lat, lon, c.lat, c.lon) }))
    .sort((a, b) => a.hav - b.hav)
    .slice(0, 10)

  if (candidatos.length === 0) return null

  // Construir URL OSRM igual que en búsqueda individual
  const coords = [[lon, lat], ...candidatos.map((c) => [c.lon, c.lat])]
  const coordStr = coords.map(([ln, lt]) => `${ln},${lt}`).join(';')
  const destinations = candidatos.map((_, i) => i + 1).join(';')
  const osrmUrl = `${OSRM_BASE}/table/v1/driving/${coordStr}?sources=0&destinations=${destinations}&annotations=duration,distance`

  try {
    const res = await fetch(osrmUrl, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)
    const osrmData = await res.json()

    if (osrmData.code !== 'Ok') throw new Error(`OSRM code: ${osrmData.code}`)

    const distances: (number | null)[] = osrmData.distances?.[0] ?? []

    // Ordenar por distancia real de ruta y tomar el más cercano
    let mejorIdx = -1
    let mejorDist = Infinity
    distances.forEach((d, i) => {
      if (d !== null && d < mejorDist) {
        mejorDist = d
        mejorIdx = i
      }
    })

    if (mejorIdx === -1) return null

    return {
      nombre: candidatos[mejorIdx].nombre,
      distancia_km: Math.round((mejorDist / 1000) * 100) / 100,
    }
  } catch {
    // Fallback a Haversine si OSRM falla para este punto
    return {
      nombre: candidatos[0].nombre,
      distancia_km: Math.round(candidatos[0].hav * 100) / 100,
    }
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const session = cookieStore.get('powersis_session')
  if (!session?.value) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { puntos } = body as { puntos: { lat: number; lon: number }[] }

  if (!puntos || !Array.isArray(puntos) || puntos.length === 0) {
    return NextResponse.json({ error: 'Se requiere un array de puntos' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: centros, error } = await supabase
    .from('centros_operativos')
    .select('id, nombre, lat, lon')

  if (error || !centros || centros.length === 0) {
    return NextResponse.json({ error: 'No se pudieron obtener los centros' }, { status: 500 })
  }

  // Procesar cada punto SECUENCIALMENTE para no saturar OSRM y obtener
  // resultados correctos — idéntico al flujo de búsqueda individual
  const resultados = []
  for (const punto of puntos) {
    const resultado = await calcularCentroMasCercano(punto.lat, punto.lon, centros as Centro[])
    resultados.push({ lat: punto.lat, lon: punto.lon, centro_mas_cercano: resultado })
  }

  return NextResponse.json({ resultados })
}
