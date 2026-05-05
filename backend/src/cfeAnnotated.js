/**
 * cfeAnnotated.js
 * Genera una representación JSONC (JSON with Comments) del CFE
 * para uso como referencia/documentación al cruzar con el PDF de DGI.
 */

const FIELD_COMMENTS = {
  // Raíz
  ambiente: 'Entorno de ejecución: "PRUEBAS" o "PRODUCCION"',

  // Master
  CFETipoCFE:       'Tipo de comprobante: 101=eFactura, 102=eFactura Exportación, 111=eTicket, 112=eTicket Exportación, 181=eRemito, etc.',
  CFESerie:         'Serie del comprobante (opcional, máx 2 chars). Si vacío, se asigna automáticamente',
  CFENro:           'Número del comprobante (opcional, 7 dígitos). Si vacío, se asigna automáticamente',
  CFEFchEmis:       'Fecha de emisión contable (AAAA-MM-DD HH:MM:SS)',
  CFEMntBruto:      'Indicador de montos brutos: 0=sin IVA incluido, 1=con IVA incluido',
  CFEFmaPago:       'Forma de pago: 1=Contado, 2=Crédito',
  CFEFchVenc:       'Fecha de vencimiento del documento (AAAA-MM-DD)',
  CFETipoTraslado:  'Tipo de traslado: 1=Venta, 2=Traslados internos. Obligatorio para eRemitos',
  CFEAdenda:        'Adenda libre del CFE (sin límite). Para saltos de línea usar "|"',
  CFENumReferencia: 'Número identificador interno del ERP (ID de venta en Ferco)',
  CFEImpFormato:    'Formato del PDF: 1=Rollo 80mm, 2=Hoja A4 español, 4=A4 español/inglés, 5=Rollo 110mm, 6=A5, 7=Rollo 70mm',
  CFEIdCompra:      'Número de orden/pedido del comprador (opcional, máx 50 chars)',
  CFEIdCompraApodo: 'Nombre visible del campo CFEIdCompra. Por defecto imprime "Número Interno"',
  CFETpoOperacion:  'Tipo de operación: 1=Venta de productos, 2=Prestación de servicio',
  CFEQrCode:        'QR en representación impresa: 1=Según licencia, 2=Retornar, 3=No retornar',
  CFERepImpresa:    'Incluir PDF en respuesta: 1=No retorna, 2=Retorna',
  CFEInfAdicional:  'Información adicional del comprobante (máx 150 chars). Obligatorio para leyendas normativas',

  // Emisor
  EmiRznSoc:        'Razón social del emisor (obligatorio, máx 150 chars) — tabla config_empresa.razon_social',
  EmiComercial:     'Nombre comercial o fantasía del emisor (máx 30 chars) — config_empresa.nombre',
  EmiGiroEmis:      'Giro del negocio del emisor (máx 60 chars) — config_empresa.giro',
  EmiTelefono:      'Teléfono 1 del emisor (máx 20 chars) — config_empresa.telefono',
  EmiTelefono2:     'Teléfono 2 del emisor (máx 20 chars)',
  EmiCorreoEmisor:  'Correo de contacto del emisor (máx 80 chars) — config_empresa.correo',
  EmiSucursal:      'Nombre de la casa principal o sucursal (máx 20 chars, no figura en documento)',
  EmiDomFiscal:     'Domicilio fiscal declarado en DGI (obligatorio, máx 60 chars) — config_empresa.direccion',
  EmiCiudad:        'Ciudad del emisor declarada en DGI (obligatorio, máx 30 chars) — barrios.nombre o config_empresa.ciudad',
  EmiDepartamento:  'Departamento del emisor declarado en DGI (obligatorio, máx 30 chars) — departamentos.nombre o config_empresa.departamento',
  EmiInfAdicional:  'Información adicional del emisor (máx 150 chars)',

  // Receptor
  RcpTipoDocRecep:    'Tipo de documento: 1=NIE, 2=RUT, 3=CI, 4=Otros, 5=Pasaporte, 6=DNI, 7=NIFE',
  RcpTipoDocDscRecep: 'Descripción del tipo si RcpTipoDocRecep=4 (Otros)',
  RcpCodPaisRecep:    'Código ISO 3166-1 alfa-2 del país. "UY" para RUT/CI. "99" si el país no existe en la tabla',
  RcpDocRecep:        'Número de documento del receptor (máx 20 chars) — clientes.numero_documento',
  RcpRznSocRecep:     'Nombre o razón social del receptor (máx 150 chars) — clientes.nombre',
  RcpDirRecep:        'Dirección del receptor (máx 70 chars) — clientes.direccion',
  RcpCiudadRecep:     'Ciudad del receptor (máx 30 chars) — barrios.nombre o clientes.ciudad',
  RcpDeptoRecep:      'Departamento del receptor (máx 30 chars) — departamentos.nombre',
  RcpCP:              'Código postal del receptor (5 dígitos)',
  RcpCorreoRecep:     'Correo electrónico del receptor (máx 100 chars) — clientes.correo',
  RcpInfAdiRecep:     'Información adicional del receptor (máx 150 chars)',
  RcpDirPaisRecep:    'País de la dirección del receptor (máx 30 chars). Obligatorio en exportaciones',
  RcpDstEntregaRecep: 'Lugar de destino de la mercadería (máx 100 chars)',

  // Totales
  TotTpoMoneda:             'Moneda ISO 4217: "UYU"=Peso uruguayo, "USD"=Dólar, etc.',
  TotTpoCambio:             'Tipo de cambio (hasta 3 decimales). Obligatorio si moneda ≠ UYU',
  TotMntNoGrv:              'Suma de ítems NO gravados (IteIndFact=1)',
  TotMntExpoyAsim:          'Suma de ítems de exportación (IteIndFact=10)',
  TotMntImpuestoPerc:       'Suma de ítems con impuesto percibido (IteIndFact=11)',
  TotMntIVaenSusp:          'Suma de ítems con IVA en suspenso (IteIndFact=12)',
  TotMntNetoIvaTasaMin:     'Monto neto de ítems gravados IVA tasa mínima 10% (IteIndFact=2)',
  TotMntNetoIVATasaBasica:  'Monto neto de ítems gravados IVA tasa básica 22% (IteIndFact=3)',
  TotMntNetoIVAOtra:        'Monto neto de ítems con otra tasa de IVA (IteIndFact=4)',
  TotMntIVATasaMin:         'IVA calculado: TotMntNetoIvaTasaMin × 0.10',
  TotMntIVATasaBasica:      'IVA calculado: TotMntNetoIVATasaBasica × 0.22',
  TotMntIVAOtra:            'IVA calculado a otra tasa',
  TotMntTotal:              'Total = suma de todos los montos anteriores (excluye no facturables)',
  TotMontoNF:               'Monto no facturable (IteIndFact=6 o 7). Incluye redondeos',
  TotMntPagar:              'Total a pagar = TotMntTotal + TotMontoNF',
  MedPagCodMP:              'Código interno del medio de pago: 1=Efectivo, 2=Débito, 3=Crédito, 4=Transferencia',
  MedPagGlosaMP:            'Nombre del medio de pago que figura en el documento',

  // Detalle (ítem)
  IteCodiTpoCod:      'Tipo de código del ítem: INT1=Código interno, GTIN8/12/13/14=EAN, PLU=Código PLU',
  IteCodiCod:         'Código del ítem según el tipo (máx 35 chars) — productos.id o productos.ean',
  IteIndFact:         'Indicador de facturación: 1=Exento IVA, 2=IVA 10%, 3=IVA 22%, 4=Otra tasa, 5=Gratuito, 6=No facturable, 10=Exportación',
  IteNomItem:         'Nombre del producto/servicio en el documento (máx 80 chars) — productos.nombre',
  IteDscItem:         'Descripción adicional del ítem (máx 1000 chars)',
  IteCantidad:        'Cantidad del ítem (hasta 3 decimales)',
  IteUniMed:          'Unidad de medida 4 chars: UNID, CAJA, PACK, KILO, LITR, etc.',
  ItePrecioUnitario:  'Precio unitario (hasta 6 decimales)',
  IteDescuentoPct:    'Descuento en porcentaje (hasta 3 decimales)',
  IteDescuentoMonto:  'Monto del descuento aplicado (ítem + descuento global distribuido proporcionalmente). Debe existir si existe IteDescuentoPct',
  IteMontoItem:       'Monto bruto del ítem = Cantidad × PrecioUnitario (sin descontar)',
};

/**
 * Genera el string JSONC con comentarios a partir de un objeto CFE ya construido.
 * @param {object} cfe - objeto CFE generado por buildCFE()
 * @returns {string} JSONC con comentarios // antes de cada campo conocido
 */
export function buildCFEAnnotated(cfe) {
  const lines = [];

  function comment(key) {
    const txt = FIELD_COMMENTS[key];
    return txt ? `  // ${key}: ${txt}` : null;
  }

  function fieldLine(key, value, indent = '  ', isLast = false) {
    const c = FIELD_COMMENTS[key];
    const val = JSON.stringify(value);
    const comma = isLast ? '' : ',';
    if (c) {
      return [`${indent}// ${c}`, `${indent}${JSON.stringify(key)}: ${val}${comma}`];
    }
    return [`${indent}${JSON.stringify(key)}: ${val}${comma}`];
  }

  function objectBlock(obj, indent = '  ', topLevel = false) {
    const keys = Object.keys(obj);
    keys.forEach((key, i) => {
      const isLast = i === keys.length - 1;
      const value = obj[key];
      const c = FIELD_COMMENTS[key];
      const comma = isLast ? '' : ',';

      if (Array.isArray(value)) {
        if (c) lines.push(`${indent}// ${c}`);
        lines.push(`${indent}${JSON.stringify(key)}: [`);
        value.forEach((item, j) => {
          const isLastItem = j === value.length - 1;
          lines.push(`${indent}  {`);
          const itemKeys = Object.keys(item);
          itemKeys.forEach((ik, ii) => {
            const isLastIk = ii === itemKeys.length - 1;
            const ic = FIELD_COMMENTS[ik];
            const iv = JSON.stringify(item[ik]);
            const icomma = isLastIk ? '' : ',';
            if (ic) lines.push(`${indent}    // ${ic}`);
            lines.push(`${indent}    ${JSON.stringify(ik)}: ${iv}${icomma}`);
          });
          lines.push(`${indent}  }${isLastItem ? '' : ','}`);
        });
        lines.push(`${indent}]${comma}`);
      } else if (value !== null && typeof value === 'object') {
        if (c) lines.push(`${indent}// ${c}`);
        lines.push(`${indent}${JSON.stringify(key)}: {`);
        objectBlock(value, indent + '  ');
        lines.push(`${indent}}${comma}`);
      } else {
        const c2 = FIELD_COMMENTS[key];
        if (c2) lines.push(`${indent}// ${c2}`);
        lines.push(`${indent}${JSON.stringify(key)}: ${JSON.stringify(value)}${comma}`);
      }
    });
  }

  lines.push('{');
  const topKeys = Object.keys(cfe);
  topKeys.forEach((key, i) => {
    const isLast = i === topKeys.length - 1;
    const value = cfe[key];
    const c = FIELD_COMMENTS[key];
    const comma = isLast ? '' : ',';

    if (typeof value === 'string' || value === null) {
      if (c) lines.push(`  // ${c}`);
      lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value)}${comma}`);
    } else if (Array.isArray(value)) {
      if (c) lines.push(`  // ${c}`);
      lines.push(`  ${JSON.stringify(key)}: [`);
      value.forEach((item, j) => {
        const isLastItem = j === value.length - 1;
        lines.push(`    {`);
        const itemKeys = Object.keys(item);
        itemKeys.forEach((ik, ii) => {
          const isLastIk = ii === itemKeys.length - 1;
          const ic = FIELD_COMMENTS[ik];
          const iv = JSON.stringify(item[ik]);
          const icomma = isLastIk ? '' : ',';
          if (ic) lines.push(`      // ${ic}`);
          lines.push(`      ${JSON.stringify(ik)}: ${iv}${icomma}`);
        });
        lines.push(`    }${isLastItem ? '' : ','}`);
      });
      lines.push(`  ]${comma}`);
    } else if (typeof value === 'object') {
      if (c) lines.push(`  // ${c}`);
      lines.push(`  ${JSON.stringify(key)}: {`);
      const subKeys = Object.keys(value);
      subKeys.forEach((sk, si) => {
        const isLastSk = si === subKeys.length - 1;
        const sv = value[sk];
        const sc = FIELD_COMMENTS[sk];
        const scomma = isLastSk ? '' : ',';
        if (sc) lines.push(`    // ${sc}`);
        lines.push(`    ${JSON.stringify(sk)}: ${JSON.stringify(sv)}${scomma}`);
      });
      lines.push(`  }${comma}`);
    }
  });
  lines.push('}');

  return lines.join('\n');
}
