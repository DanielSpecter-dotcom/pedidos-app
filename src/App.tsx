import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppDataProvider } from './contexts/AppDataContext'
import { CartProvider } from './contexts/CartContext'
import { LoginPage } from './pages/LoginPage'
import { PedidosView } from './pages/PedidosView'
import { CocinaView } from './pages/CocinaView'
import { AppHeader } from './components/AppHeader'

function AuthenticatedApp() {
  const [vista, setVista] = useState<'pedidos' | 'cocina'>('pedidos')

  return (
    <CartProvider>
      <AppHeader vista={vista} onChangeVista={setVista} />
      <main className="flex-1 w-full max-w-[1600px] h-auto lg:h-full flex flex-col lg:overflow-hidden relative pb-40 lg:pb-0">
        {vista === 'pedidos' ? <PedidosView /> : <CocinaView onVolverAPedidos={() => setVista('pedidos')} />}
      </main>
    </CartProvider>
  )
}

function AppGate() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 text-slate-400 text-sm w-full">
        Conectando...
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <AppDataProvider>
      <AuthenticatedApp />
    </AppDataProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  )
}

export default App
