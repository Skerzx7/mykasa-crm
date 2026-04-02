import React, { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase'
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp,
  setDoc, writeBatch
} from 'firebase/firestore'
import { createAuthUser, updateAuthCredentials, pinEmail, pinPass } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Navbar from '../components/Navbar'
import Modal, { Field, ModalActions, ErrorMsg } from '../components/Modal'
import {
  ESTADOS, getEstado, abrirWhatsApp, formatFecha, timeAgo,
  formatDinero, calcularComisiones, calcularVigenciaApartado, chunkArray
} from '../utils/helpers'

const TABS = [
  ['clientes','👥','Clientes'],
  ['vendedores','👤','Vendedores'],
  ['lotes','🏡','Lotes'],
  ['comisiones','💰','Comisiones'],
  ['mensajes','💬','Mensajes'],
]

const MENSAJES_BASE = [
  { titulo:'Bienvenida', texto:'Hola {nombre}, bienvenido a MyKasa 🏡 Tenemos lotes en San Francisco Acuautla, Ixtapaluca. Sin enganche, posesión inmediata y pagos desde $1,500/mes. ¿Le muestro las opciones disponibles?', orden:0, vendedorId:'todos' },
  { titulo:'Ubicación', texto:'Hola {nombre}, nuestros lotes están en San Francisco Acuautla, Ixtapaluca, Edo. Méx. A minutos de la carretera México-Puebla, cerca de plazas y hospitales. Una zona en pleno crecimiento 📍', orden:1, vendedorId:'todos' },
  { titulo:'Horarios de visita', texto:'Hola {nombre}, con gusto le agendamos una visita para conocer los lotes en persona. Atendemos lunes a viernes 9am–7pm y sábados 9am–2pm. ¿Qué día le queda mejor? 📅', orden:2, vendedorId:'todos' },
]

const GRADS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
]

function VendedorCard({ v, index, clientes, onEditar, onEliminar, onMensajes }) {
  const sus = clientes.filter(c => c.vendedorId === v.id)
  const grad = GRADS[index % GRADS.length]
  return (
    <div className="card card-hover" style={{ padding:'20px', overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute',top:0,left:0,right:0,height:'4px',background:grad }} />
      <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px' }}>
        <div style={{ width:'46px',height:'46px',background:grad,borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'800',fontSize:'18px',flexShrink:0 }}>
          {v.nombre?.charAt(0)}
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontWeight:'700',fontSize:'15px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text)' }}>{v.nombre}</div>
          <div style={{ fontSize:'11px',color:'var(--text3)',marginTop:'2px',display:'flex',gap:'12px' }}>
            <span>PIN: <span style={{ fontWeight:'800',color:'var(--accent)',letterSpacing:'3px' }}>{v.pin||'----'}</span></span>
            <span>Comisión: <span style={{ fontWeight:'700',color:'var(--accent)' }}>{formatDinero(v.comision||0)}</span></span>
          </div>
        </div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'12px' }}>
        {ESTADOS.map(e => (
          <div key={e.value} style={{ background:e.bg+'22',borderRadius:'8px',padding:'7px 10px',display:'flex',justifyContent:'space-between',alignItems:'center',border:'1px solid '+e.color+'22' }}>
            <span style={{ fontSize:'10px',color:e.color,fontWeight:'600' }}>{e.icon} {e.label}</span>
            <span style={{ fontWeight:'800',fontSize:'15px',color:e.color }}>{sus.filter(c => c.estado===e.value).length}</span>
          </div>
        ))}
      </div>
      <div style={{ background:'var(--surface2)',borderRadius:'10px',padding:'8px 12px',border:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
        <span style={{ fontSize:'12px',color:'var(--text2)',fontWeight:'600' }}>Total clientes asignados</span>
        <span style={{ fontWeight:'800',fontSize:'20px',color:'var(--accent)' }}>{sus.length}</span>
      </div>
      <div style={{ display:'flex',gap:'8px' }}>
        <button className="btn btn-secondary btn-sm" style={{ flex:1 }} onClick={() => onEditar(v)}>✏️ Editar</button>
        <button className="btn btn-secondary btn-sm" style={{ flex:1 }} onClick={() => onMensajes(v)}>💬 Mensajes</button>
        <button className="btn btn-danger btn-sm" style={{ padding:'6px 10px' }} onClick={() => onEliminar(v)}>🗑️</button>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, activo, onClick, icon }) {
  return (
    <div onClick={onClick}
      style={{ background:activo?'var(--surface3)':'var(--surface)',borderRadius:'var(--r-lg)',padding:'14px',textAlign:'center',cursor:'pointer',border:'2px solid '+(activo?color:'var(--border)'),boxShadow:activo?'0 4px 14px '+color+'44':'var(--sh-sm)',transition:'var(--t)' }}
      onMouseEnter={e => { if(!activo){e.currentTarget.style.borderColor=color;e.currentTarget.style.transform='translateY(-2px)'} }}
      onMouseLeave={e => { if(!activo){e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='translateY(0)'} }}>
      <div style={{ fontSize:'18px',marginBottom:'4px' }}>{icon}</div>
      <div style={{ fontSize:'22px',fontWeight:'800',color:color,lineHeight:1,marginBottom:'3px' }}>{value}</div>
      <div style={{ fontSize:'10px',fontWeight:'600',color:'var(--text3)',lineHeight:1.2 }}>{label}</div>
    </div>
  )
}

function EmptyState({ icon, msg }) {
  return (
    <div className="card" style={{ padding:'60px',textAlign:'center' }}>
      <div style={{ fontSize:'48px',marginBottom:'12px',opacity:0.5 }}>{icon}</div>
      <p style={{ color:'var(--text3)',fontSize:'15px' }}>{msg}</p>
    </div>
  )
}

export default function Admin() {
  const { show: toast } = useToast()
  const [tab, setTab] = useState('clientes')
  const [clientes, setClientes] = useState([])
  const [vendedores, setVendedores] = useState([])
  const [mensajes, setMensajes] = useState([])
  const [lotes, setLotes] = useState([])
  const [inicializado, setInicializado] = useState(false)
  const [cargandoDatos, setCargandoDatos] = useState(true)
  const [modalCliente, setModalCliente] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(null)
  const [modalPago, setModalPago] = useState(null)
  const [modalVendedor, setModalVendedor] = useState(false)
  const [modalEditarVendedor, setModalEditarVendedor] = useState(null)
  const [modalMensaje, setModalMensaje] = useState(false)
  const [modalMensajeVendedor, setModalMensajeVendedor] = useState(null)
  const [modalLote, setModalLote] = useState(false)
  const [editandoLote, setEditandoLote] = useState(null)
  const [editando, setEditando] = useState(null)
  const [fc, setFc] = useState({ nombre:'',telefono:'',notas:'',estado:'nuevo',vendedorId:'',mensualidad:2000,enganche:0,loteNombre:'',montoApartado:'',fuente:'' })
  const [fv, setFv] = useState({ nombre:'',pin:'',comision:'5000' })
  const [fedit, setFedit] = useState({ nombre:'',pin:'',comision:'' })
  const [fm, setFm] = useState({ titulo:'',texto:'',vendedorId:'todos' })
  const [fpago, setFpago] = useState({ tipo:'mensualidad',numero:1,pagadoVendedor:false,fechaPago:new Date().toISOString().split('T')[0],montoLibre:'' })
  const [fmv, setFmv] = useState({ titulo:'',texto:'' })
  const [fl, setFl] = useState({ manzana:'',numero:'',superficie:'',precio:'',disponible:true })
  const [editandoMsgV, setEditandoMsgV] = useState(null)
  const [showFormMsgV, setShowFormMsgV] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroVendedor, setFiltroVendedor] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [filtroComisionVendedor, setFiltroComisionVendedor] = useState('todos')
  const [vendedorMensajesFiltro, setVendedorMensajesFiltro] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db,'clientes'), orderBy('createdAt','desc')),
      s => { setClientes(s.docs.map(d => ({id:d.id,...d.data()}))); setCargandoDatos(false) },
      () => setCargandoDatos(false))
    const u2 = onSnapshot(query(collection(db,'users'), orderBy('nombre')),
      s => setVendedores(s.docs.map(d => ({id:d.id,...d.data()})).filter(u => u.role==='vendedor')))
    const u3 = onSnapshot(query(collection(db,'mensajes'), orderBy('orden')), async s => {
      if (s.empty && !inicializado) {
        setInicializado(true)
        for (const m of MENSAJES_BASE) await addDoc(collection(db,'mensajes'), m)
      } else {
        setMensajes(s.docs.map(d => ({id:d.id,...d.data()})))
      }
    })
    const u4 = onSnapshot(query(collection(db,'lotes'), orderBy('manzana')),
      s => setLotes(s.docs.map(d => ({id:d.id,...d.data()}))))
    return () => { u1(); u2(); u3(); u4() }
  }, [])

  const filtrados = clientes.filter(c => {
    if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false
    if (filtroVendedor !== 'todos' && c.vendedorId !== filtroVendedor) return false
    if (busqueda && !c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) && !c.telefono?.includes(busqueda)) return false
    return true
  })
  const conteo = ESTADOS.reduce((a,e) => { a[e.value] = clientes.filter(c => c.estado===e.value).length; return a }, {})
  const mensajesFiltrados = mensajes.filter(m => !vendedorMensajesFiltro || m.vendedorId===vendedorMensajesFiltro || m.vendedorId==='todos')

  const abrirNuevoCliente = () => {
    setEditando(null)
    setFc({nombre:'',telefono:'',notas:'',estado:'nuevo',vendedorId:'',mensualidad:2000,enganche:0,loteNombre:'',montoApartado:'',fuente:''})
    setError(''); setModalCliente(true)
  }
  const abrirEditarCliente = useCallback((c, e) => {
    if (e) e.stopPropagation()
    setEditando(c)
    setFc({nombre:c.nombre||'',telefono:c.telefono||'',notas:c.notas||'',estado:c.estado||'nuevo',vendedorId:c.vendedorId||'',mensualidad:c.mensualidad||2000,enganche:c.enganche||0,loteNombre:c.loteNombre||'',montoApartado:c.montoApartado||'',fuente:c.fuente||''})
    setError(''); setModalCliente(true)
  }, [])

  const guardarCliente = async () => {
    if (!fc.nombre.trim()) return setError('El nombre es obligatorio')
    setCargando(true); setError('')
    try {
      const v = vendedores.find(x => x.id===fc.vendedorId)
      const data = {
        nombre:fc.nombre.trim(), telefono:fc.telefono.trim(), notas:fc.notas.trim(),
        estado:fc.estado, vendedorId:fc.vendedorId||'', vendedorNombre:v?.nombre||'',
        mensualidad:Number(fc.mensualidad)||2000, enganche:Number(fc.enganche)||0,
        montoApartado:Number(fc.montoApartado)||0, loteNombre:fc.loteNombre||'',
        fuente:fc.fuente||'',
        comision:v?.comision||5000, pagosRegistrados:editando?.pagosRegistrados||[], updatedAt:serverTimestamp(),
      }
      if (editando) {
        await updateDoc(doc(db,'clientes',editando.id), data)
        if (modalDetalle?.id===editando.id) setModalDetalle(prev => ({...prev,...data}))
        toast('Cliente actualizado')
      } else {
        await addDoc(collection(db,'clientes'), {...data, createdAt:serverTimestamp()})
        toast('Cliente agregado')
      }
      setModalCliente(false)
    } catch { setError('Error al guardar. Intenta de nuevo.') }
    setCargando(false)
  }

  const eliminarCliente = async (id, e) => {
    if (e) e.stopPropagation()
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return
    try {
      await deleteDoc(doc(db,'clientes',id))
      if (modalDetalle?.id===id) setModalDetalle(null)
      toast('Cliente eliminado')
    } catch { toast('Error al eliminar','error') }
  }

  const cambiarEstado = async (id, estado) => {
    try {
      const updates = {estado, updatedAt:serverTimestamp()}
      // Al firmar contrato limpiar apartado
      if (estado === 'contrato' || estado === 'cerrado') {
        updates.montoApartado = 0
      }
      await updateDoc(doc(db,'clientes',id), updates)
      if (modalDetalle?.id===id) setModalDetalle(p => ({...p,...updates}))
      toast('Estado: '+getEstado(estado).label, 'info')
    } catch { toast('Error al actualizar estado','error') }
  }

  const guardarVendedor = async () => {
    if (!fv.nombre.trim()) return setError('El nombre es obligatorio')
    if (!fv.pin || fv.pin.length!==4 || !/^\d{4}$/.test(fv.pin)) return setError('El PIN debe ser exactamente 4 dígitos')
    const pinExiste = vendedores.find(v => v.pin===fv.pin)
    if (pinExiste) return setError('El PIN '+fv.pin+' ya está en uso por '+pinExiste.nombre)
    setCargando(true); setError('')
    try {
      const email = pinEmail(fv.pin), pass = pinPass(fv.pin)
      let uid
      try { uid = await createAuthUser(email, pass) }
      catch (e) {
        if (e.message==='EMAIL_EXISTS') {
          const res = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+import.meta.env.VITE_FIREBASE_API_KEY,
            {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass,returnSecureToken:true})})
          const data = await res.json()
          if (data.error) throw new Error('PIN ya en uso y no se pudo recuperar.')
          uid = data.localId
        } else { throw e }
      }
      await setDoc(doc(db,'users',uid), {nombre:fv.nombre.trim(),email,role:'vendedor',comision:Number(fv.comision)||0,pin:fv.pin,createdAt:serverTimestamp()})
      setModalVendedor(false); setFv({nombre:'',pin:'',comision:'5000'})
      toast('Vendedor '+fv.nombre+' creado')
    } catch (e) { setError('Error: '+(e.message||e.code)) }
    setCargando(false)
  }

  const abrirEditarVendedor = v => {
    setFedit({nombre:v.nombre||'',pin:'',comision:String(v.comision||5000)}); setError(''); setModalEditarVendedor(v)
  }

  const guardarEdicionVendedor = async () => {
    if (!fedit.nombre.trim()) return setError('El nombre es obligatorio')
    if (fedit.pin && (fedit.pin.length!==4 || !/^\d{4}$/.test(fedit.pin))) return setError('El PIN debe ser 4 dígitos')
    if (fedit.pin) {
      const pinExiste = vendedores.find(v => v.pin===fedit.pin && v.id!==modalEditarVendedor.id)
      if (pinExiste) return setError('El PIN '+fedit.pin+' ya está en uso por '+pinExiste.nombre)
    }
    setCargando(true); setError('')
    try {
      const updates = {nombre:fedit.nombre.trim(),comision:Number(fedit.comision),updatedAt:serverTimestamp()}
      if (fedit.pin.trim()) {
        await updateAuthCredentials(modalEditarVendedor.pin, fedit.pin)
        updates.pin = fedit.pin; updates.email = pinEmail(fedit.pin)
      }
      await updateDoc(doc(db,'users',modalEditarVendedor.id), updates)
      if (fedit.nombre.trim()!==modalEditarVendedor.nombre) {
        const cv = clientes.filter(c => c.vendedorId===modalEditarVendedor.id)
        for (const chunk of chunkArray(cv, 400)) {
          const batch = writeBatch(db)
          chunk.forEach(c => batch.update(doc(db,'clientes',c.id), {vendedorNombre:fedit.nombre.trim()}))
          await batch.commit()
        }
      }
      setModalEditarVendedor(null); toast('Vendedor actualizado')
    } catch (e) { setError('Error: '+(e.message||'')) }
    setCargando(false)
  }

  const eliminarVendedor = async v => {
    const asignados = clientes.filter(c => c.vendedorId===v.id)
    if (!confirm(asignados.length>0 ? '¿Eliminar a "'+v.nombre+'"?\n\n⚠️ Tiene '+asignados.length+' cliente(s). Quedarán sin vendedor.' : '¿Eliminar a "'+v.nombre+'"?')) return
    try {
      for (const chunk of chunkArray(asignados, 400)) {
        const batch = writeBatch(db)
        chunk.forEach(c => batch.update(doc(db,'clientes',c.id), {vendedorId:'',vendedorNombre:'',updatedAt:serverTimestamp()}))
        await batch.commit()
      }
      await deleteDoc(doc(db,'users',v.id))
      toast('Vendedor "'+v.nombre+'" eliminado')
    } catch (e) { toast('Error: '+(e.message||''), 'error') }
  }

  const abrirNuevoLote = () => { setEditandoLote(null); setFl({manzana:'',numero:'',superficie:'',precio:'',disponible:true}); setError(''); setModalLote(true) }
  const abrirEditarLote = (l, e) => { if(e)e.stopPropagation(); setEditandoLote(l); setFl({manzana:l.manzana||'',numero:l.numero||'',superficie:String(l.superficie||''),precio:String(l.precio||''),disponible:l.disponible??true}); setError(''); setModalLote(true) }

  const guardarLote = async () => {
    if (!fl.manzana.trim() || !fl.numero.trim()) return setError('Manzana y número son obligatorios')
    if (fl.precio && isNaN(Number(fl.precio))) return setError('Precio debe ser número')
    setCargando(true); setError('')
    try {
      const data = {manzana:fl.manzana.trim().toUpperCase(),numero:fl.numero.trim(),superficie:Number(fl.superficie)||0,precio:Number(fl.precio)||0,disponible:fl.disponible,updatedAt:serverTimestamp()}
      if (editandoLote) { await updateDoc(doc(db,'lotes',editandoLote.id), data); toast('Lote actualizado') }
      else { await addDoc(collection(db,'lotes'), {...data,createdAt:serverTimestamp()}); toast('Lote agregado') }
      setModalLote(false)
    } catch { setError('Error al guardar lote') }
    setCargando(false)
  }

  const eliminarLote = async l => {
    if (!confirm('¿Eliminar lote Mz '+l.manzana+' Lt '+l.numero+'?')) return
    try { await deleteDoc(doc(db,'lotes',l.id)); toast('Lote eliminado') } catch { toast('Error al eliminar','error') }
  }

  const toggleDisponible = async l => {
    try { await updateDoc(doc(db,'lotes',l.id), {disponible:!l.disponible,updatedAt:serverTimestamp()}); toast(l.disponible?'Marcado como vendido':'Marcado como disponible','info') }
    catch { toast('Error','error') }
  }

  const guardarMensaje = async () => {
    if (!fm.titulo.trim() || !fm.texto.trim()) return setError('Título y texto son obligatorios')
    setCargando(true); setError('')
    try {
      if (editando) { await updateDoc(doc(db,'mensajes',editando.id), {titulo:fm.titulo,texto:fm.texto,vendedorId:fm.vendedorId||'todos'}); toast('Mensaje actualizado') }
      else { await addDoc(collection(db,'mensajes'), {titulo:fm.titulo,texto:fm.texto,vendedorId:fm.vendedorId||'todos',orden:mensajes.length}); toast('Mensaje creado') }
      setModalMensaje(false); setEditando(null)
    } catch { setError('Error al guardar') }
    setCargando(false)
  }

  const guardarMensajeVendedor = async () => {
    if (!fmv.titulo.trim() || !fmv.texto.trim() || !modalMensajeVendedor) return setError('Título y texto obligatorios')
    setCargando(true); setError('')
    try {
      if (editandoMsgV) { await updateDoc(doc(db,'mensajes',editandoMsgV.id), {titulo:fmv.titulo,texto:fmv.texto}); toast('Mensaje actualizado') }
      else { await addDoc(collection(db,'mensajes'), {titulo:fmv.titulo,texto:fmv.texto,vendedorId:modalMensajeVendedor.id,orden:mensajes.length}); toast('Mensaje creado') }
      setShowFormMsgV(false); setEditandoMsgV(null); setFmv({titulo:'',texto:''}); setError('')
    } catch { setError('Error al guardar') }
    setCargando(false)
  }

  const eliminarMensaje = async id => {
    if (!confirm('¿Eliminar este mensaje?')) return
    try { await deleteDoc(doc(db,'mensajes',id)); toast('Mensaje eliminado') } catch { toast('Error al eliminar','error') }
  }

  const registrarPago = async () => {
    if (!modalPago) return
    // monto: usa el libre si se especificó, si no el default del tipo
    const montoFinal = fpago.montoLibre && Number(fpago.montoLibre) > 0
      ? Number(fpago.montoLibre)
      : fpago.tipo==='enganche' ? (modalPago.enganche||0) : (modalPago.mensualidad||2000)
    setCargando(true)
    try {
      const pagosActuales = modalPago.pagosRegistrados||[]
      const yaExiste = pagosActuales.find(p => p.tipo===fpago.tipo && p.numero===fpago.numero)
      const nuevosPagos = yaExiste
        ? pagosActuales.map(p => (p.tipo===fpago.tipo&&p.numero===fpago.numero)
            ? {...p, pagadoVendedor:fpago.pagadoVendedor, fechaPago:fpago.fechaPago, monto:montoFinal}
            : p)
        : [...pagosActuales, {
            tipo:fpago.tipo, numero:Number(fpago.numero),
            pagadoVendedor:fpago.pagadoVendedor, fechaPago:fpago.fechaPago,
            monto:montoFinal
          }]
      await updateDoc(doc(db,'clientes',modalPago.id), {pagosRegistrados:nuevosPagos,updatedAt:serverTimestamp()})
      setModalPago(null)
      toast(fpago.pagadoVendedor?'Pago registrado ✓':'Pago marcado pendiente', fpago.pagadoVendedor?'success':'info')
    } catch { toast('Error al registrar pago','error') }
    setCargando(false)
  }

  const resumenComisiones = vendedores.map(v => {
    const mis = clientes.filter(c => (c.estado==='contrato'||c.estado==='cerrado') && c.vendedorId===v.id)
    let ganado=0, pendiente=0
    mis.forEach(c => {
      const {comisionCubierta,comisionPendiente} = calcularComisiones(c.comision||v.comision||5000, c.mensualidad||2000, c.pagosRegistrados||[])
      ganado+=comisionCubierta; pendiente+=comisionPendiente
    })
    return {...v, ganado, pendiente, ventas:mis.length}
  })

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Navbar tabs={TABS} tabActivo={tab} onTab={setTab} />
      <div style={{ padding:'20px', maxWidth:'1200px', margin:'0 auto' }}>

        {tab==='clientes' && (
          <div className="fade-in">
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:'10px',marginBottom:'18px' }}>
              <StatCard label="Total" value={clientes.length} color="var(--accent)" activo={filtroEstado==='todos'} onClick={() => setFiltroEstado('todos')} icon="👥" />
              {ESTADOS.map(e => <StatCard key={e.value} label={e.label} value={conteo[e.value]||0} color={e.color} activo={filtroEstado===e.value} onClick={() => setFiltroEstado(filtroEstado===e.value?'todos':e.value)} icon={e.icon} />)}
            </div>
            <div className="card" style={{ padding:'12px 16px',marginBottom:'14px',display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center' }}>
              <div style={{ position:'relative',flex:1,minWidth:'180px' }}>
                <span style={{ position:'absolute',left:'11px',top:'50%',transform:'translateY(-50%)',fontSize:'14px',pointerEvents:'none' }}>🔍</span>
                <input className="input" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre o teléfono..." style={{ paddingLeft:'34px' }} />
              </div>
              <select className="input" value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)} style={{ width:'auto',minWidth:'150px' }}>
                <option value="todos">Todos los vendedores</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
              <button className="btn btn-primary" onClick={abrirNuevoCliente}>＋ Nuevo cliente</button>
            </div>
            {cargandoDatos ? (
              <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:'72px',borderRadius:'var(--r-lg)' }} />)}
              </div>
            ) : filtrados.length===0 ? (
              <EmptyState icon="🔍" msg={busqueda?'Sin resultados para tu búsqueda':'No hay clientes registrados aún'} />
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
                {filtrados.map((c,i) => {
                  const est = getEstado(c.estado)
                  const vigencia = calcularVigenciaApartado(c.montoApartado, c.createdAt)
                  return (
                    <div key={c.id} className="card" style={{ padding:'13px 16px',display:'flex',alignItems:'center',gap:'12px',cursor:'pointer',transition:'all 0.18s',animationDelay:i*0.02+'s' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow='var(--sh)'; e.currentTarget.style.transform='translateY(-1px)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow=''; e.currentTarget.style.transform='' }}
                      onClick={() => setModalDetalle(c)}>
                      <div style={{ width:'38px',height:'38px',background:'linear-gradient(135deg,'+est.color+'33,'+est.color+'55)',border:'2px solid '+est.color+'44',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'800',color:est.color,fontSize:'14px',flexShrink:0 }}>
                        {c.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ display:'flex',alignItems:'center',gap:'7px',flexWrap:'wrap',marginBottom:'3px' }}>
                          <span style={{ fontWeight:'700',fontSize:'14px',color:'var(--text)' }}>{c.nombre}</span>
                          <span className="badge" style={{ background:est.bg+'33',color:est.color,border:'1px solid '+est.color+'33' }}>{est.icon} {est.label}</span>
                          {c.mensualidad>0 && <span style={{ fontSize:'10px',color:'var(--text3)',background:'var(--surface2)',padding:'2px 7px',borderRadius:'var(--r-full)',border:'1px solid var(--border)' }}>💵 {formatDinero(c.mensualidad)}/mes</span>}
                          {c.loteNombre && <span style={{ fontSize:'10px',color:'var(--text3)',background:'var(--surface2)',padding:'2px 7px',borderRadius:'var(--r-full)',border:'1px solid var(--border)' }}>🏡 {c.loteNombre}</span>}
                          {vigencia && <span style={{ fontSize:'10px',padding:'2px 7px',borderRadius:'var(--r-full)',fontWeight:'700',background:vigencia.vencido?'var(--red-bg)':'rgba(251,146,60,0.1)',color:vigencia.vencido?'var(--red)':'var(--orange)',border:'1px solid '+(vigencia.vencido?'var(--red-border)':'rgba(251,146,60,0.2)') }}>🔒 {vigencia.vencido?'Venció hace '+Math.abs(vigencia.restantes)+'d':'Aparta '+vigencia.restantes+'d'}</span>}
                        </div>
                        <div style={{ display:'flex',gap:'12px',flexWrap:'wrap',fontSize:'11px',color:'var(--text3)' }}>
                          <span>📱 {c.telefono}</span>
                          {c.vendedorNombre && <span>👤 {c.vendedorNombre}</span>}
                          <span>🕐 {timeAgo(c.createdAt)}</span>
                        </div>
                      </div>
                      <div style={{ display:'flex',gap:'6px',flexShrink:0 }} onClick={e => e.stopPropagation()}>
                        <select value={c.estado} onChange={e => cambiarEstado(c.id,e.target.value)}
                          style={{ padding:'5px 7px',border:'1.5px solid '+est.color+'44',borderRadius:'8px',fontSize:'11px',color:est.color,background:est.bg+'33',fontWeight:'600',outline:'none',cursor:'pointer',appearance:'none',paddingRight:'7px' }}>
                          {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>
                        <button className="btn btn-success btn-sm" onClick={e => { e.stopPropagation(); abrirWhatsApp(c.telefono) }}>WA</button>
                        <button className="btn btn-secondary btn-sm" onClick={e => abrirEditarCliente(c,e)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={e => eliminarCliente(c.id,e)}>✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab==='vendedores' && (
          <div className="fade-in">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px' }}>
              <div>
                <h2 style={{ fontSize:'20px',fontWeight:'700',color:'var(--text)' }}>Equipo de vendedores</h2>
                <p style={{ fontSize:'13px',color:'var(--text3)',marginTop:'2px' }}>{vendedores.length} vendedor{vendedores.length!==1?'es':''} registrado{vendedores.length!==1?'s':''}</p>
              </div>
              <button className="btn btn-primary" onClick={() => { setFv({nombre:'',pin:'',comision:'5000'}); setError(''); setModalVendedor(true) }}>＋ Agregar</button>
            </div>
            {vendedores.length===0 ? <EmptyState icon="👤" msg="No hay vendedores registrados" /> : (
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:'14px' }}>
                {vendedores.map((v,i) => <VendedorCard key={v.id} v={v} index={i} clientes={clientes} onEditar={abrirEditarVendedor} onEliminar={eliminarVendedor} onMensajes={v => { setModalMensajeVendedor(v); setShowFormMsgV(false); setEditandoMsgV(null); setFmv({titulo:'',texto:''}); setError('') }} />)}
              </div>
            )}
          </div>
        )}

        {tab==='lotes' && (
          <div className="fade-in">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px' }}>
              <div>
                <h2 style={{ margin:0,fontSize:'20px',fontWeight:'800',color:'var(--text)' }}>🏡 Catálogo de lotes</h2>
                <p style={{ margin:'4px 0 0',color:'var(--text3)',fontSize:'13px' }}>{lotes.filter(l=>l.disponible).length} disponibles · {lotes.filter(l=>!l.disponible).length} vendidos</p>
              </div>
              <button className="btn btn-primary" onClick={abrirNuevoLote}>＋ Agregar lote</button>
            </div>
            {lotes.length===0 ? <EmptyState icon="🏡" msg="No hay lotes registrados aún" /> : (
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'10px' }}>
                {lotes.map(l => (
                  <div key={l.id} className="card card-hover" style={{ padding:'16px',position:'relative',opacity:l.disponible?1:0.65 }}>
                    <div style={{ position:'absolute',top:'12px',right:'12px' }}>
                      <span style={{ fontSize:'10px',padding:'3px 8px',borderRadius:'10px',fontWeight:'700',background:l.disponible?'rgba(34,197,94,0.1)':'var(--red-bg)',color:l.disponible?'var(--accent)':'var(--red)',border:'1px solid '+(l.disponible?'rgba(74,222,128,0.2)':'var(--red-border)') }}>
                        {l.disponible?'Disponible':'Vendido'}
                      </span>
                    </div>
                    <div style={{ fontSize:'20px',fontWeight:'900',color:'var(--accent)',marginBottom:'4px' }}>Mz {l.manzana} Lt {l.numero}</div>
                    {l.superficie>0 && <div style={{ fontSize:'12px',color:'var(--text3)' }}>📐 {l.superficie} m²</div>}
                    {l.precio>0 && <div style={{ fontSize:'13px',fontWeight:'700',color:'var(--text)',marginTop:'4px' }}>{formatDinero(l.precio)}</div>}
                    <div style={{ display:'flex',gap:'6px',marginTop:'12px' }}>
                      <button className="btn btn-secondary btn-sm" style={{ flex:1,fontSize:'11px' }} onClick={e => abrirEditarLote(l,e)}>✏️</button>
                      <button className="btn btn-secondary btn-sm" style={{ flex:1,fontSize:'11px' }} onClick={() => toggleDisponible(l)}>{l.disponible?'🔒 Vender':'✅ Liberar'}</button>
                      <button className="btn btn-danger btn-sm" style={{ padding:'6px 8px' }} onClick={() => eliminarLote(l)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==='comisiones' && (
          <div className="fade-in">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px',flexWrap:'wrap',gap:'10px' }}>
              <div>
                <h2 style={{ fontSize:'20px',fontWeight:'700',color:'var(--text)' }}>Panel de comisiones</h2>
                <p style={{ fontSize:'13px',color:'var(--text3)',marginTop:'2px' }}>Control de pagos a vendedores</p>
              </div>
              <select className="input" value={filtroComisionVendedor} onChange={e => setFiltroComisionVendedor(e.target.value)} style={{ width:'auto',minWidth:'180px' }}>
                <option value="todos">Todos los vendedores</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'12px',marginBottom:'24px' }}>
              {resumenComisiones.filter(v => filtroComisionVendedor==='todos'||v.id===filtroComisionVendedor).map((v,i) => (
                <div key={v.id} className="card" style={{ padding:'18px',overflow:'hidden',position:'relative' }}>
                  <div style={{ position:'absolute',top:0,left:0,right:0,height:'3px',background:GRADS[i%GRADS.length] }} />
                  <div style={{ fontWeight:'700',fontSize:'14px',marginBottom:'12px',display:'flex',alignItems:'center',gap:'7px',color:'var(--text)' }}>
                    <div style={{ width:'28px',height:'28px',background:GRADS[i%GRADS.length],borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'800',fontSize:'12px' }}>{v.nombre?.charAt(0)}</div>
                    {v.nombre}
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px' }}>
                    <div style={{ background:'rgba(34,197,94,0.1)',borderRadius:'8px',padding:'10px',textAlign:'center',border:'1px solid rgba(74,222,128,0.2)' }}>
                      <div style={{ fontSize:'10px',color:'var(--accent)',fontWeight:'700',marginBottom:'3px' }}>Pagado</div>
                      <div style={{ fontSize:'14px',fontWeight:'800',color:'var(--accent)' }}>{formatDinero(v.ganado)}</div>
                    </div>
                    <div style={{ background:'rgba(251,191,36,0.1)',borderRadius:'8px',padding:'10px',textAlign:'center',border:'1px solid rgba(251,191,36,0.2)' }}>
                      <div style={{ fontSize:'10px',color:'var(--yellow)',fontWeight:'700',marginBottom:'3px' }}>Pendiente</div>
                      <div style={{ fontSize:'14px',fontWeight:'800',color:'var(--yellow)' }}>{formatDinero(v.pendiente)}</div>
                    </div>
                  </div>
                  <div style={{ background:'var(--surface2)',borderRadius:'8px',padding:'8px 10px',display:'flex',justifyContent:'space-between',fontSize:'12px' }}>
                    <span style={{ color:'var(--text3)' }}>Ventas cerradas</span>
                    <span style={{ fontWeight:'700',color:'var(--accent)' }}>{v.ventas}</span>
                  </div>
                </div>
              ))}
            </div>
            <h3 style={{ fontSize:'16px',fontWeight:'700',marginBottom:'4px',color:'var(--text2)' }}>Detalle por cliente</h3>
            <p style={{ fontSize:'12px',color:'var(--text3)',marginBottom:'12px' }}>Contratos firmados · Usa "+ Pago" para registrar enganche o mensualidades</p>
            <div style={{ display:'flex',flexDirection:'column',gap:'10px' }}>
              {clientes.filter(c => (c.estado==='contrato'||c.estado==='cerrado') && (filtroComisionVendedor==='todos'||c.vendedorId===filtroComisionVendedor)).map(c => {
                const v = vendedores.find(x => x.id===c.vendedorId)
                const {pagos,comisionTotal,comisionCubierta,comisionPendiente} = calcularComisiones(c.comision||v?.comision||5000, c.mensualidad||2000, c.pagosRegistrados||[])
                const pct = comisionTotal>0 ? Math.round((comisionCubierta/comisionTotal)*100) : 0
                return (
                  <div key={c.id} className="card" style={{ padding:'16px 20px' }}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'10px',marginBottom:'14px' }}>
                      <div>
                        <div style={{ fontWeight:'700',fontSize:'15px',marginBottom:'3px',color:'var(--text)' }}>{c.nombre}</div>
                        <div style={{ fontSize:'12px',color:'var(--text3)',display:'flex',gap:'12px',flexWrap:'wrap' }}>
                          <span>👤 {c.vendedorNombre||'Sin asignar'}</span>
                          <span>💵 {formatDinero(c.mensualidad)}/mes</span>
                          {c.enganche>0 && <span>🤝 Eng. {formatDinero(c.enganche)}</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex',gap:'8px',alignItems:'center' }}>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:'11px',color:'var(--text3)' }}>Comisión total</div>
                          <div style={{ fontWeight:'800',fontSize:'16px',color:'var(--accent)' }}>{formatDinero(comisionTotal)}</div>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => abrirEditarCliente(c)}>✏️ Editar</button>
                        <button className="btn btn-primary btn-sm" onClick={() => { setModalPago(c); setFpago({tipo:'mensualidad',numero:1,pagadoVendedor:false,fechaPago:new Date().toISOString().split('T')[0],montoLibre:''}) }}>+ Pago</button>
                      </div>
                    </div>
                    <div style={{ marginBottom:'12px' }}>
                      <div style={{ display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'5px' }}>
                        <span style={{ color:'var(--accent)',fontWeight:'600' }}>Pagado: {formatDinero(comisionCubierta)}</span>
                        <span style={{ color:'var(--yellow)',fontWeight:'600' }}>Pendiente: {formatDinero(comisionPendiente)}</span>
                      </div>
                      <div style={{ background:'var(--surface4)',borderRadius:'99px',height:'8px',overflow:'hidden' }}>
                        <div style={{ width:pct+'%',height:'100%',background:'linear-gradient(90deg,var(--v600),var(--accent))',borderRadius:'99px',transition:'width 0.6s var(--ease)' }} />
                      </div>
                      <div style={{ fontSize:'11px',color:'var(--text3)',marginTop:'3px',textAlign:'right' }}>{pct}% cubierto</div>
                    </div>
                    <div style={{ display:'flex',gap:'6px',flexWrap:'wrap' }}>
                      {pagos.map((p,i) => (
                        <div key={i} style={{ padding:'5px 9px',borderRadius:'7px',fontSize:'11px',fontWeight:'600',background:p.montoVendedor===0?'var(--surface3)':p.pagadoVendedor?'rgba(34,197,94,0.1)':'rgba(251,191,36,0.1)',color:p.montoVendedor===0?'var(--text4)':p.pagadoVendedor?'var(--accent)':'var(--yellow)',border:'1px solid '+(p.montoVendedor===0?'var(--border)':p.pagadoVendedor?'rgba(74,222,128,0.2)':'rgba(251,191,36,0.2)') }}>
                          <div>{p.tipo==='enganche'?'🤝 Eng':'M'+p.numero}{p.montoVendedor>0&&<span style={{ marginLeft:'4px' }}>{formatDinero(p.montoVendedor)}</span>}{p.montoVendedor===0&&<span style={{ marginLeft:'4px',opacity:.6 }}>Ofic.</span>}{p.pagadoVendedor&&<span style={{ marginLeft:'3px' }}>✓</span>}</div>
                          {p.fecha && <div style={{ fontSize:'9px',opacity:0.7,marginTop:'2px' }}>{new Date(p.fecha).toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {clientes.filter(c => c.estado==='contrato'||c.estado==='cerrado').length===0 && <EmptyState icon="💰" msg="No hay contratos firmados aún" />}
            </div>
          </div>
        )}

        {tab==='mensajes' && (
          <div className="fade-in">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px' }}>
              <div>
                <h2 style={{ fontSize:'20px',fontWeight:'700',color:'var(--text)' }}>Mensajes predefinidos</h2>
                <p style={{ fontSize:'13px',color:'var(--text3)',marginTop:'2px' }}>Usa <code style={{ background:'rgba(74,222,128,0.1)',color:'var(--accent)',padding:'1px 6px',borderRadius:'4px',fontSize:'12px' }}>{'{nombre}'}</code> para el nombre del cliente</p>
              </div>
              <button className="btn btn-primary" onClick={() => { setEditando(null); setFm({titulo:'',texto:'',vendedorId:'todos'}); setError(''); setModalMensaje(true) }}>＋ Nuevo</button>
            </div>
            <div style={{ marginBottom:'14px' }}>
              <select className="input" value={vendedorMensajesFiltro} onChange={e => setVendedorMensajesFiltro(e.target.value)} style={{ width:'auto',minWidth:'200px' }}>
                <option value="">Todos los mensajes</option>
                <option value="todos">Solo generales</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>Solo {v.nombre}</option>)}
              </select>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:'12px' }}>
              {mensajesFiltrados.map(m => {
                const vNombre = m.vendedorId==='todos'?'Todos':(vendedores.find(v => v.id===m.vendedorId)?.nombre||'?')
                return (
                  <div key={m.id} className="card card-hover" style={{ padding:'16px 18px' }}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px',marginBottom:'10px' }}>
                      <div>
                        <span style={{ fontWeight:'700',fontSize:'13px',color:'var(--text)',display:'block',marginBottom:'4px' }}>{m.titulo}</span>
                        <span style={{ fontSize:'10px',background:'var(--surface3)',color:'var(--text3)',padding:'2px 8px',borderRadius:'var(--r-full)',fontWeight:'600' }}>👤 {vNombre}</span>
                      </div>
                      <div style={{ display:'flex',gap:'5px',flexShrink:0 }}>
                        <button className="btn btn-secondary btn-sm" style={{ fontSize:'11px',padding:'4px 8px' }} onClick={() => { setEditando(m); setFm({titulo:m.titulo,texto:m.texto,vendedorId:m.vendedorId||'todos'}); setError(''); setModalMensaje(true) }}>✏️</button>
                        <button className="btn btn-danger btn-sm" style={{ fontSize:'11px',padding:'4px 8px' }} onClick={() => eliminarMensaje(m.id)}>✕</button>
                      </div>
                    </div>
                    <p style={{ fontSize:'12px',color:'var(--text2)',lineHeight:'1.6',margin:0 }}>{m.texto}</p>
                    <div style={{ fontSize:'10px',color:'var(--text4)',borderTop:'1px solid var(--border)',paddingTop:'7px',marginTop:'10px' }}>{m.texto.length} caracteres</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {modalDetalle && (() => {
        const c=modalDetalle, est=getEstado(c.estado), vig=calcularVigenciaApartado(c.montoApartado,c.createdAt)
        return (
          <Modal titulo="Detalle del cliente" onClose={() => setModalDetalle(null)} size="lg">
            <div style={{ display:'flex',alignItems:'center',gap:'14px',marginBottom:'18px',padding:'14px 16px',background:'var(--surface2)',borderRadius:'12px',border:'1px solid var(--border)' }}>
              <div style={{ width:'50px',height:'50px',background:'linear-gradient(135deg,'+est.color+'33,'+est.color+'55)',border:'2px solid '+est.color+'44',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'800',color:est.color,fontSize:'19px',flexShrink:0 }}>{c.nombre?.charAt(0).toUpperCase()}</div>
              <div style={{ flex:1 }}>
                <h3 style={{ fontSize:'17px',fontWeight:'700',marginBottom:'4px',color:'var(--text)' }}>{c.nombre}</h3>
                <div style={{ display:'flex',gap:'12px',flexWrap:'wrap',fontSize:'12px',color:'var(--text3)' }}>
                  <span>📱 {c.telefono}</span>
                  {c.vendedorNombre && <span>👤 {c.vendedorNombre}</span>}
                  <span>📅 {formatFecha(c.createdAt)}</span>
                  {c.mensualidad>0 && <span>💵 {formatDinero(c.mensualidad)}/mes</span>}
                  {c.loteNombre && <span>🏡 {c.loteNombre}</span>}
                  {c.fuente && <span>📣 {c.fuente}</span>}
                </div>
              </div>
              <button className="btn btn-success btn-sm" onClick={() => abrirWhatsApp(c.telefono)}>📱 WA</button>
            </div>
            <div style={{ marginBottom:'16px' }}>
              <label style={{ fontSize:'11px',fontWeight:'700',color:'var(--text3)',display:'block',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.5px' }}>Estado</label>
              <div style={{ display:'flex',gap:'7px',flexWrap:'wrap' }}>
                {ESTADOS.map(e => <button key={e.value} onClick={() => cambiarEstado(c.id,e.value)} style={{ padding:'7px 13px',borderRadius:'var(--r-full)',border:'2px solid '+(c.estado===e.value?e.color:'var(--border)'),background:c.estado===e.value?e.bg+'33':'transparent',color:c.estado===e.value?e.color:'var(--text3)',fontSize:'12px',fontWeight:'700',cursor:'pointer',transition:'var(--t)' }}>{e.icon} {e.label}</button>)}
              </div>
            </div>
            {vig && (
              <div style={{ background:vig.vencido?'var(--red-bg)':'rgba(251,146,60,0.06)',border:'1px solid '+(vig.vencido?'var(--red-border)':'rgba(251,146,60,0.2)'),borderRadius:'10px',padding:'12px 14px',marginBottom:'14px' }}>
                <div style={{ fontSize:'11px',fontWeight:'700',color:vig.vencido?'var(--red)':'var(--orange)',marginBottom:'6px' }}>🔒 APARTADO</div>
                <div style={{ display:'flex',gap:'16px',flexWrap:'wrap',fontSize:'12px',color:'var(--text2)' }}>
                  <span>💵 <strong>{formatDinero(c.montoApartado)}</strong></span>
                  <span>📅 <strong>{vig.dias} días</strong> de vigencia</span>
                  <span style={{ color:vig.vencido?'var(--red)':'var(--accent)',fontWeight:'700' }}>{vig.vencido?'⚠️ Venció hace '+Math.abs(vig.restantes)+' días':'✅ Vence en '+vig.restantes+' días ('+formatFecha({toDate:()=>vig.vence})+')'}</span>
                </div>
              </div>
            )}
            {c.notas && <div style={{ background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:'10px',padding:'12px 14px',marginBottom:'14px' }}><div style={{ fontSize:'11px',fontWeight:'700',color:'var(--yellow)',marginBottom:'4px' }}>📝 NOTAS</div><p style={{ fontSize:'13px',color:'var(--text2)',lineHeight:'1.6',margin:0 }}>{c.notas}</p></div>}
            <div style={{ display:'flex',gap:'10px',justifyContent:'flex-end',paddingTop:'14px',borderTop:'1px solid var(--border)' }}>
              <button className="btn btn-danger btn-sm" onClick={() => eliminarCliente(c.id)}>Eliminar</button>
              <button className="btn btn-secondary" onClick={() => { setModalDetalle(null); abrirEditarCliente(c) }}>✏️ Editar cliente</button>
            </div>
          </Modal>
        )
      })()}

      {modalCliente && (
        <Modal titulo={editando?'Editar cliente':'Nuevo cliente'} onClose={() => setModalCliente(false)}>
          <Field label="Nombre completo" required><input className="input" value={fc.nombre} onChange={e => setFc({...fc,nombre:e.target.value})} placeholder="Ej: Juan García" autoFocus /></Field>
          <Field label="Teléfono"><input className="input" value={fc.telefono} onChange={e => setFc({...fc,telefono:e.target.value})} placeholder="Ej: 5512345678" inputMode="tel" /></Field>
          <Field label="Fuente" hint="¿Cómo llegó este cliente?">
            <input className="input" value={fc.fuente} onChange={e => setFc({...fc,fuente:e.target.value})} placeholder="Ej: Facebook, recomendación, visita directa..." />
          </Field>
          <Field label="Asignar a vendedor">
            <select className="input" value={fc.vendedorId} onChange={e => setFc({...fc,vendedorId:e.target.value})}>
              <option value="">Sin asignar</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Field>
          <Field label="Lote" hint="Escribe el número de lote que le interesa o compró">
            <input className="input" value={fc.loteNombre} onChange={e => setFc({...fc,loteNombre:e.target.value})} placeholder="Ej: Mz A Lt 12" />
          </Field>
          <Field label="Apartado ($)" hint="Opcional — 500 pesos = 8 días de vigencia">
            <input className="input" type="number" value={fc.montoApartado||''} onChange={e => setFc({...fc,montoApartado:e.target.value})} placeholder="Ej: 500" inputMode="numeric" />
          </Field>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px' }}>
            <Field label="Mensualidad ($)"><input className="input" type="number" value={fc.mensualidad} onChange={e => setFc({...fc,mensualidad:e.target.value})} placeholder="2000" inputMode="numeric" /></Field>
            <Field label="Enganche ($)" hint="0 si no hubo"><input className="input" type="number" value={fc.enganche} onChange={e => setFc({...fc,enganche:e.target.value})} placeholder="0" inputMode="numeric" /></Field>
          </div>
          <Field label="Estado">
            <select className="input" value={fc.estado} onChange={e => setFc({...fc,estado:e.target.value})}>
              {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.icon} {e.label}</option>)}
            </select>
          </Field>
          <Field label="Notas"><textarea className="input" value={fc.notas} onChange={e => setFc({...fc,notas:e.target.value})} rows={3} placeholder="Lote de interés, presupuesto, observaciones..." style={{ resize:'vertical' }} /></Field>
          <ErrorMsg>{error}</ErrorMsg>
          <ModalActions onCancel={() => setModalCliente(false)} onSave={guardarCliente} loading={cargando} />
        </Modal>
      )}

      {modalVendedor && (
        <Modal titulo="Agregar vendedor" onClose={() => setModalVendedor(false)}>
          <Field label="Nombre completo" required><input className="input" value={fv.nombre} onChange={e => setFv({...fv,nombre:e.target.value})} placeholder="Ej: Carlos López" autoFocus /></Field>
          <Field label="PIN de acceso (4 dígitos)" required hint="El vendedor usa este PIN para iniciar sesión">
            <input className="input" type="text" inputMode="numeric" maxLength={4} value={fv.pin} onChange={e => setFv({...fv,pin:e.target.value.replace(/\D/g,'').slice(0,4)})} placeholder="1234" style={{ letterSpacing:'12px',fontSize:'24px',fontWeight:'800',textAlign:'center' }} />
          </Field>
          <Field label="Comisión por venta ($)" hint="Monto MXN por cada venta cerrada (puede editarse después)">
            <input className="input" type="number" value={fv.comision} onChange={e => setFv({...fv,comision:e.target.value})} placeholder="5000" inputMode="numeric" />
          </Field>
          <ErrorMsg>{error}</ErrorMsg>
          <ModalActions onCancel={() => setModalVendedor(false)} onSave={guardarVendedor} loading={cargando} saveLabel="Crear vendedor" />
        </Modal>
      )}

      {modalEditarVendedor && (
        <Modal titulo={'Editar: '+modalEditarVendedor.nombre} onClose={() => setModalEditarVendedor(null)}>
          <Field label="Nombre completo" required><input className="input" value={fedit.nombre} onChange={e => setFedit({...fedit,nombre:e.target.value})} placeholder="Nombre del vendedor" autoFocus /></Field>
          <Field label="Nuevo PIN (4 dígitos)" hint="Déjalo vacío para no cambiar el PIN actual">
            <input className="input" type="text" inputMode="numeric" maxLength={4} value={fedit.pin} onChange={e => setFedit({...fedit,pin:e.target.value.replace(/\D/g,'').slice(0,4)})} placeholder={'PIN actual: '+modalEditarVendedor.pin} style={{ letterSpacing:'8px',fontSize:'20px',fontWeight:'800',textAlign:'center' }} />
          </Field>
          <Field label="Comisión por venta ($)" required><input className="input" type="number" value={fedit.comision} onChange={e => setFedit({...fedit,comision:e.target.value})} placeholder="5000" inputMode="numeric" /></Field>
          <div style={{ background:'rgba(96,165,250,0.08)',borderRadius:'10px',padding:'10px 14px',fontSize:'12px',color:'var(--blue)',marginBottom:'4px',border:'1px solid rgba(96,165,250,0.2)' }}>
            ℹ️ Tiene <strong>{clientes.filter(c=>c.vendedorId===modalEditarVendedor.id).length}</strong> cliente(s). Si cambias el nombre se actualizará en todos ellos.
          </div>
          <ErrorMsg>{error}</ErrorMsg>
          <ModalActions onCancel={() => setModalEditarVendedor(null)} onSave={guardarEdicionVendedor} loading={cargando} saveLabel="Guardar cambios" />
        </Modal>
      )}

      {modalLote && (
        <Modal titulo={editandoLote?'Editar lote':'Agregar lote'} onClose={() => setModalLote(false)}>
          <Field label="Manzana" required><input className="input" value={fl.manzana} onChange={e => setFl({...fl,manzana:e.target.value})} placeholder="Ej: A" autoFocus /></Field>
          <Field label="Número de lote" required><input className="input" value={fl.numero} onChange={e => setFl({...fl,numero:e.target.value})} placeholder="Ej: 12" /></Field>
          <Field label="Superficie (m²)"><input className="input" type="number" value={fl.superficie} onChange={e => setFl({...fl,superficie:e.target.value})} placeholder="Ej: 120" /></Field>
          <Field label="Precio ($)"><input className="input" type="number" value={fl.precio} onChange={e => setFl({...fl,precio:e.target.value})} placeholder="Ej: 180000" /></Field>
          <Field label="Estado">
            <select className="input" value={String(fl.disponible)} onChange={e => setFl({...fl,disponible:e.target.value==='true'})}>
              <option value="true">✅ Disponible</option>
              <option value="false">🔒 Vendido</option>
            </select>
          </Field>
          <ErrorMsg>{error}</ErrorMsg>
          <ModalActions onCancel={() => setModalLote(false)} onSave={guardarLote} loading={cargando} saveLabel={editandoLote?'Guardar cambios':'Agregar lote'} />
        </Modal>
      )}

      {modalMensajeVendedor && (
        <Modal titulo={'Mensajes de '+modalMensajeVendedor.nombre} onClose={() => { setModalMensajeVendedor(null); setShowFormMsgV(false); setEditandoMsgV(null) }} size="lg">
          <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:'12px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowFormMsgV(true); setEditandoMsgV(null); setFmv({titulo:'',texto:''}); setError('') }}>＋ Nuevo mensaje</button>
          </div>
          {showFormMsgV && (
            <div style={{ background:'var(--surface2)',borderRadius:'12px',padding:'16px',marginBottom:'14px',border:'1px solid var(--border)' }}>
              <div style={{ fontSize:'13px',fontWeight:'600',marginBottom:'12px',color:'var(--text2)' }}>{editandoMsgV?'Editar mensaje':'Nuevo mensaje para '+modalMensajeVendedor.nombre}</div>
              <Field label="Título" required><input className="input" value={fmv.titulo} onChange={e => setFmv({...fmv,titulo:e.target.value})} placeholder="Ej: Seguimiento día 3" autoFocus /></Field>
              <Field label="Texto" required hint="Usa {nombre} para el nombre del cliente"><textarea className="input" value={fmv.texto} onChange={e => setFmv({...fmv,texto:e.target.value})} rows={4} style={{ resize:'vertical' }} /></Field>
              <ErrorMsg>{error}</ErrorMsg>
              <div style={{ display:'flex',gap:'8px',justifyContent:'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowFormMsgV(false); setEditandoMsgV(null); setError('') }}>Cancelar</button>
                <button className="btn btn-primary btn-sm" onClick={guardarMensajeVendedor} disabled={cargando}>{cargando?'Guardando...':'Guardar'}</button>
              </div>
            </div>
          )}
          <div style={{ display:'flex',flexDirection:'column',gap:'8px',maxHeight:'42vh',overflowY:'auto' }}>
            {mensajes.filter(m => m.vendedorId===modalMensajeVendedor.id||m.vendedorId==='todos').map(m => (
              <div key={m.id} style={{ background:'var(--surface2)',borderRadius:'10px',padding:'12px 14px',border:'1px solid var(--border)' }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:'6px' }}>
                    <span style={{ fontWeight:'700',fontSize:'13px',color:'var(--text)' }}>{m.titulo}</span>
                    {m.vendedorId==='todos' && <span style={{ fontSize:'10px',background:'rgba(74,222,128,0.1)',color:'var(--accent)',padding:'1px 7px',borderRadius:'10px',fontWeight:'600' }}>General</span>}
                  </div>
                  {m.vendedorId===modalMensajeVendedor.id && (
                    <div style={{ display:'flex',gap:'5px' }}>
                      <button className="btn btn-secondary btn-sm" style={{ fontSize:'11px',padding:'3px 8px' }} onClick={() => { setEditandoMsgV(m); setFmv({titulo:m.titulo,texto:m.texto}); setShowFormMsgV(true); setError('') }}>✏️</button>
                      <button className="btn btn-danger btn-sm" style={{ fontSize:'11px',padding:'3px 8px' }} onClick={() => eliminarMensaje(m.id)}>✕</button>
                    </div>
                  )}
                </div>
                <p style={{ fontSize:'12px',color:'var(--text2)',lineHeight:'1.55',margin:0 }}>{m.texto}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {modalPago && (() => {
        const {pagos} = calcularComisiones(modalPago.comision||5000, modalPago.mensualidad||2000, modalPago.pagosRegistrados||[])
        const pagosVendedor = pagos.filter(p => p.montoVendedor>0)
        const montoDefault = fpago.tipo==='enganche' ? (modalPago.enganche||0) : (modalPago.mensualidad||2000)
        return (
          <Modal titulo={'Registrar pago — '+modalPago.nombre} onClose={() => setModalPago(null)}>
            {/* Info resumen */}
            <div style={{ background:'var(--surface2)',borderRadius:'10px',padding:'10px 14px',marginBottom:'14px',fontSize:'13px',color:'var(--text2)',display:'flex',gap:'16px',flexWrap:'wrap' }}>
              <span>Mensualidad: <strong>{formatDinero(modalPago.mensualidad||2000)}</strong></span>
              {(modalPago.enganche||0)>0 && <span>Enganche: <strong>{formatDinero(modalPago.enganche)}</strong></span>}
              <span>Comisión: <strong>{formatDinero(modalPago.comision||5000)}</strong></span>
            </div>

            {/* Tipo de pago */}
            <Field label="Tipo de pago">
              <div style={{ display:'flex',gap:'8px',marginBottom:'4px' }}>
                <button onClick={() => setFpago({...fpago,tipo:'mensualidad',numero:1,montoLibre:''})}
                  style={{ flex:1,padding:'9px',border:'2px solid '+(fpago.tipo==='mensualidad'?'var(--accent)':'var(--border)'),borderRadius:'8px',background:fpago.tipo==='mensualidad'?'rgba(74,222,128,0.1)':'transparent',color:fpago.tipo==='mensualidad'?'var(--accent)':'var(--text3)',fontSize:'13px',fontWeight:'600',cursor:'pointer' }}>
                  💵 Mensualidad
                </button>
                <button onClick={() => setFpago({...fpago,tipo:'enganche',numero:0,montoLibre:String(modalPago.enganche||'')})}
                  style={{ flex:1,padding:'9px',border:'2px solid '+(fpago.tipo==='enganche'?'var(--accent)':'var(--border)'),borderRadius:'8px',background:fpago.tipo==='enganche'?'rgba(74,222,128,0.1)':'transparent',color:fpago.tipo==='enganche'?'var(--accent)':'var(--text3)',fontSize:'13px',fontWeight:'600',cursor:'pointer' }}>
                  🤝 Enganche
                </button>
              </div>
            </Field>

            {/* Número de mensualidad si aplica */}
            {fpago.tipo==='mensualidad' && (
              <Field label="Número de mensualidad">
                <select className="input" value={fpago.numero} onChange={e => setFpago({...fpago,numero:Number(e.target.value),montoLibre:''})}>
                  {pagosVendedor.filter(p=>p.tipo==='mensualidad').map(p => (
                    <option key={p.numero} value={p.numero}>
                      Mensualidad {p.numero} — {formatDinero(p.montoVendedor)} {p.pagadoVendedor?'✓ Pagada':'(pendiente)'}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {/* Monto libre */}
            <Field label="Monto a pagar ($)" hint={'Default: '+formatDinero(montoDefault)+' — cambia si el cliente pagó diferente'}>
              <input className="input" type="number" inputMode="numeric"
                value={fpago.montoLibre}
                onChange={e => setFpago({...fpago,montoLibre:e.target.value})}
                placeholder={String(montoDefault)} />
            </Field>

            <Field label="Estado del pago">
              <select className="input" value={fpago.pagadoVendedor} onChange={e => setFpago({...fpago,pagadoVendedor:e.target.value==='true'})}>
                <option value="false">⏳ Pendiente — aún no se le paga al vendedor</option>
                <option value="true">✅ Pagado — ya se le entregó al vendedor</option>
              </select>
            </Field>
            <Field label="Fecha"><input className="input" type="date" value={fpago.fechaPago} onChange={e => setFpago({...fpago,fechaPago:e.target.value})} /></Field>
            <ModalActions onCancel={() => setModalPago(null)} onSave={registrarPago} loading={cargando} saveLabel="Guardar pago" />
          </Modal>
        )
      })()}

      {modalMensaje && (
        <Modal titulo={editando?'Editar mensaje':'Nuevo mensaje'} onClose={() => { setModalMensaje(false); setEditando(null) }}>
          <Field label="Título" required><input className="input" value={fm.titulo} onChange={e => setFm({...fm,titulo:e.target.value})} placeholder="Ej: Seguimiento día 3" autoFocus /></Field>
          <Field label="Texto" required hint="Usa {nombre} para el nombre del cliente"><textarea className="input" value={fm.texto} onChange={e => setFm({...fm,texto:e.target.value})} rows={5} style={{ resize:'vertical' }} /></Field>
          <Field label="Asignar a" hint="¿Este mensaje es para todos o solo un vendedor?">
            <select className="input" value={fm.vendedorId} onChange={e => setFm({...fm,vendedorId:e.target.value})}>
              <option value="todos">Todos los vendedores</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>Solo {v.nombre}</option>)}
            </select>
          </Field>
          <ErrorMsg>{error}</ErrorMsg>
          <ModalActions onCancel={() => { setModalMensaje(false); setEditando(null) }} onSave={guardarMensaje} loading={cargando} />
        </Modal>
      )}
    </div>
  )
}