import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function DashboardPage() {
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('centros_operativos')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] text-balance">Panel de Control</h1>
        <p className="mt-1.5 text-sm text-[#777]">Bienvenido al sistema de gestión de distancias operativas de Powersis.</p>
      </div>

      {/* Stats + cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Centros card */}
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-[#CC1A00]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#CC1A00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-4xl font-bold text-[#1A1A1A]">{count ?? 0}</span>
          </div>
          <p className="mt-4 text-sm font-semibold text-[#1A1A1A]">Centros Operativos</p>
          <p className="text-xs text-[#999] mt-0.5 mb-4">Bases cargadas en el sistema</p>
          <Link
            href="/dashboard/centros"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#CC1A00] hover:text-[#AA1500] transition"
          >
            Gestionar centros
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Busqueda card */}
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-[#CC1A00]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#CC1A00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-[#1A1A1A]">Búsqueda de Distancias</p>
          <p className="text-xs text-[#999] mt-0.5 mb-4">Calculá distancias por ruta via OSRM</p>
          <Link
            href="/dashboard/busqueda"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#CC1A00] hover:text-[#AA1500] transition"
          >
            Ir a búsqueda
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Quick access */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1A1A1A] mb-4">Acceso rápido</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/busqueda"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#CC1A00] text-white text-sm font-semibold hover:bg-[#AA1500] transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            Nueva búsqueda
          </Link>
          <Link
            href="/dashboard/centros"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E8E8E8] text-sm font-semibold text-[#555] hover:bg-[#F5F5F5] transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Agregar centro
          </Link>
        </div>
      </div>
    </div>
  )
}
