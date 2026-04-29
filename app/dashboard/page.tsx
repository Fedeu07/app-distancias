import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { count } = await supabase
    .from('centros_operativos')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#2C1F14] text-balance">Inicio</h1>
      <p className="mt-1 text-sm text-[#9C8E84]">Panel de gestión de distancias operativas</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {/* Card centros */}
        <div className="bg-white rounded-2xl border border-[#E5DDD5] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#E07B39]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#E07B39]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-[#2C1F14]">{count ?? 0}</span>
          </div>
          <p className="text-sm font-medium text-[#2C1F14]">Centros Operativos</p>
          <p className="text-xs text-[#9C8E84] mt-0.5">Bases cargadas en el sistema</p>
          <Link
            href="/dashboard/centros"
            className="mt-4 inline-flex items-center text-xs font-medium text-[#E07B39] hover:text-[#C86B2A] transition"
          >
            Ver todos
            <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Card busqueda */}
        <div className="bg-white rounded-2xl border border-[#E5DDD5] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#E07B39]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#E07B39]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium text-[#2C1F14]">Búsqueda de Distancias</p>
          <p className="text-xs text-[#9C8E84] mt-0.5">Calculá distancias por ruta OSRM</p>
          <Link
            href="/dashboard/busqueda"
            className="mt-4 inline-flex items-center text-xs font-medium text-[#E07B39] hover:text-[#C86B2A] transition"
          >
            Ir a busqueda
            <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
