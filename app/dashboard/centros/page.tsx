import CentrosClient from '@/components/CentrosClient'

export const dynamic = 'force-dynamic'

export default function CentrosPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] text-balance">Centros Operativos</h1>
        <p className="mt-1.5 text-sm text-[#777]">Gestioná las bases del sistema</p>
      </div>
      <CentrosClient />
    </div>
  )
}
