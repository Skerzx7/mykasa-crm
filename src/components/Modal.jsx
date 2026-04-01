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
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position:'fixed',inset:0,background:'rgba(5,30,15,0.7)',backdropFilter:'blur(6px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',animation:'fadeIn 0.15s ease' }}>
      <div style={{ background:'var(--surface)',borderRadius:'18px',width:'100%',maxWidth:widths[size],maxHeight:'92vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,0.3)',animation:'scaleIn 0.18s ease' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 22px 16px',borderBottom:'1px solid var(--border)',position:'sticky',top:0,background:'var(--surface)',zIndex:1,borderRadius:'18px 18px 0 0' }}>
          <h3 style={{ fontSize:'17px',fontWeight:'700',color:'var(--text)' }}>{titulo}</h3>
          <button onClick={onClose} style={{ background:'var(--surface2)',border:'none',borderRadius:'8px',width:'32px',height:'32px',fontSize:'15px',cursor:'pointer',color:'var(--text3)',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background='var(--red-bg)'; e.currentTarget.style.color='var(--red)' }}
            onMouseLeave={e => { e.currentTarget.style.background='var(--surface2)'; e.currentTarget.style.color='var(--text3)' }}>✕</button>
        </div>
        <div style={{ padding:'20px 22px 24px' }}>{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, required, hint, children }) {
  return (
    <div style={{ marginBottom:'16px' }}>
      <label style={{ display:'flex',alignItems:'center',gap:'4px',fontSize:'12px',fontWeight:'700',color:'var(--text2)',marginBottom:'7px',textTransform:'uppercase',letterSpacing:'0.5px' }}>
        {label}{required && <span style={{ color:'var(--red)' }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize:'11px',color:'var(--text4)',marginTop:'5px',lineHeight:'1.4' }}>{hint}</p>}
    </div>
  )
}

export function ModalActions({ onCancel, onSave, loading, saveLabel = 'Guardar', danger }) {
  return (
    <div style={{ display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'20px',paddingTop:'16px',borderTop:'1px solid var(--border)' }}>
      <button onClick={onCancel} className="btn btn-secondary">Cancelar</button>
      <button onClick={onSave} disabled={loading} className={`btn ${danger?'btn-danger':'btn-primary'}`} style={{ minWidth:'110px' }}>
        {loading ? <><div className="spinner" /><span>Guardando...</span></> : saveLabel}
      </button>
    </div>
  )
}

export function ErrorMsg({ children }) {
  if (!children) return null
  return (
    <div style={{ background:'var(--red-bg)',color:'var(--red)',padding:'11px 14px',borderRadius:'10px',fontSize:'13px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'8px',fontWeight:'500',border:'1px solid var(--red-border)' }}>
      ⚠️ {children}
    </div>
  )
}
