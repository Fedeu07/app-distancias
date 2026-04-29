import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

function unauthorized() {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('powersis_session')?.value === 'authenticated'
}

export async function GET() {
  if (!await isAuthenticated()) return unauthorized()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('centros_operativos')
    .select('id, nombre, lat, lon, created_at')
    .order('nombre', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  if (!await isAuthenticated()) return unauthorized()

  const supabase = createAdminClient()
  const { nombre, lat, lon } = await request.json()

  if (!nombre || lat === undefined || lon === undefined) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('centros_operativos')
    .insert({ nombre, lat, lon })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
