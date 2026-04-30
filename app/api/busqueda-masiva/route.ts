import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

// Haversine en km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
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

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const session = cookieStore.get('powersis_session')
  if (!session?.value) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { puntos } = body as { puntos: { lat: number; lon: number; id?: string }[] }

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

  const resultados = await Promise.all(
    puntos.map(async (punto) => {
      // Pre-filtro Haversine: los 10 más cercanos en línea recta
      const conDistancia = centros
        .map((c) => ({
          ...c,
          distancia_linea: haversine(punto.lat, punto.lon, c.lat, c.lon),
        }))
        .sort((a, b) => a.distancia_linea - b.distancia_linea)
        .slice(0, 10)

      // Llamada OSRM Table API
      const coordsStr = [
        `${punto.lon},${punto.lat}`,
        ...conDistancia.map((c) => `${c.lon},${c.lat}`),
      ].join(';')

      const srcIndices = '0'
      const dstIndices = conDistancia.map((_, i) => i + 1).join(';')

      try {
        const osrmUrl = `https://router.project-osrm.org/table/v1/driving/${coordsStr}?sources=${srcIndices}&destinations=${dstIndices}&annotations=distance,duration`
        const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(10000) })
        const osrmData = await osrmRes.json()

        if (osrmData.code !== 'Ok') throw new Error('OSRM error')

        const distances = osrmData.distances?.[0] ?? []
        const durations = osrmData.durations?.[0] ?? []

        const ranked = conDistancia
          .map((c, i) => ({
            id: c.id,
            nombre: c.nombre,
            lat: c.lat,
            lon: c.lon,
            distancia_km: distances[i] != null ? Math.round(distances[i] / 10) / 100 : null,
            duracion_min: durations[i] != null ? Math.round(durations[i] / 60) : null,
          }))
          .filter((r) => r.distancia_km != null)
          .sort((a, b) => (a.distancia_km ?? 0) - (b.distancia_km ?? 0))

        return {
          punto_id: punto.id ?? null,
          lat: punto.lat,
          lon: punto.lon,
          centro_mas_cercano: ranked[0] ?? null,
          todos: ranked,
        }
      } catch {
        // Fallback a Haversine si OSRM falla
        const ranked = conDistancia
          .sort((a, b) => a.distancia_linea - b.distancia_linea)
          .map((c) => ({
            id: c.id,
            nombre: c.nombre,
            lat: c.lat,
            lon: c.lon,
            distancia_km: Math.round(c.distancia_linea * 100) / 100,
            duracion_min: null,
          }))

        return {
          punto_id: punto.id ?? null,
          lat: punto.lat,
          lon: punto.lon,
          centro_mas_cercano: ranked[0] ?? null,
          todos: ranked,
        }
      }
    })
  )

  return NextResponse.json({ resultados })
}
