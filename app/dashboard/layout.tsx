import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const session = cookieStore.get('powersis_session')?.value

  if (session !== 'authenticated') redirect('/auth/login')

  return (
    <div className="flex min-h-screen bg-[#F5F5F5]">
      <Sidebar />
      <main className="flex-1 min-w-0 pt-14 md:pt-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
