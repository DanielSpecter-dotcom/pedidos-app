import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export type Rol = 'admin' | 'mesero'

interface AuthContextValue {
  session: Session | null
  rol: Rol
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

// El rol se guarda en el metadata del usuario en Supabase Auth (Authentication →
// Users → editar usuario → Raw User Meta Data: {"role": "admin"}). Cualquier
// usuario sin ese campo (o con un valor que no sea "admin") cae en "mesero" —
// el rol con menos permisos, para que un dato faltante nunca otorgue de más.
function obtenerRol(session: Session | null): Rol {
  return session?.user?.user_metadata?.role === 'admin' ? 'admin' : 'mesero'
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  async function login(username: string, password: string) {
    const correoEmpresa = `${username}@melchorita.rest`
    const { error } = await supabase.auth.signInWithPassword({
      email: correoEmpresa,
      password,
    })
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Usuario o contraseña incorrectos.')
      }
      throw error
    }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, rol: obtenerRol(session), loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
