import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [modo, setModo] = useState('pin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (pin.length === 4 && modo === 'pin') handlePin()
  }, [pin])

  const agregarDigito = d => { if (pin.length < 4 && !loading) setPin(p => p + d) }
  const borrar = () => { if (!loading) { setPin(p => p.slice(0, -1)); setError('') } }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handlePin = async () => {
    if (pin.length !== 4 || loading) return
    setLoading(true); setError('')
    try {
      await login(null, null, pin)
    } catch {
      setError('PIN incorrecto')
      setPin('')
      triggerShake()
    }
    setLoading(false)
  }

  const handleAdmin = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await login(email.trim(), password)
    } catch (err) {
      const msgs = {
        'auth/invalid-credential': 'Correo o contraseña incorrectos',
        'auth/user-not-found': 'Correo o contraseña incorrectos',
        'auth/wrong-password': 'Correo o contraseña incorrectos',
        'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
        'auth/invalid-email': 'Formato de correo inválido',
      }
      setError(msgs[err.code] || 'Error al iniciar sesión')
      triggerShake()
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080f0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Grid de fondo */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(74,222,128,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.03) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />
      {/* Glow central */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '380px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{
              width: '44px', height: '44px',
              background: 'linear-gradient(135deg, #166534, #4ade80)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 0 24px rgba(74,222,128,0.25)',
            }}><svg width="44" height="44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius:'12px', boxShadow:'0 0 24px rgba(74,222,128,0.25)' }}>
  <rect width="100" height="100" rx="18" fill="#0d1a10"/>
  <polygon points="50,14 86,42 14,42" fill="#4ade80"/>
  <rect x="20" y="42" width="60" height="44" rx="2" fill="#166534"/>
  <rect x="38" y="56" width="24" height="30" rx="2" fill="#0d1a10"/>
  <rect x="16" y="68" width="8" height="6" rx="1" fill="#4ade80" opacity="0.5"/>
  <rect x="79" y="68" width="8" height="6" rx="1" fill="#4ade80" opacity="0.5"/>
</svg></div>
            <div>
              <div style={{ color: '#e8f5ec', fontWeight: '700', fontSize: '18px', letterSpacing: '-0.3px' }}>MyKasa</div>
              <div style={{ color: '#3d5442', fontSize: '11px', fontWeight: '500', letterSpacing: '1.5px', textTransform: 'uppercase' }}>CRM · Gestión de ventas</div>
            </div>
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(74,222,128,0.4), transparent)' }} />
        </div>

        {/* Selector de modo */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(74,222,128,0.12)',
          borderRadius: '10px',
          padding: '3px',
          marginBottom: '24px',
          gap: '3px',
        }}>
          {[['pin', 'Vendedor'], ['admin', 'Administrador']].map(([m, l]) => (
            <button key={m} onClick={() => { setModo(m); setError(''); setPin('') }}
              style={{
                flex: 1, padding: '9px 12px',
                border: 'none', borderRadius: '8px',
                fontSize: '12px', fontWeight: '600',
                cursor: 'pointer',
                background: modo === m ? 'rgba(74,222,128,0.12)' : 'transparent',
                color: modo === m ? '#4ade80' : '#3d5442',
                transition: 'all 0.15s',
                letterSpacing: '0.3px',
              }}>
              {l}
            </button>
          ))}
        </div>

        {/* Panel principal */}
        <div style={{
          background: 'rgba(13,20,15,0.9)',
          border: '1px solid rgba(74,222,128,0.1)',
          borderRadius: '16px',
          padding: '28px 24px',
          backdropFilter: 'blur(20px)',
        }}>

          {/* PIN */}
          {modo === 'pin' && (
            <div>
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '13px', color: '#3d5442', marginBottom: '20px', letterSpacing: '0.2px' }}>
                  {loading ? 'Verificando acceso...' : 'Ingresa tu PIN de acceso'}
                </div>

                {/* Indicadores PIN */}
                <div style={{
                  display: 'flex', gap: '10px', justifyContent: 'center',
                  animation: shake ? 'shake 0.5s ease' : 'none',
                }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{
                      width: '14px', height: '14px',
                      borderRadius: '50%',
                      border: '1.5px solid',
                      borderColor: i < pin.length ? '#4ade80' : 'rgba(74,222,128,0.2)',
                      background: i < pin.length ? '#4ade80' : 'transparent',
                      transition: 'all 0.12s',
                      transform: i < pin.length ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: i < pin.length ? '0 0 10px rgba(74,222,128,0.5)' : 'none',
                    }} />
                  ))}
                </div>
              </div>

              {/* Teclado numérico */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {[1,2,3,4,5,6,7,8,9].map(d => (
                  <button key={d} onClick={() => agregarDigito(String(d))} disabled={loading}
                    style={{
                      padding: '17px 12px',
                      border: '1px solid rgba(74,222,128,0.1)',
                      borderRadius: '10px',
                      fontSize: '18px', fontWeight: '600',
                      background: 'rgba(255,255,255,0.03)',
                      color: '#c8e6d0',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.1s',
                      opacity: loading ? 0.5 : 1,
                      fontFamily: "'DM Mono', monospace",
                    }}
                    onMouseDown={e => { if (!loading) { e.currentTarget.style.transform = 'scale(0.94)'; e.currentTarget.style.background = 'rgba(74,222,128,0.08)' } }}
                    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}>
                    {d}
                  </button>
                ))}

                {/* Fila inferior */}
                <button onClick={borrar} disabled={loading}
                  style={{
                    padding: '17px 12px',
                    border: '1px solid rgba(248,113,113,0.15)',
                    borderRadius: '10px', fontSize: '16px',
                    background: 'rgba(248,113,113,0.05)',
                    color: '#f87171',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.1s', opacity: loading ? 0.5 : 1,
                  }}
                  onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.94)' }}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>⌫</button>

                <button onClick={() => agregarDigito('0')} disabled={loading}
                  style={{
                    padding: '17px 12px',
                    border: '1px solid rgba(74,222,128,0.1)',
                    borderRadius: '10px', fontSize: '18px', fontWeight: '600',
                    background: 'rgba(255,255,255,0.03)', color: '#c8e6d0',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.1s', opacity: loading ? 0.5 : 1,
                    fontFamily: "'DM Mono', monospace",
                  }}
                  onMouseDown={e => { if (!loading) { e.currentTarget.style.transform = 'scale(0.94)'; e.currentTarget.style.background = 'rgba(74,222,128,0.08)' } }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}>0</button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {loading && <div className="spinner" style={{ width: '20px', height: '20px', borderColor: 'rgba(74,222,128,0.2)', borderTopColor: '#4ade80' }} />}
                </div>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  color: '#f87171', padding: '10px 14px',
                  borderRadius: '8px', fontSize: '12px',
                  textAlign: 'center', fontWeight: '500',
                  letterSpacing: '0.2px',
                }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Admin */}
          {modo === 'admin' && (
            <form onSubmit={handleAdmin}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block', fontSize: '11px', fontWeight: '600',
                  color: '#3d5442', marginBottom: '8px',
                  textTransform: 'uppercase', letterSpacing: '1px',
                }}>Correo electrónico</label>
                <input
                  className="input"
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required autoFocus
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(74,222,128,0.15)', color: '#e8f5ec' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block', fontSize: '11px', fontWeight: '600',
                  color: '#3d5442', marginBottom: '8px',
                  textTransform: 'uppercase', letterSpacing: '1px',
                }}>Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    style={{ paddingRight: '44px', background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(74,222,128,0.15)', color: '#e8f5ec' }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none',
                      fontSize: '15px', cursor: 'pointer',
                      color: '#3d5442', padding: '4px',
                    }}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  color: '#f87171', padding: '10px 14px',
                  borderRadius: '8px', fontSize: '12px',
                  marginBottom: '16px', fontWeight: '500',
                }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '13px',
                  border: '1px solid rgba(74,222,128,0.3)',
                  borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                  background: loading ? 'rgba(74,222,128,0.05)' : 'rgba(74,222,128,0.1)',
                  color: loading ? '#3d5442' : '#4ade80',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s', letterSpacing: '0.3px',
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(74,222,128,0.16)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.5)' } }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.1)'; e.currentTarget.style.borderColor = 'rgba(74,222,128,0.3)' }}>
                {loading
                  ? <><div className="spinner" style={{ width: '16px', height: '16px', borderColor: 'rgba(74,222,128,0.2)', borderTopColor: '#4ade80' }} /><span>Verificando...</span></>
                  : 'Iniciar sesión →'
                }
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(74,222,128,0.08)' }} />
          <span style={{ color: '#1e3326', fontSize: '11px', fontWeight: '500', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
            San Francisco Acuautla · Ixtapaluca
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(74,222,128,0.08)' }} />
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) }
          20% { transform: translateX(-6px) }
          40% { transform: translateX(6px) }
          60% { transform: translateX(-4px) }
          80% { transform: translateX(4px) }
        }
      `}</style>
    </div>
  )
}