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

  // Auto-submit cuando PIN completo
  useEffect(() => {
    if (pin.length === 4 && modo === 'pin') handlePin()
  }, [pin])

  const agregarDigito = d => { if (pin.length < 4 && !loading) setPin(p => p + d) }
  const borrar = () => { if (!loading) setPin(p => p.slice(0, -1)); setError('') }

  const handlePin = async () => {
    if (pin.length !== 4 || loading) return
    setLoading(true); setError('')
    try {
      await login(null, null, pin)
    } catch {
      setError('PIN incorrecto. Verifica e intenta de nuevo.')
      setPin('')
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
        'auth/invalid-email': 'El correo no tiene un formato válido'
      }
      setError(msgs[err.code] || 'Error al iniciar sesión')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(145deg,#052e16 0%,#0f2318 30%,#1a3a2a 65%,#2d6a4f 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', position:'relative', overflow:'hidden' }}>
      {/* Blobs decorativos */}
      <div style={{ position:'absolute',top:'-15%',right:'-10%',width:'500px',height:'500px',background:'radial-gradient(circle,rgba(74,222,128,0.08) 0%,transparent 65%)',borderRadius:'50%',pointerEvents:'none' }} />
      <div style={{ position:'absolute',bottom:'-20%',left:'-15%',width:'600px',height:'600px',background:'radial-gradient(circle,rgba(45,106,79,0.1) 0%,transparent 65%)',borderRadius:'50%',pointerEvents:'none' }} />
      <div style={{ position:'absolute',top:'50%',left:'5%',width:'300px',height:'300px',background:'radial-gradient(circle,rgba(74,222,128,0.04) 0%,transparent 65%)',borderRadius:'50%',pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:'400px', animation:'bounceIn 0.4s ease forwards' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ width:'72px',height:'72px',background:'linear-gradient(135deg,#2d6a4f,#4ade80)',borderRadius:'22px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',boxShadow:'0 8px 32px rgba(74,222,128,0.35)',fontSize:'34px' }}>🏡</div>
          <h1 style={{ color:'white',fontSize:'26px',fontWeight:'800',margin:'0 0 4px',letterSpacing:'-0.5px' }}>MyKasa CRM</h1>
          <p style={{ color:'rgba(134,239,172,0.7)',fontSize:'13px' }}>Gestión de clientes y vendedores</p>
        </div>

        {/* Card */}
        <div style={{ background:'rgba(255,255,255,0.98)',borderRadius:'22px',padding:'26px',boxShadow:'0 32px 80px rgba(0,0,0,0.35)' }}>
          {/* Toggle */}
          <div style={{ display:'flex',background:'#f0f4f1',borderRadius:'10px',padding:'4px',marginBottom:'22px',gap:'4px' }}>
            {[['pin','🔢 PIN Vendedor'],['admin','🔑 Admin']].map(([m,l]) => (
              <button key={m} onClick={() => { setModo(m); setError(''); setPin('') }} style={{ flex:1,padding:'8px',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'700',cursor:'pointer',background:modo===m?'white':'transparent',color:modo===m?'#0f2318':'var(--text3)',boxShadow:modo===m?'var(--sh-sm)':'none',transition:'all 0.15s' }}>
                {l}
              </button>
            ))}
          </div>

          {/* PIN */}
          {modo === 'pin' && (
            <div>
              <p style={{ fontSize:'13px',color:'var(--text3)',textAlign:'center',marginBottom:'18px' }}>
                {loading ? 'Verificando...' : 'Ingresa tu PIN de 4 dígitos'}
              </p>

              {/* Puntos */}
              <div style={{ display:'flex',justifyContent:'center',gap:'14px',marginBottom:'24px' }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width:'16px',height:'16px',borderRadius:'50%',transition:'all 0.15s', background:i<pin.length?'#2d6a4f':'#e0ebe4', transform:i<pin.length?'scale(1.25)':'scale(1)', boxShadow:i<pin.length?'0 2px 8px rgba(45,106,79,0.5)':'none' }} />
                ))}
              </div>

              {/* Teclado */}
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'9px',marginBottom:'12px' }}>
                {[1,2,3,4,5,6,7,8,9].map(d => (
                  <button key={d} onClick={() => agregarDigito(String(d))} disabled={loading}
                    style={{ padding:'15px',border:'1.5px solid #e0ebe4',borderRadius:'12px',fontSize:'20px',fontWeight:'700',background:'white',color:'#0f2318',cursor:loading?'not-allowed':'pointer',transition:'all 0.1s',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',opacity:loading?0.7:1 }}
                    onMouseDown={e => { if(!loading) e.currentTarget.style.transform='scale(0.93)' }}
                    onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
                    onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
                    {d}
                  </button>
                ))}
                <button onClick={borrar} disabled={loading}
                  style={{ padding:'15px',border:'1.5px solid #e0ebe4',borderRadius:'12px',fontSize:'18px',background:'#fef2f2',color:'#dc2626',cursor:loading?'not-allowed':'pointer',transition:'all 0.1s',opacity:loading?0.7:1 }}
                  onMouseDown={e => { if(!loading) e.currentTarget.style.transform='scale(0.93)' }}
                  onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
                  onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>⌫</button>
                <button onClick={() => agregarDigito('0')} disabled={loading}
                  style={{ padding:'15px',border:'1.5px solid #e0ebe4',borderRadius:'12px',fontSize:'20px',fontWeight:'700',background:'white',color:'#0f2318',cursor:loading?'not-allowed':'pointer',transition:'all 0.1s',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',opacity:loading?0.7:1 }}
                  onMouseDown={e => { if(!loading) e.currentTarget.style.transform='scale(0.93)' }}
                  onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
                  onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>0</button>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'center' }}>
                  {loading && <div className="spinner spinner-dark" style={{ width:'22px',height:'22px' }} />}
                </div>
              </div>

              {error && (
                <div style={{ background:'#fee2e2',color:'#dc2626',padding:'10px 12px',borderRadius:'10px',fontSize:'12px',textAlign:'center',fontWeight:'600',border:'1px solid #fecaca',animation:'fadeIn 0.2s ease' }}>
                  ⚠️ {error}
                </div>
              )}
            </div>
          )}

          {/* Admin */}
          {modo === 'admin' && (
            <form onSubmit={handleAdmin}>
              <div style={{ marginBottom:'14px' }}>
                <label style={{ display:'block',fontSize:'12px',fontWeight:'700',color:'#3d5a47',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.5px' }}>Correo electrónico</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required autoFocus />
              </div>
              <div style={{ marginBottom:'18px' }}>
                <label style={{ display:'block',fontSize:'12px',fontWeight:'700',color:'#3d5a47',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.5px' }}>Contraseña</label>
                <div style={{ position:'relative' }}>
                  <input className="input" type={showPass?'text':'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ paddingRight:'42px' }} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position:'absolute',right:'11px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',fontSize:'16px',cursor:'pointer',color:'var(--text4)',padding:'4px' }}>
                    {showPass?'🙈':'👁️'}
                  </button>
                </div>
              </div>
              {error && <div style={{ background:'#fee2e2',color:'#dc2626',padding:'11px 12px',borderRadius:'10px',fontSize:'13px',marginBottom:'14px',fontWeight:'600',border:'1px solid #fecaca' }}>⚠️ {error}</div>}
              <button type="submit" disabled={loading} style={{ width:'100%',padding:'13px',border:'none',borderRadius:'12px',fontSize:'15px',fontWeight:'700',background:loading?'#9ab8a4':'linear-gradient(135deg,#2d6a4f,#40916c)',color:'white',cursor:loading?'not-allowed':'pointer',boxShadow:loading?'none':'0 4px 14px rgba(45,106,79,0.4)',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',transition:'all 0.2s' }}>
                {loading ? <><div className="spinner" /><span>Entrando...</span></> : '→ Iniciar sesión'}
              </button>
            </form>
          )}
        </div>

        <p style={{ color:'rgba(134,239,172,0.35)',fontSize:'12px',textAlign:'center',marginTop:'20px' }}>
          MyKasa · San Francisco Acuautla, Ixtapaluca
        </p>
      </div>
    </div>
  )
}
