import BusquedaClient from '@/components/BusquedaClient'

export default function BusquedaPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] text-balance">Búsqueda de Distancias</h1>
        <p className="mt-1.5 text-sm text-[#777]">
          Ingresá una ubicación y encontrá los centros operativos más cercanos por ruta
        </p>
      </div>
      <BusquedaClient />
    </div>
  )
}
