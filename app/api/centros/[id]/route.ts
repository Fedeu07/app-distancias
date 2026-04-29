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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) return unauthorized()

  const { id } = await params
  const supabase = createAdminClient()
  const { nombre, lat, lon } = await request.json()

  if (!nombre || lat === undefined || lon === undefined) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('centros_operativos')
    .update({ nombre, lat, lon })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) return unauthorized()

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('centros_operativos')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
