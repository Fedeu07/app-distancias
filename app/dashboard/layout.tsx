import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const session = cookieStore.get('powersis_session')?.value

  if (session !== 'authenticated') redirect('/auth/login')

  return (
    <div className="flex h-screen bg-[#F5F5F5] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
