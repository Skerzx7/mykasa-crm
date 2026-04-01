import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Vendedor from './pages/Vendedor'

function PrivateRoute({ children, role }) {
  const { user, userData, loading } = useAuth()
  if (loading) return null
  if (!user || !userData) return <Navigate to="/login" replace />
  if (userData.role !== role) return <Navigate to="/login" replace />
  return children
}

function LoginGuard() {
  const { user, userData, loading } = useAuth()
  if (loading) return null
  if (!user || !userData) return <Login />
  if (userData.role === 'admin') return <Navigate to="/admin" replace />
  if (userData.role === 'vendedor') return <Navigate to="/vendedor" replace />
  return <Login />
}

function HomeRedirect() {
  const { user, userData, loading } = useAuth()
  if (loading) return null
  if (!user || !userData) return <Navigate to="/login" replace />
  if (userData.role === 'admin') return <Navigate to="/admin" replace />
  if (userData.role === 'vendedor') return <Navigate to="/vendedor" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<LoginGuard />} />
            <Route path="/admin" element={<PrivateRoute role="admin"><Admin /></PrivateRoute>} />
            <Route path="/vendedor" element={<PrivateRoute role="vendedor"><Vendedor /></PrivateRoute>} />
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}