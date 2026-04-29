import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F4] px-4">
      <div className="text-center">
        <p className="text-4xl font-bold text-[#D94F3B]">Error</p>
        <p className="mt-2 text-[#5C4A3A]">Ocurrió un error durante la autenticación.</p>
        <Link
          href="/auth/login"
          className="mt-4 inline-block rounded-lg bg-[#E07B39] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C86B2A] transition"
        >
          Volver al login
        </Link>
      </div>
    </div>
  )
}
