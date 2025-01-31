import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { hashPassword } from '@/utils/hash'

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD

export async function POST(request: Request) {
  const body = await request.json()
  const { password } = body

  if (!DASHBOARD_PASSWORD) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  if (password === DASHBOARD_PASSWORD) {
    // Generate a secure hash of the password
    const hash = await hashPassword(DASHBOARD_PASSWORD)

    const cookieStore = await cookies()
    cookieStore.set('auth', hash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24 hours
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json(
    { error: 'Invalid password' },
    { status: 401 }
  )
} 