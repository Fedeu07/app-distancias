import BusquedaMasivaClient from '@/components/BusquedaMasivaClient'

export const dynamic = 'force-dynamic'

export default function BusquedaMasivaPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] text-balance">Búsqueda Masiva</h1>
        <p className="mt-1.5 text-sm text-[#777]">
          Subí un Excel (.xlsx) con múltiples destinos y descargá el archivo con la distancia al centro operativo más cercano.
        </p>
      </div>
      <BusquedaMasivaClient />
    </div>
  )
}

