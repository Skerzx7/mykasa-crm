import React from 'react'
import { useAuth } from '../context/AuthContext'

export default function Navbar({ tabs, tabActivo, onTab }) {
  const { userData, logout } = useAuth()
  const isAdmin = userData?.role === 'admin'

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>

      {/* Barra principal */}
      <nav style={{
        background: '#080f0a',
        padding: '0 20px',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(74,222,128,0.08)',
        position: 'relative',
      }}>

        {/* Línea de acento izquierda */}
        <div style={{
          position: 'absolute', left: 0, top: '20%', bottom: '20%',
          width: '2px',
          background: 'linear-gradient(to bottom, transparent, #4ade80, transparent)',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px' }}>
          <div style={{
            width: '30px', height: '30px',
            background: 'linear-gradient(135deg, #166534, #22c55e)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px',
            flexShrink: 0,
            boxShadow: '0 0 12px rgba(74,222,128,0.2)',
          }}>🏡</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ color: '#e8f5ec', fontWeight: '700', fontSize: '14px', letterSpacing: '-0.2px' }}>MyKasa</span>
            <span style={{
              color: '#1e3326', fontSize: '10px', fontWeight: '600',
              letterSpacing: '1.5px', textTransform: 'uppercase',
            }}>CRM</span>
          </div>
        </div>

        {/* Usuario y logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(74,222,128,0.08)',
            borderRadius: '8px',
            padding: '5px 10px',
          }}>
            {/* Avatar */}
            <div style={{
              width: '24px', height: '24px',
              borderRadius: '50%',
              background: isAdmin
                ? 'linear-gradient(135deg, #166534, #4ade80)'
                : 'linear-gradient(135deg, #1e3a8a, #60a5fa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: '700', color: 'white',
              flexShrink: 0,
            }}>
              {userData?.nombre?.charAt(0)?.toUpperCase() || '?'}
            </div>

            <div>
              <div style={{
                color: '#c8e6d0', fontSize: '12px', fontWeight: '600',
                maxWidth: '110px', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                lineHeight: 1.2,
              }}>{userData?.nombre}</div>
              <div style={{
                fontSize: '9px', fontWeight: '700',
                letterSpacing: '1px', textTransform: 'uppercase',
                color: isAdmin ? '#4ade80' : '#60a5fa',
                marginTop: '1px',
              }}>{isAdmin ? 'Admin' : 'Vendedor'}</div>
            </div>
          </div>

          <button onClick={() => { if(confirm('¿Recargar la app? Se cerrará tu sesión actual.')) { logout(); window.location.reload() } }}
            title="Recargar"
            style={{
              background: 'transparent',
              border: '1px solid rgba(74,222,128,0.12)',
              borderRadius: '7px',
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '15px', color: '#3d5442',
              flexShrink: 0,
            }}>↺</button>

          <button onClick={logout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(248,113,113,0.15)',
              borderRadius: '7px',
              padding: '6px 12px',
              fontSize: '11px', fontWeight: '600',
              color: '#6b3535',
              cursor: 'pointer',
              transition: 'all 0.15s',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(248,113,113,0.08)'
              e.currentTarget.style.color = '#f87171'
              e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#6b3535'
              e.currentTarget.style.borderColor = 'rgba(248,113,113,0.15)'
            }}>
            Salir
          </button>
        </div>
      </nav>

      {/* Tabs */}
      {tabs && (
        <div style={{
          background: '#0a0f0d',
          padding: '0 20px',
          display: 'flex',
          gap: '0',
          borderBottom: '1px solid rgba(74,222,128,0.06)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {tabs.map(([key, icon, label]) => {
            const active = tabActivo === key
            return (
              <button key={key} onClick={() => onTab(key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active ? '2px solid #4ade80' : '2px solid transparent',
                  padding: '11px 16px',
                  fontSize: '12px',
                  fontWeight: active ? '700' : '500',
                  color: active ? '#4ade80' : '#2d4a36',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  letterSpacing: active ? '0.2px' : '0',
                  flexShrink: 0,
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#4a6e55' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#2d4a36' }}>
                <span style={{ fontSize: '13px', opacity: active ? 1 : 0.6 }}>{icon}</span>
                <span className="hide-mobile">{label}</span>
                {active && (
                  <span style={{
                    position: 'absolute', bottom: '-1px', left: '50%',
                    transform: 'translateX(-50%)',
                    width: '4px', height: '4px',
                    background: '#4ade80', borderRadius: '50%',
                    boxShadow: '0 0 6px #4ade80',
                  }} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}