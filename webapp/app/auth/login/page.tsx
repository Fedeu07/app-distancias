'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Credenciales incorrectas. Verificá tu email y contraseña.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4] px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#E07B39] mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#2C1F14] text-balance">App Distancias</h1>
          <p className="mt-1 text-sm text-[#9C8E84]">Ingresá con tu cuenta para continuar</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E5DDD5] p-6 shadow-sm">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-[#2C1F14]">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-lg border border-[#E5DDD5] bg-[#FAF7F4] px-3 py-2.5 text-sm text-[#2C1F14] placeholder:text-[#9C8E84] focus:outline-none focus:ring-2 focus:ring-[#E07B39]/40 focus:border-[#E07B39] transition"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-[#2C1F14]">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-[#E5DDD5] bg-[#FAF7F4] px-3 py-2.5 text-sm text-[#2C1F14] placeholder:text-[#9C8E84] focus:outline-none focus:ring-2 focus:ring-[#E07B39]/40 focus:border-[#E07B39] transition"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-[#D94F3B]/10 border border-[#D94F3B]/20 px-3 py-2 text-sm text-[#D94F3B]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-lg bg-[#E07B39] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C86B2A] focus:outline-none focus:ring-2 focus:ring-[#E07B39]/50 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
