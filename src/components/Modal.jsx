import React, { useEffect } from 'react'

export default function Modal({ titulo, onClose, children, size = 'md' }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const widths = { sm: '360px', md: '480px', lg: '600px' }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(4,8,5,0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease',
      }}>
      <div style={{
        background: '#0d140f',
        border: '1px solid rgba(74,222,128,0.12)',
        borderRadius: '16px',
        width: '100%', maxWidth: widths[size],
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(74,222,128,0.05)',
        animation: 'scaleIn 0.18s ease',
        position: 'relative',
      }}>
        {/* Línea de acento top */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(74,222,128,0.4), transparent)',
          borderRadius: '0 0 4px 4px',
        }} />

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 22px 16px',
          borderBottom: '1px solid rgba(74,222,128,0.07)',
          position: 'sticky', top: 0,
          background: '#0d140f',
          zIndex: 1,
          borderRadius: '16px 16px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '3px', height: '16px',
              background: 'linear-gradient(to bottom, #4ade80, #166534)',
              borderRadius: '2px',
            }} />
            <h3 style={{
              fontSize: '15px', fontWeight: '600',
              color: '#c8e6d0', margin: 0,
              letterSpacing: '-0.2px',
            }}>{titulo}</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid rgba(74,222,128,0.1)',
              borderRadius: '7px',
              width: '30px', height: '30px',
              fontSize: '13px', cursor: 'pointer',
              color: '#3d5442',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(248,113,113,0.08)'
              e.currentTarget.style.color = '#f87171'
              e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#3d5442'
              e.currentTarget.style.borderColor = 'rgba(74,222,128,0.1)'
            }}>✕</button>
        </div>

        {/* Contenido */}
        <div style={{ padding: '22px 22px 26px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function Field({ label, required, hint, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        fontSize: '11px', fontWeight: '600',
        color: '#3d5442', marginBottom: '7px',
        textTransform: 'uppercase', letterSpacing: '0.8px',
      }}>
        {label}
        {required && <span style={{ color: '#f87171', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
      {hint && (
        <p style={{
          fontSize: '11px', color: '#2d4a36',
          marginTop: '5px', lineHeight: '1.5',
        }}>{hint}</p>
      )}
    </div>
  )
}

export function ModalActions({ onCancel, onSave, loading, saveLabel = 'Guardar', danger }) {
  return (
    <div style={{
      display: 'flex', gap: '10px', justifyContent: 'flex-end',
      marginTop: '22px', paddingTop: '18px',
      borderTop: '1px solid rgba(74,222,128,0.07)',
    }}>
      <button onClick={onCancel}
        style={{
          padding: '9px 18px',
          background: 'transparent',
          border: '1px solid rgba(74,222,128,0.12)',
          borderRadius: '8px',
          fontSize: '13px', fontWeight: '500',
          color: '#3d5442', cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(74,222,128,0.25)'; e.currentTarget.style.color = '#4a6e55' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(74,222,128,0.12)'; e.currentTarget.style.color = '#3d5442' }}>
        Cancelar
      </button>
      <button onClick={onSave} disabled={loading}
        style={{
          padding: '9px 20px',
          minWidth: '110px',
          background: danger ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)',
          border: `1px solid ${danger ? 'rgba(248,113,113,0.25)' : 'rgba(74,222,128,0.25)'}`,
          borderRadius: '8px',
          fontSize: '13px', fontWeight: '600',
          color: danger ? '#f87171' : '#4ade80',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = danger ? 'rgba(248,113,113,0.16)' : 'rgba(74,222,128,0.16)' }}
        onMouseLeave={e => { e.currentTarget.style.background = danger ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)' }}>
        {loading
          ? <><div className="spinner" style={{ width: '14px', height: '14px', borderColor: 'rgba(74,222,128,0.2)', borderTopColor: '#4ade80' }} /><span>Guardando...</span></>
          : saveLabel
        }
      </button>
    </div>
  )
}

export function ErrorMsg({ children }) {
  if (!children) return null
  return (
    <div style={{
      background: 'rgba(248,113,113,0.06)',
      border: '1px solid rgba(248,113,113,0.18)',
      color: '#f87171',
      padding: '10px 14px',
      borderRadius: '8px',
      fontSize: '12px',
      marginBottom: '14px',
      display: 'flex', alignItems: 'center', gap: '8px',
      fontWeight: '500',
      letterSpacing: '0.2px',
    }}>
      <span style={{ flexShrink: 0 }}>⚠</span>
      {children}
    </div>
  )
}