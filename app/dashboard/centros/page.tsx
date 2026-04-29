import CentrosClient from '@/components/CentrosClient'

export const dynamic = 'force-dynamic'

export default function CentrosPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2C1F14] text-balance">Centros Operativos</h1>
        <p className="mt-1 text-sm text-[#9C8E84]">Gestioná las bases del sistema</p>
      </div>
      <CentrosClient />
    </div>
  )
}
