import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(username.trim(), password.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-gray-50 flex items-center justify-center min-h-[100dvh] px-4 w-full">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-guinda to-guinda-dark rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-guinda/20 mx-auto mb-6">
          M
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Melchorita</h1>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-8">Acceso Interno</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
              Usuario del Mesero
            </label>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:bg-white focus-within:border-guinda focus-within:ring-2 focus-within:ring-guinda/10 transition-all">
              <span className="text-gray-400 mr-2">👤</span>
              <input
                type="text"
                required
                placeholder="Ej: juan"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-transparent border-none outline-none flex-1 text-sm font-semibold text-gray-800 placeholder-gray-300 w-full"
              />
            </div>
          </div>

          <div className="text-left">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
              Contraseña
            </label>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:bg-white focus-within:border-guinda focus-within:ring-2 focus-within:ring-guinda/10 transition-all">
              <span className="text-gray-400 mr-2">🔒</span>
              <input
                type="password"
                required
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent border-none outline-none flex-1 text-sm font-semibold text-gray-800 placeholder-gray-300 w-full"
              />
            </div>
          </div>

          {error && <p className="text-xs font-bold text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-guinda to-guinda-light text-white font-black py-3.5 rounded-xl text-sm shadow-lg shadow-guinda/30 active:scale-95 transition-all mt-4 flex justify-center items-center gap-2 hover:shadow-xl hover:shadow-guinda/40 disabled:opacity-70"
          >
            {submitting ? (
              <>
                <span className="animate-spin inline-block">↻</span> Validando...
              </>
            ) : (
              <>
                INICIAR SESIÓN <span className="text-lg leading-none">➜</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
