import React from 'react'
import { useAuth } from '../context/AuthContext'

export default function Navbar({ tabs, tabActivo, onTab }) {
  const { userData, logout } = useAuth()
  const isAdmin = userData?.role === 'admin'

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <nav style={{
        background: 'linear-gradient(135deg, #052e16 0%, #0f2318 100%)',
        padding: '0 20px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(74,222,128,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width:'34px',height:'34px',background:'linear-gradient(135deg,#2d6a4f,#4ade80)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'17px',boxShadow:'0 2px 8px rgba(74,222,128,0.3)',flexShrink:0 }}>🏡</div>
          <div>
            <span style={{ color:'white',fontWeight:'800',fontSize:'15px',letterSpacing:'-0.3px' }}>MyKasa</span>
            <span style={{ color:'rgba(134,239,172,0.5)',fontSize:'12px',marginLeft:'6px' }}>CRM</span>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'7px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'9px',padding:'5px 10px' }}>
            <div style={{ width:'26px',height:'26px',background:isAdmin?'linear-gradient(135deg,#4ade80,#22c55e)':'linear-gradient(135deg,#60a5fa,#3b82f6)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'800',color:'white',flexShrink:0 }}>
              {userData?.nombre?.charAt(0) || '?'}
            </div>
            <div>
              <div style={{ color:'white',fontSize:'12px',fontWeight:'600',lineHeight:1,maxWidth:'120px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{userData?.nombre}</div>
              <div style={{ color:isAdmin?'#4ade80':'#60a5fa',fontSize:'9px',fontWeight:'700',letterSpacing:'0.5px',marginTop:'2px' }}>{isAdmin?'ADMIN':'VENDEDOR'}</div>
            </div>
          </div>
          <button onClick={logout} style={{ background:'rgba(220,38,38,0.12)',color:'#fca5a5',border:'1px solid rgba(220,38,38,0.25)',borderRadius:'8px',padding:'7px 12px',fontSize:'12px',fontWeight:'600',cursor:'pointer',transition:'all 0.18s' }}
            onMouseEnter={e => { e.target.style.background='rgba(220,38,38,0.22)' }}
            onMouseLeave={e => { e.target.style.background='rgba(220,38,38,0.12)' }}>
            Salir
          </button>
        </div>
      </nav>

      {tabs && (
        <div style={{ background:'#0a1f12', padding:'0 20px', display:'flex', gap:'2px', borderBottom:'2px solid #1a3a2a', overflowX:'auto' }}>
          {tabs.map(([key, icon, label]) => (
            <button key={key} onClick={() => onTab(key)} style={{ background:tabActivo===key?'white':'transparent', color:tabActivo===key?'#0f2318':'rgba(134,239,172,0.65)', border:'none', padding:'10px 16px', fontSize:'13px', fontWeight:'700', borderRadius:'8px 8px 0 0', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', whiteSpace:'nowrap', marginBottom:tabActivo===key?'-2px':'0', borderBottom:tabActivo===key?'2px solid white':'2px solid transparent', transition:'all 0.15s' }}>
              <span style={{ fontSize:'14px' }}>{icon}</span>
              <span className="hide-mobile">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
