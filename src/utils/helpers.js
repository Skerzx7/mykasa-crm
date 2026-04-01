export const ESTADOS = [
  { value: 'nuevo',       label: 'Nuevo',         color: '#1d4ed8', bg: '#dbeafe', icon: '🆕' },
  { value: 'apartado',    label: 'Apartado',       color: '#ea580c', bg: '#ffedd5', icon: '🔒' },
  { value: 'seguimiento', label: 'Seguimiento',    color: '#ca8a04', bg: '#fef9c3', icon: '📞' },
  { value: 'visita',      label: 'Visitó lote',    color: '#7c3aed', bg: '#ede9fe', icon: '📍' },
  { value: 'contrato',    label: 'Firmó contrato', color: '#15803d', bg: '#dcfce7', icon: '✍️' },
  { value: 'cerrado',     label: 'Cerrado',        color: '#475569', bg: '#f1f5f9', icon: '✅' },
]

export const getEstado = val => ESTADOS.find(e => e.value === val) || ESTADOS[0]

// ── WhatsApp ──────────────────────────────────────────────────────────────────
export const abrirWhatsApp = (tel, msg = '') => {
  if (!tel) return
  const t = String(tel).replace(/\D/g, '')
  if (!t) return
  const num = t.startsWith('52') ? t : `52${t}`
  window.open(`https://wa.me/${num}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`, '_blank')
}

// ── Fechas ────────────────────────────────────────────────────────────────────
const toDate = ts => {
  if (!ts) return null
  // Firestore Timestamp
  if (ts && typeof ts.toDate === 'function') return ts.toDate()
  // Firestore Timestamp serializado {seconds, nanoseconds}
  if (ts && typeof ts.seconds === 'number') return new Date(ts.seconds * 1000)
  // String ISO o number
  const d = new Date(ts)
  return isNaN(d.getTime()) ? null : d
}

export const formatFecha = ts => {
  const d = toDate(ts)
  if (!d) return '—'
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatFechaCorta = ts => {
  const d = toDate(ts)
  if (!d) return '—'
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

export const timeAgo = ts => {
  const d = toDate(ts)
  if (!d) return '—'
  const diff = Date.now() - d.getTime()
  if (diff < 0) return 'ahora'
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `hace ${days}d`
  return formatFechaCorta(ts)
}

// ── Dinero ────────────────────────────────────────────────────────────────────
export const formatDinero = n => {
  const num = Number(n)
  if (n === null || n === undefined || n === '' || isNaN(num)) return '—'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 0,
  }).format(num)
}

// ── Comisiones ────────────────────────────────────────────────────────────────
// FIX: guard contra mensualidad=0 que causaba loop infinito
// FIX: máximo de iteraciones endurecido a 60 mensualidades (5 años)
export const calcularComisiones = (comisionTotal = 0, mensualidad = 0, pagosRegistrados = []) => {
  const FALLBACK_MENSUALIDAD = 2000
  const safeMensualidad = Number(mensualidad) > 0 ? Number(mensualidad) : FALLBACK_MENSUALIDAD
  const safeComision    = Number(comisionTotal) >= 0 ? Number(comisionTotal) : 0

  const pagos = []
  let comisionRestante = safeComision

  // Enganche primero
  const enganche = pagosRegistrados.find(p => p.tipo === 'enganche')
  if (enganche) {
    const montoVendedor = Math.min(Number(enganche.monto) || 0, comisionRestante)
    comisionRestante -= montoVendedor
    pagos.push({
      numero:         0,
      tipo:           'enganche',
      montoTotal:     Number(enganche.monto) || 0,
      montoVendedor,
      montoOficina:   (Number(enganche.monto) || 0) - montoVendedor,
      pagadoVendedor: enganche.pagadoVendedor || false,
      fecha:          enganche.fechaPago || null,
    })
  }

  // Mensualidades — máx 60 iteraciones para prevenir loop infinito
  let numMensualidad = 1
  let turnoVendedor  = true
  while (comisionRestante > 0.01 && numMensualidad <= 60) {
    const pagoExistente = pagosRegistrados.find(
      p => p.tipo === 'mensualidad' && p.numero === numMensualidad
    )
    let montoVendedor = 0
    let montoOficina  = 0

    if (turnoVendedor) {
      montoVendedor    = Math.min(comisionRestante, safeMensualidad)
      montoOficina     = safeMensualidad - montoVendedor
      comisionRestante -= montoVendedor
    } else {
      montoOficina = safeMensualidad
    }

    pagos.push({
      numero:         numMensualidad,
      tipo:           'mensualidad',
      montoTotal:     safeMensualidad,
      montoVendedor,
      montoOficina,
      pagadoVendedor: pagoExistente?.pagadoVendedor || false,
      fecha:          pagoExistente?.fechaPago || null,
    })

    turnoVendedor = !turnoVendedor
    numMensualidad++
  }

  const comisionCubierta   = pagos.filter(p => p.pagadoVendedor).reduce((s, p) => s + p.montoVendedor, 0)
  const comisionPendiente  = Math.max(0, safeComision - comisionCubierta)

  return { pagos, comisionTotal: safeComision, comisionCubierta, comisionPendiente }
}

// ── Apartado ──────────────────────────────────────────────────────────────────
// FIX: guard contra monto=0 o fecha inválida
// FIX: días mínimo 1 si monto > 0
export const calcularVigenciaApartado = (monto, fechaApartado) => {
  const m = Number(monto)
  if (!m || m <= 0 || !fechaApartado) return null

  const inicio = toDate(fechaApartado)
  if (!inicio) return null

  const dias      = Math.max(1, Math.floor((m / 500) * 8))
  const vence     = new Date(inicio.getTime() + dias * 86_400_000)
  const restantes = Math.ceil((vence.getTime() - Date.now()) / 86_400_000)

  return { dias, vence, restantes, vencido: restantes < 0 }
}

// ── Utilidades de batch seguro ────────────────────────────────────────────────
// Firestore batch tiene límite de 500 ops. Esta función divide en chunks.
export const chunkArray = (arr, size = 400) => {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}