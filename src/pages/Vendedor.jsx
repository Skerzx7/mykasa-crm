import React, { useState, useEffect, useRef } from 'react'
import { db } from '../firebase'
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy, serverTimestamp, addDoc, deleteDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { ESTADOS, getEstado, abrirWhatsApp, formatFecha, timeAgo, formatDinero, calcularComisiones, calcularVigenciaApartado } from '../utils/helpers'

const TABS_V = [['clientes','👥','Mis Clientes'],['mensajes','💬','Mensajes'],['comisiones','💰','Mis Comisiones']]

const LogoSVG = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius:'8px',flexShrink:0 }}>
    <rect width="100" height="100" rx="18" fill="#0d1a10"/>
    <polygon points="50,14 86,42 14,42" fill="#4ade80"/>
    <rect x="20" y="42" width="60" height="44" rx="2" fill="#166534"/>
    <rect x="38" y="56" width="24" height="30" rx="2" fill="#0d1a10"/>
    <rect x="16" y="68" width="8" height="6" rx="1" fill="#4ade80" opacity="0.5"/>
    <rect x="79" y="68" width="8" height="6" rx="1" fill="#4ade80" opacity="0.5"/>
  </svg>
)

export default function Vendedor() {
  const { user, userData, logout } = useAuth()
  const { show: toast } = useToast()
  const [tab, setTab] = useState('clientes')
  const [clientes, setClientes] = useState([])
  const [mensajes, setMensajes] = useState([])
  const [clienteActivo, setClienteActivo] = useState(null)
  const [notas, setNotas] = useState('')
  const [notasEditadas, setNotasEditadas] = useState(false)
  const [guardandoNotas, setGuardandoNotas] = useState(false)
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [copiado, setCopiado] = useState(null)
  const [modalNuevoMsg, setModalNuevoMsg] = useState(false)
  const [editandoMsg, setEditandoMsg] = useState(null)
  const [fm, setFm] = useState({ titulo:'', texto:'' })
  const [guardandoMsg, setGuardandoMsg] = useState(false)
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false)
  const [fc, setFc] = useState({ nombre:'', telefono:'', notas:'', estado:'nuevo', mensualidad:2000, enganche:0 })
  const [guardandoCliente, setGuardandoCliente] = useState(false)
  const [errorCliente, setErrorCliente] = useState('')
  const [modalNombre, setModalNombre] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 680)
  const scrollRef = useRef(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 679px)')
    const h = e => setIsMobile(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  // Scroll al top cuando cambia de tab o de cliente
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [tab, clienteActivo])

  useEffect(() => {
    if (!user) return
    const u1 = onSnapshot(
      query(collection(db,'clientes'), where('vendedorId','==',user.uid), orderBy('createdAt','desc')),
      s => {
        const data = s.docs.map(d => ({id:d.id,...d.data()}))
        setClientes(data)
        setClienteActivo(prev => {
          if (!prev) return prev
          return data.find(c => c.id===prev.id) || prev
        })
      }
    )
    const u2 = onSnapshot(
      query(collection(db,'mensajes'), orderBy('orden')),
      s => {
        const todos = s.docs.map(d => ({id:d.id,...d.data()}))
        setMensajes(todos.filter(m => m.vendedorId==='todos' || m.vendedorId===user.uid))
      }
    )
    return () => { u1(); u2() }
  }, [user])

  const filtrados = clientes.filter(c => {
    if (filtro!=='todos' && c.estado!==filtro) return false
    if (busqueda && !c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) && !c.telefono?.includes(busqueda)) return false
    return true
  })
  const conteo = ESTADOS.reduce((a,e) => { a[e.value]=clientes.filter(c=>c.estado===e.value).length; return a }, {})

  const abrirCliente = c => { setClienteActivo(c); setNotas(c.notas||''); setNotasEditadas(false) }
  const volverLista = () => setClienteActivo(null)

  const cambiarEstado = async estado => {
    if (!clienteActivo) return
    try {
      await updateDoc(doc(db,'clientes',clienteActivo.id), {estado,updatedAt:serverTimestamp()})
      toast('Estado: '+getEstado(estado).label,'info')
    } catch { toast('Error al actualizar','error') }
  }

  const guardarNotas = async () => {
    if (!clienteActivo) return
    setGuardandoNotas(true)
    try {
      await updateDoc(doc(db,'clientes',clienteActivo.id), {notas,updatedAt:serverTimestamp()})
      setNotasEditadas(false); toast('Notas guardadas')
    } catch { toast('Error al guardar notas','error') }
    setGuardandoNotas(false)
  }

  const abrirNuevoCliente = () => {
    setFc({nombre:'',telefono:'',notas:'',estado:'nuevo',mensualidad:2000,enganche:0})
    setErrorCliente(''); setModalNuevoCliente(true)
  }

  const guardarCliente = async () => {
    if (!fc.nombre.trim()||!fc.telefono.trim()) return setErrorCliente('Nombre y teléfono son obligatorios')
    if (!user?.uid) return setErrorCliente('Sesión inválida')
    setGuardandoCliente(true); setErrorCliente('')
    try {
      await addDoc(collection(db,'clientes'), {
        nombre:fc.nombre.trim(), telefono:fc.telefono.trim(), notas:fc.notas.trim(),
        estado:fc.estado, mensualidad:Number(fc.mensualidad)||2000, enganche:Number(fc.enganche)||0,
        vendedorId:user.uid, vendedorNombre:userData?.nombre||'',
        comision:userData?.comision||5000, pagosRegistrados:[],
        createdAt:serverTimestamp(), updatedAt:serverTimestamp(),
      })
      setModalNuevoCliente(false); toast('Cliente agregado')
    } catch { setErrorCliente('Error al guardar.') }
    setGuardandoCliente(false)
  }

  const copiar = m => {
    const txt = m.texto.replace(/{nombre}/g, clienteActivo?.nombre||'Cliente')
    navigator.clipboard.writeText(txt).then(() => {
      setCopiado(m.id); toast('Mensaje copiado','info')
      setTimeout(() => setCopiado(null), 2200)
    })
  }

  const guardarMensaje = async () => {
    if (!fm.titulo.trim()||!fm.texto.trim()) return
    setGuardandoMsg(true)
    try {
      if (editandoMsg) {
        await updateDoc(doc(db,'mensajes',editandoMsg.id), {titulo:fm.titulo,texto:fm.texto})
        toast('Mensaje actualizado')
      } else {
        await addDoc(collection(db,'mensajes'), {titulo:fm.titulo,texto:fm.texto,vendedorId:user.uid,orden:mensajes.length})
        toast('Mensaje creado')
      }
      setModalNuevoMsg(false); setEditandoMsg(null); setFm({titulo:'',texto:''})
    } catch { toast('Error al guardar','error') }
    setGuardandoMsg(false)
  }

  const eliminarMensaje = async id => {
    if (!confirm('¿Eliminar este mensaje?')) return
    try { await deleteDoc(doc(db,'mensajes',id)); toast('Mensaje eliminado') }
    catch { toast('Error al eliminar','error') }
  }

  const guardarNombre = async () => {
    if (!nuevoNombre.trim()) return
    setGuardandoNombre(true)
    try {
      await updateDoc(doc(db,'users',user.uid), {nombre:nuevoNombre.trim()})
      setModalNombre(false); toast('Nombre actualizado')
    } catch { toast('Error','error') }
    setGuardandoNombre(false)
  }

  const comisionVendedor = userData?.comision||5000
  const clientesConContrato = clientes.filter(c => c.estado==='contrato'||c.estado==='cerrado')
  const totalGanado = clientesConContrato.reduce((s,c) => s+calcularComisiones(c.comision||comisionVendedor,c.mensualidad||2000,c.pagosRegistrados||[]).comisionCubierta,0)
  const totalPendiente = clientesConContrato.reduce((s,c) => s+calcularComisiones(c.comision||comisionVendedor,c.mensualidad||2000,c.pagosRegistrados||[]).comisionPendiente,0)

  // Vista actual: lista de clientes / detalle de cliente
  const viendoDetalle = isMobile && clienteActivo && tab==='clientes'
  const viendoLista = !viendoDetalle

  const overlayStyle = {position:'fixed',inset:0,background:'rgba(5,10,7,0.9)',backdropFilter:'blur(12px)',zIndex:999,display:'flex',alignItems:'flex-end',justifyContent:'center'}
  const sheetStyle = {background:'var(--surface)',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:'500px',padding:'16px 16px 32px',boxShadow:'0 -8px 40px rgba(0,0,0,0.5)',animation:'slideUp 0.25s ease',overflowY:'auto',maxHeight:'85vh'}
  const handleBar = {width:'32px',height:'4px',background:'var(--surface4)',borderRadius:'99px',margin:'0 auto 16px'}
  const fieldLbl = {display:'block',fontSize:'11px',fontWeight:'700',color:'var(--text3)',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'0.5px'}

  return (
    <>
      {/* Navbar sticky */}
      <nav style={{position:'sticky',top:0,zIndex:100,background:'var(--surface)',borderBottom:'1px solid var(--border)',height:'52px',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 14px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',minWidth:0}}>
          {viendoDetalle ? (
            <>
              <button onClick={volverLista} style={{background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:'8px',padding:'5px 10px',color:'var(--text2)',fontSize:'13px',cursor:'pointer',fontWeight:'600',display:'flex',alignItems:'center',gap:'4px',flexShrink:0}}>← Atrás</button>
              <span style={{color:'var(--text)',fontWeight:'700',fontSize:'13px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{clienteActivo?.nombre}</span>
            </>
          ) : (
            <>
              <LogoSVG size={28}/>
              <span style={{color:'var(--text)',fontWeight:'800',fontSize:'14px'}}>MyKasa CRM</span>
            </>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
          <button onClick={() => window.location.reload()} title="Recargar" style={{background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:'7px',width:'32px',height:'32px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'15px',color:'var(--text3)'}}>↺</button>
          <button onClick={() => {setNuevoNombre(userData?.nombre||'');setModalNombre(true)}} style={{background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:'8px',padding:'4px 8px',display:'flex',alignItems:'center',gap:'5px',cursor:'pointer'}}>
            <div style={{width:'20px',height:'20px',background:'linear-gradient(135deg,#60a5fa,#3b82f6)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'800',fontSize:'10px',flexShrink:0}}>{userData?.nombre?.charAt(0)}</div>
            <span style={{color:'var(--text2)',fontSize:'12px',fontWeight:'600',maxWidth:'65px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userData?.nombre}</span>
          </button>
          <button onClick={logout} style={{background:'var(--red-bg)',color:'var(--red)',border:'1px solid var(--red-border)',borderRadius:'7px',padding:'5px 9px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>Salir</button>
        </div>
      </nav>

      {/* Tabs sticky debajo del navbar */}
      <div style={{position:'sticky',top:'52px',zIndex:99,background:'var(--bg2)',borderBottom:'1px solid var(--border)',display:'flex',overflowX:'auto',scrollbarWidth:'none'}}>
        {TABS_V.map(([key,icon,label]) => (
          <button key={key} onClick={() => {setTab(key); if(key!=='clientes') setClienteActivo(null)}}
            style={{background:'transparent',color:tab===key?'var(--accent)':'var(--text3)',border:'none',borderBottom:'2px solid '+(tab===key?'var(--accent)':'transparent'),padding:'10px 16px',fontSize:'12px',fontWeight:tab===key?'700':'500',cursor:'pointer',display:'flex',alignItems:'center',gap:'5px',whiteSpace:'nowrap',transition:'all 0.15s',flexShrink:0}}>
            <span>{icon}</span><span>{label}</span>
          </button>
        ))}
      </div>

      {/* Contenido — scroll normal del window */}
      <div style={{background:'var(--bg)',minHeight:'calc(100vh - 100px)'}}>

        {/* ===== TAB CLIENTES — LISTA ===== */}
        {tab==='clientes' && viendoLista && (
          <div>
            {/* Barra búsqueda */}
            <div style={{padding:'10px 14px',background:'var(--bg2)',borderBottom:'1px solid var(--border)'}}>
              <div style={{display:'flex',gap:'8px',marginBottom:'8px',alignItems:'center'}}>
                <div style={{position:'relative',flex:1}}>
                  <span style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',fontSize:'13px',pointerEvents:'none',color:'var(--text3)'}}>🔍</span>
                  <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar cliente..." className="input" style={{paddingLeft:'30px',fontSize:'13px',padding:'9px 10px 9px 30px'}}/>
                </div>
                <button onClick={abrirNuevoCliente} className="btn btn-primary btn-sm" style={{whiteSpace:'nowrap',flexShrink:0}}>＋ Nuevo</button>
              </div>
              <div style={{display:'flex',gap:'6px',overflowX:'auto',scrollbarWidth:'none',paddingBottom:'2px'}}>
                <FiltroChip label={'Todos ('+clientes.length+')'} activo={filtro==='todos'} onClick={() => setFiltro('todos')}/>
                {ESTADOS.map(e => (
                  <FiltroChip key={e.value} label={e.icon+' '+e.label+' ('+(conteo[e.value]||0)+')'} activo={filtro===e.value} onClick={() => setFiltro(filtro===e.value?'todos':e.value)} color={e.color}/>
                ))}
              </div>
            </div>

            {/* Lista de clientes */}
            {filtrados.length===0 ? (
              <div style={{padding:'60px 16px',textAlign:'center'}}>
                <div style={{fontSize:'40px',marginBottom:'10px'}}>{clientes.length===0?'📭':'🔍'}</div>
                <p style={{color:'var(--text3)',fontSize:'13px'}}>{clientes.length===0?'Aún no tienes clientes asignados':'Sin resultados'}</p>
              </div>
            ) : (
              <div>
                {filtrados.map(c => {
                  const est = getEstado(c.estado)
                  return (
                    <div key={c.id} onClick={() => abrirCliente(c)}
                      style={{padding:'13px 14px',borderBottom:'1px solid var(--border)',cursor:'pointer',background:'var(--bg2)',transition:'background 0.12s'}}
                      onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background='var(--bg2)'}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'3px'}}>
                        <span style={{fontWeight:'700',fontSize:'14px',color:'var(--text)'}}>{c.nombre}</span>
                        <span className="badge" style={{background:est.bg+'22',color:est.color,fontSize:'10px',border:'1px solid '+est.color+'33',flexShrink:0,marginLeft:'8px'}}>{est.icon} {est.label}</span>
                      </div>
                      <div style={{fontSize:'11px',color:'var(--text3)',marginBottom:'2px'}}>📱 {c.telefono}</div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:'10px',color:'var(--text4)'}}>{timeAgo(c.createdAt)}</span>
                        {c.mensualidad>0 && <span style={{fontSize:'10px',color:'var(--text3)',fontWeight:'600'}}>💵 {formatDinero(c.mensualidad)}/mes</span>}
                      </div>
                      {c.notas && <div style={{fontSize:'10px',color:'var(--text3)',marginTop:'4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',background:'var(--surface3)',padding:'2px 7px',borderRadius:'4px'}}>📝 {c.notas}</div>}
                    </div>
                  )
                })}
                <div style={{height:'32px'}}/>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB CLIENTES — DETALLE ===== */}
        {tab==='clientes' && viendoDetalle && clienteActivo && (() => {
          const est = getEstado(clienteActivo.estado)
          return (
            <div style={{padding:'12px',display:'flex',flexDirection:'column',gap:'10px'}}>

              {/* Header */}
              <div className="card" style={{padding:'13px 14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',minWidth:0}}>
                    <div style={{width:'40px',height:'40px',background:'linear-gradient(135deg,'+est.color+'33,'+est.color+'55)',border:'2px solid '+est.color+'44',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'800',color:est.color,fontSize:'16px',flexShrink:0}}>
                      {clienteActivo.nombre?.charAt(0)}
                    </div>
                    <div style={{minWidth:0}}>
                      <h2 style={{fontSize:'15px',fontWeight:'800',marginBottom:'3px',color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{clienteActivo.nombre}</h2>
                      <div style={{fontSize:'11px',color:'var(--text3)',display:'flex',gap:'8px',flexWrap:'wrap'}}>
                        <span>📱 {clienteActivo.telefono}</span>
                        {clienteActivo.mensualidad>0 && <span>💵 {formatDinero(clienteActivo.mensualidad)}/mes</span>}
                        <span>📅 {formatFecha(clienteActivo.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-success btn-sm" onClick={() => abrirWhatsApp(clienteActivo.telefono)} style={{flexShrink:0}}>📱 WA</button>
                </div>
              </div>

              {/* Estado */}
              <div className="card" style={{padding:'12px 14px'}}>
                <p style={{fontSize:'10px',fontWeight:'700',color:'var(--text3)',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Estado del cliente</p>
                <div style={{display:'flex',gap:'6px',overflowX:'auto',scrollbarWidth:'none',paddingBottom:'2px'}}>
                  {ESTADOS.map(e => (
                    <button key={e.value} onClick={() => cambiarEstado(e.value)}
                      style={{padding:'6px 11px',borderRadius:'var(--r-full)',border:'2px solid '+(clienteActivo.estado===e.value?e.color:'var(--border)'),background:clienteActivo.estado===e.value?e.color+'22':'transparent',color:clienteActivo.estado===e.value?e.color:'var(--text3)',fontSize:'12px',fontWeight:'700',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
                      {e.icon} {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Apartado */}
              {clienteActivo.montoApartado>0 && (() => {
                const v = calcularVigenciaApartado(clienteActivo.montoApartado, clienteActivo.createdAt)
                if (!v) return null
                return (
                  <div className="card" style={{padding:'12px 14px',background:v.vencido?'rgba(248,113,113,0.06)':'rgba(251,146,60,0.06)',border:'1px solid '+(v.vencido?'rgba(248,113,113,0.2)':'rgba(251,146,60,0.2)')}}>
                    <p style={{fontSize:'10px',fontWeight:'700',color:v.vencido?'var(--red)':'var(--orange)',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.5px'}}>🔒 Apartado</p>
                    <div style={{display:'flex',gap:'12px',flexWrap:'wrap',fontSize:'12px',color:'var(--text2)'}}>
                      <span>💵 <strong>{formatDinero(clienteActivo.montoApartado)}</strong></span>
                      <span>📅 <strong>{v.dias} días</strong></span>
                      <span style={{fontWeight:'700',color:v.vencido?'var(--red)':'var(--accent)'}}>{v.vencido?'⚠️ Venció hace '+Math.abs(v.restantes)+'d':'✅ Vence en '+v.restantes+'d'}</span>
                    </div>
                  </div>
                )
              })()}

              {/* Mensajes */}
              <div className="card" style={{padding:'12px 14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                  <p style={{fontSize:'10px',fontWeight:'700',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Mensajes predefinidos</p>
                  <button className="btn btn-secondary btn-sm" style={{fontSize:'11px',padding:'4px 10px'}} onClick={() => {setEditandoMsg(null);setFm({titulo:'',texto:''});setModalNuevoMsg(true)}}>＋ Crear</button>
                </div>
                {mensajes.length===0 && <p style={{fontSize:'12px',color:'var(--text4)',textAlign:'center',padding:'12px'}}>Sin mensajes configurados</p>}
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {mensajes.map(m => {
                    const txt = m.texto.replace(/{nombre}/g, clienteActivo.nombre)
                    const esCop = copiado===m.id
                    const esMio = m.vendedorId===user.uid
                    return (
                      <div key={m.id} style={{background:'var(--surface2)',borderRadius:'10px',padding:'10px 12px',border:'1px solid var(--border)'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px',gap:'4px',flexWrap:'wrap'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                            <span style={{fontWeight:'700',fontSize:'12px',color:'var(--text)'}}>{m.titulo}</span>
                            {!esMio && <span style={{fontSize:'9px',background:'rgba(74,222,128,0.1)',color:'var(--accent)',padding:'1px 6px',borderRadius:'10px',fontWeight:'700'}}>General</span>}
                          </div>
                          <div style={{display:'flex',gap:'4px',flexShrink:0}}>
                            {esMio && (
                              <>
                                <button onClick={() => {setEditandoMsg(m);setFm({titulo:m.titulo,texto:m.texto});setModalNuevoMsg(true)}} style={{background:'var(--surface3)',border:'none',cursor:'pointer',fontSize:'12px',padding:'3px 7px',borderRadius:'5px',color:'var(--text2)'}}>✏️</button>
                                <button onClick={() => eliminarMensaje(m.id)} style={{background:'var(--red-bg)',border:'none',cursor:'pointer',fontSize:'12px',padding:'3px 7px',borderRadius:'5px',color:'var(--red)'}}>🗑️</button>
                              </>
                            )}
                            <button onClick={() => copiar(m)} style={{background:esCop?'rgba(34,197,94,0.15)':'var(--surface3)',color:esCop?'var(--accent)':'var(--text3)',border:'1px solid '+(esCop?'rgba(74,222,128,0.3)':'var(--border)'),borderRadius:'6px',padding:'4px 8px',fontSize:'11px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',gap:'3px'}}>
                              {esCop?'✓':'📋'}
                            </button>
                            <button onClick={() => abrirWhatsApp(clienteActivo.telefono,txt)} style={{background:'rgba(37,211,102,0.1)',color:'#25d366',border:'1px solid rgba(37,211,102,0.2)',borderRadius:'6px',padding:'4px 8px',fontSize:'11px',fontWeight:'700',cursor:'pointer'}}>📱</button>
                          </div>
                        </div>
                        <p style={{fontSize:'11px',color:'var(--text2)',lineHeight:'1.55',margin:0}}>{txt}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Notas */}
              <div className="card" style={{padding:'12px 14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                  <p style={{fontSize:'10px',fontWeight:'700',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Notas</p>
                  {notasEditadas && <span style={{fontSize:'10px',color:'var(--yellow)',fontWeight:'700'}}>● Sin guardar</span>}
                </div>
                <textarea value={notas} onChange={e => {setNotas(e.target.value);setNotasEditadas(true)}}
                  placeholder="Lote de interés, presupuesto, observaciones..."
                  rows={3} className="input" style={{resize:'vertical',marginBottom:'8px',fontSize:'13px'}}/>
                <button onClick={guardarNotas} disabled={guardandoNotas||!notasEditadas} className="btn btn-primary btn-sm"
                  style={{opacity:(guardandoNotas||!notasEditadas)?0.6:1,cursor:(guardandoNotas||!notasEditadas)?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
                  {guardandoNotas?<><div className="spinner" style={{width:'14px',height:'14px'}}/><span>Guardando...</span></>:'💾 Guardar notas'}
                </button>
              </div>
              <div style={{height:'32px'}}/>
            </div>
          )
        })()}

        {/* ===== TAB MENSAJES ===== */}
        {tab==='mensajes' && (
          <div style={{padding:'16px'}} className="fade-in">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <div>
                <h2 style={{fontSize:'16px',fontWeight:'800',marginBottom:'2px',color:'var(--text)'}}>Mis mensajes</h2>
                <p style={{fontSize:'12px',color:'var(--text3)'}}>Plantillas para WhatsApp</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => {setEditandoMsg(null);setFm({titulo:'',texto:''});setModalNuevoMsg(true)}}>＋ Nuevo</button>
            </div>
            {mensajes.filter(m=>m.vendedorId===user.uid).length===0 ? (
              <div className="card" style={{padding:'40px',textAlign:'center',marginBottom:'20px'}}>
                <div style={{fontSize:'36px',marginBottom:'8px'}}>💬</div>
                <p style={{color:'var(--text3)',fontSize:'13px',marginBottom:'12px'}}>Aún no tienes mensajes personalizados</p>
                <button className="btn btn-primary btn-sm" onClick={() => {setEditandoMsg(null);setFm({titulo:'',texto:''});setModalNuevoMsg(true)}}>Crear mi primer mensaje</button>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'20px'}}>
                {mensajes.filter(m=>m.vendedorId===user.uid).map(m => (
                  <div key={m.id} className="card" style={{padding:'14px 16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px',gap:'8px'}}>
                      <span style={{fontWeight:'700',fontSize:'14px',color:'var(--text)'}}>{m.titulo}</span>
                      <div style={{display:'flex',gap:'4px',flexShrink:0}}>
                        <button onClick={() => {setEditandoMsg(m);setFm({titulo:m.titulo,texto:m.texto});setModalNuevoMsg(true)}} style={{background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:'7px',padding:'5px 9px',fontSize:'12px',cursor:'pointer',color:'var(--text2)'}}>✏️</button>
                        <button onClick={() => eliminarMensaje(m.id)} style={{background:'var(--red-bg)',border:'1px solid var(--red-border)',borderRadius:'7px',padding:'5px 9px',fontSize:'12px',cursor:'pointer',color:'var(--red)'}}>🗑️</button>
                      </div>
                    </div>
                    <p style={{fontSize:'12px',color:'var(--text2)',lineHeight:'1.6',whiteSpace:'pre-wrap',background:'var(--surface2)',padding:'10px 12px',borderRadius:'8px',margin:0}}>{m.texto}</p>
                    <p style={{fontSize:'10px',color:'var(--text4)',marginTop:'6px'}}>Usa {'{nombre}'} para el nombre del cliente</p>
                  </div>
                ))}
              </div>
            )}
            {mensajes.filter(m=>m.vendedorId==='todos').length>0 && (
              <>
                <h3 style={{fontSize:'12px',fontWeight:'700',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px'}}>Mensajes generales</h3>
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {mensajes.filter(m=>m.vendedorId==='todos').map(m => (
                    <div key={m.id} className="card" style={{padding:'12px 14px',opacity:0.85}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                        <span style={{fontWeight:'700',fontSize:'13px',color:'var(--text)'}}>{m.titulo}</span>
                        <span style={{fontSize:'9px',background:'rgba(74,222,128,0.1)',color:'var(--accent)',padding:'2px 8px',borderRadius:'10px',fontWeight:'700'}}>General</span>
                      </div>
                      <p style={{fontSize:'11px',color:'var(--text2)',lineHeight:'1.55',margin:0}}>{m.texto}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div style={{height:'32px'}}/>
          </div>
        )}

        {/* ===== TAB COMISIONES ===== */}
        {tab==='comisiones' && (
          <div style={{padding:'16px'}} className="fade-in">
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'10px',marginBottom:'20px'}}>
              {[
                {label:'Total cobrado',value:formatDinero(totalGanado),color:'var(--accent)',g1:'#2d6a4f',g2:'#4ade80',icon:'💰'},
                {label:'Por cobrar',value:formatDinero(totalPendiente),color:'var(--yellow)',g1:'#ca8a04',g2:'#fbbf24',icon:'⏳'},
                {label:'Ventas cerradas',value:clientesConContrato.length,color:'var(--purple)',g1:'#7c3aed',g2:'#a78bfa',icon:'✍️'},
                {label:'Mi comisión',value:formatDinero(comisionVendedor),color:'var(--blue)',g1:'#1d4ed8',g2:'#60a5fa',icon:'💵'},
              ].map((s,i) => (
                <div key={i} className="card" style={{padding:'14px',textAlign:'center',position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:'linear-gradient(90deg,'+s.g1+','+s.g2+')'}}/>
                  <div style={{fontSize:'22px',marginBottom:'4px'}}>{s.icon}</div>
                  <div style={{fontSize:'16px',fontWeight:'800',color:s.color,marginBottom:'2px'}}>{s.value}</div>
                  <div style={{fontSize:'10px',color:'var(--text3)',fontWeight:'600'}}>{s.label}</div>
                </div>
              ))}
            </div>
            <h3 style={{fontSize:'14px',fontWeight:'700',marginBottom:'12px',color:'var(--text2)'}}>Detalle por cliente</h3>
            {clientesConContrato.length===0
              ? <div className="card" style={{padding:'40px',textAlign:'center'}}><div style={{fontSize:'36px',marginBottom:'8px'}}>💼</div><p style={{color:'var(--text3)',fontSize:'13px'}}>Sin ventas cerradas aún</p></div>
              : <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                {clientesConContrato.map(c => {
                  const {pagos,comisionTotal,comisionCubierta,comisionPendiente} = calcularComisiones(c.comision||comisionVendedor,c.mensualidad||2000,c.pagosRegistrados||[])
                  const pct = comisionTotal>0?Math.round((comisionCubierta/comisionTotal)*100):0
                  return (
                    <div key={c.id} className="card" style={{padding:'13px 14px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px',gap:'8px'}}>
                        <div style={{minWidth:0}}>
                          <div style={{fontWeight:'700',fontSize:'14px',marginBottom:'2px',color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.nombre}</div>
                          <div style={{fontSize:'11px',color:'var(--text3)',display:'flex',gap:'8px',flexWrap:'wrap'}}>
                            <span>💵 {formatDinero(c.mensualidad)}/mes</span>
                            {c.enganche>0 && <span>🤝 {formatDinero(c.enganche)}</span>}
                          </div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontSize:'10px',color:'var(--text3)'}}>Mi comisión</div>
                          <div style={{fontWeight:'800',fontSize:'16px',color:'var(--accent)'}}>{formatDinero(comisionTotal)}</div>
                        </div>
                      </div>
                      <div style={{marginBottom:'10px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',marginBottom:'4px'}}>
                          <span style={{color:'var(--accent)',fontWeight:'700'}}>Cobrado: {formatDinero(comisionCubierta)}</span>
                          <span style={{color:'var(--yellow)',fontWeight:'700'}}>Pendiente: {formatDinero(comisionPendiente)}</span>
                        </div>
                        <div style={{background:'var(--surface4)',borderRadius:'99px',height:'6px',overflow:'hidden'}}>
                          <div style={{width:pct+'%',height:'100%',background:'linear-gradient(90deg,var(--v600),var(--accent))',borderRadius:'99px',transition:'width 0.6s'}}/>
                        </div>
                        <div style={{fontSize:'10px',color:'var(--text3)',marginTop:'2px',textAlign:'right'}}>{pct}% cobrado</div>
                      </div>
                      <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                        {pagos.filter(p=>p.montoVendedor>0).map((p,i) => (
                          <div key={i} style={{padding:'4px 8px',borderRadius:'7px',fontSize:'10px',fontWeight:'700',display:'flex',alignItems:'center',gap:'3px',background:p.pagadoVendedor?'rgba(34,197,94,0.1)':'rgba(251,191,36,0.1)',color:p.pagadoVendedor?'var(--accent)':'var(--yellow)',border:'1px solid '+(p.pagadoVendedor?'rgba(74,222,128,0.2)':'rgba(251,191,36,0.2)')}}>
                            {p.tipo==='enganche'?'🤝':'M'+p.numero} {formatDinero(p.montoVendedor)} {p.pagadoVendedor?'✓':'⏳'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            }
            <div style={{height:'32px'}}/>
          </div>
        )}
      </div>

      {/* ===== MODALES ===== */}

      {modalNuevoCliente && (
        <div onClick={e => {if(e.target===e.currentTarget) setModalNuevoCliente(false)}} style={overlayStyle}>
          <div style={sheetStyle}>
            <div style={handleBar}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h3 style={{fontSize:'16px',fontWeight:'700',color:'var(--text)'}}>Nuevo cliente</h3>
              <button onClick={() => setModalNuevoCliente(false)} style={{background:'var(--surface3)',border:'none',borderRadius:'8px',width:'28px',height:'28px',fontSize:'14px',cursor:'pointer',color:'var(--text3)'}}>✕</button>
            </div>
            {[{label:'Nombre completo *',key:'nombre',placeholder:'Ej: Juan García',type:'text'},{label:'Teléfono *',key:'telefono',placeholder:'Ej: 5512345678',type:'tel'}].map(({label,key,placeholder,type}) => (
              <div key={key} style={{marginBottom:'12px'}}>
                <label style={fieldLbl}>{label}</label>
                <input className="input" type={type} value={fc[key]} onChange={e => setFc({...fc,[key]:e.target.value})} placeholder={placeholder} autoFocus={key==='nombre'}/>
              </div>
            ))}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}}>
              <div><label style={fieldLbl}>Mensualidad ($)</label><input className="input" type="number" value={fc.mensualidad} onChange={e => setFc({...fc,mensualidad:e.target.value})} placeholder="2000" inputMode="numeric"/></div>
              <div><label style={fieldLbl}>Enganche ($)</label><input className="input" type="number" value={fc.enganche} onChange={e => setFc({...fc,enganche:e.target.value})} placeholder="0" inputMode="numeric"/></div>
            </div>
            <div style={{marginBottom:'12px'}}>
              <label style={fieldLbl}>Estado</label>
              <select className="input" value={fc.estado} onChange={e => setFc({...fc,estado:e.target.value})}>
                {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.icon} {e.label}</option>)}
              </select>
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={fieldLbl}>Notas</label>
              <textarea className="input" value={fc.notas} onChange={e => setFc({...fc,notas:e.target.value})} rows={2} placeholder="Lote de interés..." style={{resize:'none',fontSize:'13px'}}/>
            </div>
            {errorCliente && <div style={{background:'var(--red-bg)',color:'var(--red)',padding:'10px 12px',borderRadius:'10px',fontSize:'12px',fontWeight:'600',marginBottom:'12px',border:'1px solid var(--red-border)'}}>⚠️ {errorCliente}</div>}
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={() => setModalNuevoCliente(false)} className="btn btn-secondary" style={{flex:1}}>Cancelar</button>
              <button onClick={guardarCliente} disabled={guardandoCliente} className="btn btn-primary" style={{flex:1,opacity:guardandoCliente?0.7:1}}>
                {guardandoCliente?<><div className="spinner" style={{width:'16px',height:'16px'}}/><span>Guardando...</span></>:'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalNuevoMsg && (
        <div onClick={e => {if(e.target===e.currentTarget){setModalNuevoMsg(false);setEditandoMsg(null)}}} style={overlayStyle}>
          <div style={sheetStyle}>
            <div style={handleBar}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h3 style={{fontSize:'16px',fontWeight:'700',color:'var(--text)'}}>{editandoMsg?'Editar mensaje':'Nuevo mensaje'}</h3>
              <button onClick={() => {setModalNuevoMsg(false);setEditandoMsg(null)}} style={{background:'var(--surface3)',border:'none',borderRadius:'8px',width:'28px',height:'28px',fontSize:'14px',cursor:'pointer',color:'var(--text3)'}}>✕</button>
            </div>
            <div style={{marginBottom:'12px'}}>
              <label style={fieldLbl}>Título *</label>
              <input className="input" value={fm.titulo} onChange={e => setFm({...fm,titulo:e.target.value})} placeholder="Ej: Seguimiento" autoFocus/>
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={fieldLbl}>Texto *</label>
              <textarea className="input" value={fm.texto} onChange={e => setFm({...fm,texto:e.target.value})} rows={4} style={{resize:'none',fontSize:'13px'}} placeholder="Hola {nombre}, ..."/>
              <p style={{fontSize:'10px',color:'var(--text4)',marginTop:'4px'}}>Usa {'{nombre}'} para el nombre</p>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={() => {setModalNuevoMsg(false);setEditandoMsg(null)}} className="btn btn-secondary" style={{flex:1}}>Cancelar</button>
              <button onClick={guardarMensaje} disabled={guardandoMsg||!fm.titulo.trim()||!fm.texto.trim()} className="btn btn-primary" style={{flex:1,opacity:(guardandoMsg||!fm.titulo.trim()||!fm.texto.trim())?0.6:1}}>
                {guardandoMsg?<><div className="spinner" style={{width:'16px',height:'16px'}}/><span>Guardando...</span></>:'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalNombre && (
        <div onClick={e => {if(e.target===e.currentTarget) setModalNombre(false)}}
          style={{position:'fixed',inset:0,background:'rgba(5,10,7,0.9)',backdropFilter:'blur(12px)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'var(--surface)',borderRadius:'18px',padding:'22px',width:'100%',maxWidth:'320px',border:'1px solid var(--border2)'}}>
            <h3 style={{fontSize:'16px',fontWeight:'700',marginBottom:'14px',color:'var(--text)'}}>Editar mi nombre</h3>
            <input className="input" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Tu nombre completo" autoFocus style={{marginBottom:'14px'}}
              onKeyDown={e => {if(e.key==='Enter') guardarNombre()}}/>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={() => setModalNombre(false)} className="btn btn-secondary" style={{flex:1}}>Cancelar</button>
              <button onClick={guardarNombre} disabled={guardandoNombre||!nuevoNombre.trim()} className="btn btn-primary" style={{flex:1,opacity:(guardandoNombre||!nuevoNombre.trim())?0.6:1}}>
                {guardandoNombre?<><div className="spinner" style={{width:'16px',height:'16px'}}/><span>Guardando...</span></>:'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function FiltroChip({ label, activo, onClick, color }) {
  return (
    <button onClick={onClick} style={{background:activo?'rgba(74,222,128,0.12)':'var(--surface2)',color:activo?(color||'var(--accent)'):'var(--text3)',border:'1.5px solid '+(activo?(color||'rgba(74,222,128,0.35)'):'var(--border2)'),borderRadius:'var(--r-full)',padding:'4px 9px',fontSize:'11px',fontWeight:'700',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
      {label}
    </button>
  )
}