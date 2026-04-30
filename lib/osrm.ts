const OSRM_BASE = 'https://router.project-osrm.org'
const MAX_RETRIES = 4
const RETRY_BASE_MS = 1500 // espera base entre reintentos

/**
 * Fetch a OSRM con reintentos automáticos y backoff exponencial.
 * Reintenta en 429, 502, 503, 504 o errores de red.
 */
export async function osrmFetch(url: string): Promise<Response> {
  let lastError: Error = new Error('OSRM: sin respuesta')

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const wait = RETRY_BASE_MS * 2 ** (attempt - 1) // 1.5s, 3s, 6s
      await new Promise((r) => setTimeout(r, wait))
    }

    try {
      const res = await fetch(url, {
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(20000),
      })

      // Reintentar en errores transitorios de servidor
      if ([429, 502, 503, 504].includes(res.status)) {
        lastError = new Error(`OSRM HTTP ${res.status}`)
        continue
      }

      return res
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError
}

export { OSRM_BASE }
