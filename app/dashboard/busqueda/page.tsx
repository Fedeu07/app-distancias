import BusquedaClient from '@/components/BusquedaClient'

export default function BusquedaPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2C1F14] text-balance">Búsqueda de Distancias</h1>
        <p className="mt-1 text-sm text-[#9C8E84]">
          Ingresá una ubicación y encontrá los centros operativos más cercanos por ruta
        </p>
      </div>
      <BusquedaClient />
    </div>
  )
}
