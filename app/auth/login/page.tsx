'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (res.ok) {
      router.push('/dashboard')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.message ?? 'Usuario o contraseña incorrectos.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/powersis-logo.png"
            alt="Powersis Tecnología"
            width={220}
            height={60}
            className="object-contain mb-5"
            priority
          />
          <h1 className="text-xl font-bold text-[#1A1A1A] text-balance text-center">
            Calculador de Distancias
          </h1>
          <p className="mt-1 text-sm text-[#666]">Ingresá con tu usuario para continuar</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-sm">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-sm font-semibold text-[#1A1A1A]">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Usuario"
                className="w-full rounded-lg border border-[#D9D9D9] bg-[#FAFAFA] px-3 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#ABABAB] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/30 focus:border-[#CC1A00] transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-[#1A1A1A]">
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
                className="w-full rounded-lg border border-[#D9D9D9] bg-[#FAFAFA] px-3 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#ABABAB] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/30 focus:border-[#CC1A00] transition"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-[#CC1A00]/8 border border-[#CC1A00]/20 px-3 py-2 text-sm text-[#CC1A00]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-lg bg-[#CC1A00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#AA1500] focus:outline-none focus:ring-2 focus:ring-[#CC1A00]/40 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[#ABABAB]">
          Powersis Tecnología &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
