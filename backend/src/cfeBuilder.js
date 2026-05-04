import { query } from './db.js';

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const tzOffset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - tzOffset);
  return local.toISOString().slice(0, 19).replace('T', ' ');
}

// IteIndFact según codigo de tipos_iva
// codigo 1 = No Grava / Exento, 2 = Tasa Mínima 10%, 3 = Tasa Básica 22%
function getIteIndFact(ivaCodigo) {
  const c = Number(ivaCodigo);
  if (c === 2) return 2;
  if (c === 3) return 3;
  return 1;
}

function getFmaPago(medioPago) {
  return String(medioPago || '').toLowerCase() === 'credito' ? '2' : '1';
}

function getGlosaMP(medioPago) {
  const m = String(medioPago || '').toLowerCase();
  if (m === 'credito') return 'CRÉDITO';
  if (m === 'debito') return 'DÉBITO';
  if (m === 'transferencia') return 'TRANSFERENCIA';
  return 'EFECTIVO';
}

function getCodMP(medioPago) {
  const m = String(medioPago || '').toLowerCase();
  if (m === 'credito') return '2';
  if (m === 'debito') return '3';
  if (m === 'transferencia') return '4';
  return '1';
}

// RUT=2, CI=3, PASAPORTE=5, DNI=6, OTRO=4
function getRcpTipoDoc(tipoDoc) {
  const t = String(tipoDoc || '').toUpperCase();
  if (t === 'RUT') return 2;
  if (t === 'CI') return 3;
  if (t === 'PASAPORTE') return 5;
  if (t === 'DNI') return 6;
  if (t) return 4;
  return null;
}

// Cliente con RUT → eFactura (111), resto → eTicket (101)
function getCFETipo(cliente) {
  if (
    cliente &&
    String(cliente.tipo_documento || '').toUpperCase() === 'RUT' &&
    cliente.numero_documento
  ) {
    return '111';
  }
  return '101';
}

function getUniMed(unidad) {
  const u = String(unidad || '').toUpperCase().slice(0, 4).trim();
  return u || 'UNID';
}

function getCodiTpoCod(ean) {
  if (!ean) return 'INT1';
  const len = String(ean).replace(/\D/g, '').length;
  if (len === 13) return 'GTIN13';
  if (len === 12) return 'GTIN12';
  if (len === 8) return 'GTIN8';
  return 'INT1';
}

export async function buildCFE(ventaId) {
  const ventaQ = await query(
    `SELECT v.*,
            c.nombre AS cliente_nombre, c.tipo_documento, c.numero_documento,
            c.direccion AS cliente_direccion, c.correo AS cliente_correo,
            c.codigo_postal AS cliente_cp,
            COALESCE(b.nombre, c.ciudad) AS cliente_ciudad,
            COALESCE(dep.nombre, depc.nombre) AS cliente_departamento
     FROM public.ventas v
     LEFT JOIN public.clientes c ON c.id = v.cliente_id
     LEFT JOIN public.barrios b ON b.id = c.barrio_id
     LEFT JOIN public.departamentos dep ON dep.id = c.departamento_id
     LEFT JOIN public.departamentos depc ON depc.id = b.departamento_id
     WHERE v.id = $1`,
    [ventaId]
  );
  if (!ventaQ.rowCount) throw new Error(`Venta ${ventaId} no encontrada`);
  const venta = ventaQ.rows[0];

  const detalleQ = await query(
    `SELECT vd.id, vd.cantidad, vd.precio_unitario,
            vd.packs, vd.unidades_sueltas, vd.unidades_por_empaque, vd.tipo_empaque,
            vd.precio_empaque, vd.precio_unidad, vd.modo_venta,
            vd.descuento_tipo, vd.descuento_valor, vd.descuento_aplicado,
            p.id AS producto_id, p.nombre AS producto_nombre, p.ean, p.unidad,
            p.iva_id, ti.codigo AS iva_codigo, ti.porcentaje AS iva_porcentaje
     FROM public.venta_detalle vd
     INNER JOIN public.productos p ON p.id = vd.producto_id
     LEFT JOIN public.tipos_iva ti ON ti.id = p.iva_id
     WHERE vd.venta_id = $1
     ORDER BY vd.id ASC`,
    [ventaId]
  );

  const empresaQ = await query(
    `SELECT nombre, razon_social, rut, direccion, telefono, correo,
            giro, ciudad, departamento
     FROM public.config_empresa LIMIT 1`
  );
  const empresa = empresaQ.rows[0] || {};

  const cliente = {
    nombre: venta.cliente_nombre,
    tipo_documento: venta.tipo_documento,
    numero_documento: venta.numero_documento,
    direccion: venta.cliente_direccion,
    correo: venta.cliente_correo,
    ciudad: venta.cliente_ciudad,
    departamento: venta.cliente_departamento,
  };

  const tipoCFE = getCFETipo(cliente);
  const esFactura = tipoCFE === '111';

  let totNoGrav = 0;
  let totNetoMin = 0;
  let totNetoBasica = 0;
  let totIvaMin = 0;
  let totIvaBasica = 0;

  const detalle = [];

  for (const row of detalleQ.rows) {
    const packs = Number(row.packs ?? 0);
    const sueltas = Number(row.unidades_sueltas ?? 0);
    const precioEmpaque = round2(row.precio_empaque || 0);
    const precioUnidad = round2(row.precio_unidad || row.precio_unitario);
    const descuentoAplicado = round2(row.descuento_aplicado || 0);
    const indFact = getIteIndFact(row.iva_codigo);
    const porcentaje = Number(row.iva_porcentaje || 0) / 100;
    const codeTipo = getCodiTpoCod(row.ean);
    const codValue = codeTipo === 'INT1' ? String(row.producto_id) : String(row.ean);
    const nombreItem = String(row.producto_nombre || '').slice(0, 80);

    const hasPacks = packs > 0 && precioEmpaque > 0;
    const hasSueltas = sueltas > 0;
    const hasOldData = !hasPacks && !hasSueltas; // datos anteriores a la migración

    // Calcular montos brutos para distribuir descuento proporcionalmente
    const montoPacksBruto = hasPacks ? round2(packs * precioEmpaque) : 0;
    const montoSueltasBruto = hasSueltas ? round2(sueltas * precioUnidad) : 0;
    const montoTotalBruto = hasPacks || hasSueltas
      ? round2(montoPacksBruto + montoSueltasBruto)
      : round2(Number(row.cantidad || 1) * round2(row.precio_unitario));

    // Distribuir descuento proporcionalmente entre packs y sueltas
    const descPacks = (hasPacks && montoTotalBruto > 0)
      ? round2(descuentoAplicado * montoPacksBruto / montoTotalBruto)
      : (hasPacks ? descuentoAplicado : 0);
    const descSueltas = hasSueltas ? round2(descuentoAplicado - descPacks) : 0;

    const pushLine = (cantidad, precio, monto, descuento, uniMed) => {
      const montoNeto = round2(monto - descuento);
      if (indFact === 2 && porcentaje > 0) {
        const neto = round2(montoNeto / (1 + porcentaje));
        totNetoMin += neto;
        totIvaMin += round2(montoNeto - neto);
      } else if (indFact === 3 && porcentaje > 0) {
        const neto = round2(montoNeto / (1 + porcentaje));
        totNetoBasica += neto;
        totIvaBasica += round2(montoNeto - neto);
      } else {
        totNoGrav += montoNeto;
      }
      const descPct = monto > 0 ? round2((descuento / monto) * 100) : 0;
      detalle.push({
        IteCodiTpoCod: codeTipo,
        IteCodiCod: codValue,
        IteIndFact: String(indFact),
        IteNomItem: nombreItem,
        IteDscItem: '',
        IteCantidad: cantidad.toFixed(3),
        IteUniMed: uniMed,
        ItePrecioUnitario: precio.toFixed(4),
        IteDescuentoPct: descPct.toFixed(2),
        IteDescuentoMonto: descuento.toFixed(2),
        IteMontoItem: monto.toFixed(2),
      });
    };

    if (hasOldData) {
      // Datos anteriores a la migración: comportamiento original
      const cantidad = Number(row.cantidad || 1);
      const precioU = round2(row.precio_unitario);
      const monto = round2(cantidad * precioU);
      pushLine(cantidad, precioU, monto, descuentoAplicado, getUniMed(row.unidad));
    } else {
      // Línea de empaques
      if (hasPacks) {
        pushLine(packs, precioEmpaque, montoPacksBruto, descPacks, getUniMed(row.tipo_empaque));
      }
      // Línea de unidades sueltas
      if (hasSueltas) {
        pushLine(sueltas, precioUnidad, montoSueltasBruto, descSueltas, getUniMed(row.unidad));
      }
    }
  }

  totNoGrav = round2(totNoGrav);
  totNetoMin = round2(totNetoMin);
  totNetoBasica = round2(totNetoBasica);
  totIvaMin = round2(totIvaMin);
  totIvaBasica = round2(totIvaBasica);
  const totTotal = round2(totNoGrav + totNetoMin + totNetoBasica + totIvaMin + totIvaBasica);

  const pagosQ = await query(
    `SELECT medio_pago FROM public.pagos WHERE venta_id = $1 ORDER BY id ASC LIMIT 1`,
    [ventaId]
  );
  const medioPago = pagosQ.rowCount
    ? pagosQ.rows[0].medio_pago
    : venta.medio_pago || 'efectivo';

  const rcpTipoDoc = getRcpTipoDoc(cliente.tipo_documento);
  const receptor =
    esFactura || rcpTipoDoc
      ? {
          RcpTipoDocRecep: rcpTipoDoc ? String(rcpTipoDoc) : '',
          RcpTipoDocDscRecep: '',
          RcpCodPaisRecep: rcpTipoDoc === 2 || rcpTipoDoc === 3 ? 'UY' : '',
          RcpDocRecep: String(cliente.numero_documento || '').slice(0, 20),
          RcpRznSocRecep: String(cliente.nombre || '').slice(0, 150),
          RcpDirRecep: String(cliente.direccion || '').slice(0, 70),
          RcpCiudadRecep: String(cliente.ciudad || '').slice(0, 30),
          RcpDeptoRecep: String(cliente.departamento || '').slice(0, 30),
          RcpCP: '',
          RcpCorreoRecep: String(cliente.correo || '').slice(0, 100),
          RcpInfAdiRecep: '',
          RcpDirPaisRecep: '',
          RcpDstEntregaRecep: '',
        }
      : null;

  return {
    ambiente: 'PRUEBAS',
    Master: {
      CFETipoCFE: tipoCFE,
      CFESerie: '',
      CFENro: '',
      CFEFchEmis: formatDateTime(venta.fecha),
      CFEMntBruto: '1',
      CFEFmaPago: getFmaPago(medioPago),
      CFEFchVenc: formatDate(venta.fecha_entrega) || formatDate(venta.fecha),
      CFETipoTraslado: '1',
      CFEAdenda: venta.observacion || '',
      CFENumReferencia: String(venta.id),
      CFEImpFormato: '2',
      CFEIdCompra: '',
      CFEIdCompraApodo: '',
      CFETpoOperacion: '1',
      CFEQrCode: '3',
      CFERepImpresa: '2',
      CFEInfAdicional: '',
    },
    Emisor: {
      EmiRznSoc: String(empresa.razon_social || empresa.nombre || '').slice(0, 150),
      EmiComercial: String(empresa.nombre || '').slice(0, 30),
      EmiGiroEmis: String(empresa.giro || '').slice(0, 60),
      EmiTelefono: String(empresa.telefono || '').slice(0, 20),
      EmiTelefono2: '',
      EmiCorreoEmisor: String(empresa.correo || '').slice(0, 80),
      EmiSucursal: '',
      EmiDomFiscal: String(empresa.direccion || '').slice(0, 60),
      EmiCiudad: String(empresa.ciudad || '').slice(0, 30),
      EmiDepartamento: String(empresa.departamento || '').slice(0, 30),
      EmiInfAdicional: '',
    },
    Receptor: receptor,
    Totales: {
      TotTpoMoneda: 'UYU',
      TotTpoCambio: '',
      TotMntNoGrv: totNoGrav.toFixed(2),
      TotMntExpoyAsim: '0.00',
      TotMntImpuestoPerc: '0.00',
      TotMntIVaenSusp: '0.00',
      TotMntNetoIvaTasaMin: totNetoMin.toFixed(2),
      TotMntNetoIVATasaBasica: totNetoBasica.toFixed(2),
      TotMntNetoIVAOtra: '0.00',
      TotMntIVATasaMin: totIvaMin.toFixed(2),
      TotMntIVATasaBasica: totIvaBasica.toFixed(2),
      TotMntIVAOtra: '0.00',
      TotMntTotal: totTotal.toFixed(2),
      TotMontoNF: '0.00',
      TotMntPagar: totTotal.toFixed(2),
      MedPagCodMP: getCodMP(medioPago),
      MedPagGlosaMP: getGlosaMP(medioPago),
    },
    Detalle: detalle,
    Referencia: [],
  };
}
