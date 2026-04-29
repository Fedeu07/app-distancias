import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const VALID_USERNAME = 'Powersis'
const VALID_PASSWORD = 'Powersis'
const SESSION_COOKIE = 'powersis_session'

export async function POST(request: Request) {
  const { username, password } = await request.json()

  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: false, message: 'Usuario o contraseña incorrectos.' }, { status: 401 })
}
