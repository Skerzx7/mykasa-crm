/**
 * Calcula el plan de pagos de comisión para un vendedor
 * 
 * Reglas:
 * - Mensualidad 1 → vendedor
 * - Mensualidad 2 → oficina
 * - Mensualidad 3 → vendedor
 * - Mensualidad 4 → oficina
 * - Mensualidad 5 → mitad vendedor, mitad oficina (si queda saldo)
 * - Si enganche >= comisión total → vendedor cobra todo de golpe
 * - Si enganche < comisión → cubre lo que pueda, el resto en mensualidades
 */
export function calcularPlanComision(comisionTotal, mensualidadCliente, enganche = 0) {
  const pagos = []
  let restante = comisionTotal
  let mes = 0

  // Si el enganche cubre todo
  if (enganche >= comisionTotal) {
    return {
      pagos: [{ mes: 0, tipo: 'enganche', vendedor: comisionTotal, oficina: 0, descripcion: 'Enganche — comisión completa al vendedor' }],
      totalVendedor: comisionTotal,
      totalOficina: 0,
      mesesTotal: 0,
      cubiertoPorEnganche: true
    }
  }

  // El enganche cubre parcialmente
  if (enganche > 0) {
    pagos.push({ mes: 0, tipo: 'enganche', vendedor: enganche, oficina: 0, descripcion: `Enganche parcial al vendedor` })
    restante -= enganche
  }

  // Mensualidades alternas
  let turno = 'vendedor' // empieza en vendedor
  while (restante > 0) {
    mes++
    const pago = Math.min(mensualidadCliente, restante)

    if (turno === 'vendedor') {
      if (restante < mensualidadCliente) {
        // Última mensualidad — puede ser mitad y mitad
        const mitad = Math.floor(restante / 2)
        const resto = restante - mitad
        pagos.push({ mes, tipo: 'mensualidad', vendedor: mitad, oficina: resto, descripcion: `Mensualidad ${mes} — compartida` })
        restante = 0
      } else {
        pagos.push({ mes, tipo: 'mensualidad', vendedor: pago, oficina: 0, descripcion: `Mensualidad ${mes} — al vendedor` })
        restante -= pago
        turno = 'oficina'
      }
    } else {
      pagos.push({ mes, tipo: 'mensualidad', vendedor: 0, oficina: pago, descripcion: `Mensualidad ${mes} — a oficina` })
      restante -= pago
      turno = 'vendedor'
    }
  }

  const totalVendedor = pagos.reduce((s, p) => s + p.vendedor, 0)
  const totalOficina = pagos.reduce((s, p) => s + p.oficina, 0)

  return { pagos, totalVendedor, totalOficina, mesesTotal: mes, cubiertoPorEnganche: false }
}

export function formatMXN(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n || 0)
}
