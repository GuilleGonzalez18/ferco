import { pool } from '../db.js';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick(list) {
  return list[randomInt(0, list.length - 1)];
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toMoney(value) {
  return Number(value.toFixed(2));
}

function randomDateInLastDays(daysBack = 120) {
  const now = new Date();
  const days = randomInt(0, daysBack);
  const hours = randomInt(8, 20);
  const minutes = randomInt(0, 59);
  const d = new Date(now);
  d.setDate(now.getDate() - days);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function yyyymmdd(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function sampleUnique(list, count) {
  const copy = [...list];
  const out = [];
  const size = Math.min(count, copy.length);
  for (let i = 0; i < size; i += 1) {
    const idx = randomInt(0, copy.length - 1);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

async function columnExists(table, column) {
  const result = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [table, column]
  );
  return result.rowCount > 0;
}

async function main() {
  const PRODUCTOS_A_CREAR = Number(process.env.SEED_PRODUCTOS || 45);
  const CLIENTES_A_CREAR = Number(process.env.SEED_CLIENTES || 80);
  const VENTAS_A_CREAR = Number(process.env.SEED_VENTAS || 320);

  const nombres = ['Juan', 'Ana', 'Luis', 'Carla', 'Sofía', 'Diego', 'Martín', 'Lucía', 'Nicolás', 'Valentina'];
  const apellidos = ['Pérez', 'Gómez', 'Fernández', 'Rodríguez', 'López', 'Martínez', 'Silva', 'Díaz', 'Suárez', 'Méndez'];
  const barrios = ['Centro', 'Cordón', 'Pocitos', 'Unión', 'Buceo', 'Malvín', 'Prado', 'Colón', 'Sayago', 'Parque Batlle'];
  const familiasProductos = ['Arroz', 'Yerba', 'Aceite', 'Azúcar', 'Fideos', 'Harina', 'Leche', 'Galletas', 'Atún', 'Detergente'];
  const marcas = ['Ferco', 'Nativa', 'Río', 'Sol', 'Campo', 'Premium', 'Del Sur', 'Andes', 'Monte', 'Doña Ana'];
  const unidades = ['unidad', 'kg', 'lt', 'pack', 'caja'];
  const imagenesProductos = [
    '/images/logo2.png',
    '/images/logo.png',
    '/images/background.jpg',
    '/images/Ferco - Logotipo Final WEB PNG (1).png',
    '/images/Ferco - Logotipo Final Negativo.jpg.jpeg',
  ];
  const mediosPago = ['efectivo', 'debito', 'credito', 'transferencia'];
  const estadosEntrega = ['pendiente', 'en_camino', 'entregado'];

  const canceladaDisponible = await columnExists('ventas', 'cancelada');

  const usuariosResult = await pool.query(`SELECT id FROM public.usuarios ORDER BY id ASC`);
  const usuarios = usuariosResult.rows.map((u) => Number(u.id));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const prefijo = Date.now().toString().slice(-6);
    const productosIds = [];
    for (let i = 0; i < PRODUCTOS_A_CREAR; i += 1) {
      const familia = randomPick(familiasProductos);
      const marca = randomPick(marcas);
      const nombre = `${familia} ${marca} ${randomInt(250, 1500)}g (Test ${prefijo}-${i + 1})`;
      const costo = toMoney(randomInt(20, 380));
      const precio = toMoney(costo * (1 + randomInt(20, 80) / 100));
      const stock = randomInt(40, 260);
      const cantidadEmpaque = randomInt(4, 24);
      const precioEmpaque = toMoney(precio * cantidadEmpaque * (1 - randomInt(3, 12) / 100));
      const ean = `779${prefijo}${String(i + 1).padStart(6, '0')}`;

      const p = await client.query(
        `INSERT INTO public.productos
          (nombre, costo, precio, stock, unidad, imagen, ean, cantidad_empaque, empaque, precio_empaque)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, nombre, precio`,
        [
          nombre,
          costo,
          precio,
          stock,
          randomPick(unidades),
          randomPick(imagenesProductos),
          ean,
          cantidadEmpaque,
          'pack',
          precioEmpaque,
        ]
      );
      productosIds.push({
        id: Number(p.rows[0].id),
        nombre: p.rows[0].nombre,
        precio: Number(p.rows[0].precio || 0),
      });
    }

    const productosExistentes = await client.query(
      `SELECT id, nombre, precio
       FROM public.productos
       ORDER BY id ASC`
    );
    const productos = productosExistentes.rows.map((p) => ({
      id: Number(p.id),
      nombre: p.nombre || `Producto ${p.id}`,
      precio: Number(p.precio || 0),
    }));

    const clientesIds = [];
    for (let i = 0; i < CLIENTES_A_CREAR; i += 1) {
      const nombre = `${randomPick(nombres)} ${randomPick(apellidos)} (Test ${Date.now().toString().slice(-4)}-${i + 1})`;
      const rut = `TEST${Date.now().toString().slice(-6)}${String(i + 1).padStart(4, '0')}`;
      const direccion = `Calle ${randomInt(100, 1999)} ${randomPick(barrios)}`;
      const telefono = `09${randomInt(1000000, 9999999)}`;
      const correo = `test.cliente.${Date.now().toString().slice(-6)}.${i + 1}@demo.local`;

      const c = await client.query(
        `INSERT INTO public.clientes (nombre, rut, direccion, telefono, correo)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [nombre, rut, direccion, telefono, correo]
      );
      clientesIds.push(Number(c.rows[0].id));
    }

    let ventasCreadas = 0;
    let ventasCanceladas = 0;
    let detallesCreados = 0;
    let pagosCreados = 0;

    for (let i = 0; i < VENTAS_A_CREAR; i += 1) {
      const fechaVenta = randomDateInLastDays(140);
      const fechaEntrega = yyyymmdd(addDays(fechaVenta, randomInt(0, 7)));
      const clienteId = randomPick(clientesIds);
      const usuarioId = usuarios.length ? randomPick(usuarios) : null;
      const estadoEntrega = randomPick(estadosEntrega);
      const entregado = estadoEntrega === 'entregado';
      const nItems = randomInt(1, Math.min(4, productos.length));
      const items = sampleUnique(productos, nItems).map((p) => ({
        producto_id: p.id,
        cantidad: randomInt(1, 5),
        precio_unitario: toMoney(Math.max(1, Number(p.precio || randomInt(30, 900)))),
      }));

      const subtotal = toMoney(items.reduce((acc, it) => acc + it.cantidad * it.precio_unitario, 0));
      const descuentoTipo = randomPick(['ninguno', 'porcentaje', 'fijo']);
      let descuentoValor = 0;
      if (descuentoTipo === 'porcentaje') {
        descuentoValor = randomInt(1, 20);
      } else if (descuentoTipo === 'fijo') {
        descuentoValor = toMoney(Math.min(subtotal * 0.25, randomInt(20, 250)));
      }
      const descuentoAplicado = descuentoTipo === 'porcentaje'
        ? toMoney((subtotal * descuentoValor) / 100)
        : toMoney(descuentoValor);
      const total = toMoney(Math.max(0, subtotal - descuentoAplicado));
      const medioPrincipal = randomPick(mediosPago);
      const cancelada = canceladaDisponible ? Math.random() < 0.12 : false;
      if (cancelada) ventasCanceladas += 1;

      let ventaInsert;
      if (canceladaDisponible) {
        ventaInsert = await client.query(
          `INSERT INTO public.ventas
            (usuario_id, cliente_id, fecha, fecha_entrega, medio_pago, cancelada, entregado, estado_entrega, observacion, subtotal, descuento_total_tipo, descuento_total_valor, total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           RETURNING id`,
          [
            usuarioId,
            clienteId,
            fechaVenta,
            fechaEntrega,
            medioPrincipal,
            cancelada,
            entregado,
            estadoEntrega,
            `Venta de prueba #${i + 1}`,
            subtotal,
            descuentoTipo,
            descuentoValor,
            total,
          ]
        );
      } else {
        ventaInsert = await client.query(
          `INSERT INTO public.ventas
            (usuario_id, cliente_id, fecha, fecha_entrega, medio_pago, entregado, estado_entrega, observacion, subtotal, descuento_total_tipo, descuento_total_valor, total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING id`,
          [
            usuarioId,
            clienteId,
            fechaVenta,
            fechaEntrega,
            medioPrincipal,
            entregado,
            estadoEntrega,
            `Venta de prueba #${i + 1}`,
            subtotal,
            descuentoTipo,
            descuentoValor,
            total,
          ]
        );
      }
      const ventaId = Number(ventaInsert.rows[0].id);
      ventasCreadas += 1;

      for (const item of items) {
        await client.query(
          `INSERT INTO public.venta_detalle (venta_id, producto_id, cantidad, precio_unitario)
           VALUES ($1,$2,$3,$4)`,
          [ventaId, item.producto_id, item.cantidad, item.precio_unitario]
        );
        detallesCreados += 1;
      }

      const usarSplit = Math.random() < 0.35;
      if (!usarSplit || total <= 0) {
        await client.query(
          `INSERT INTO public.pagos (venta_id, medio_pago, monto)
           VALUES ($1,$2,$3)`,
          [ventaId, medioPrincipal, total]
        );
        pagosCreados += 1;
      } else {
        const medios = sampleUnique(mediosPago, 2);
        const primeraParte = toMoney(total * (Math.random() * 0.5 + 0.25));
        const segundaParte = toMoney(total - primeraParte);

        await client.query(
          `INSERT INTO public.pagos (venta_id, medio_pago, monto)
           VALUES ($1,$2,$3), ($1,$4,$5)`,
          [ventaId, medios[0], primeraParte, medios[1], segundaParte]
        );
        pagosCreados += 2;
      }
    }

    await client.query('COMMIT');
    // eslint-disable-next-line no-console
    console.log(`Seed OK: ${productosIds.length} productos, ${clientesIds.length} clientes, ${ventasCreadas} ventas, ${detallesCreados} detalles, ${pagosCreados} pagos (${ventasCanceladas} canceladas).`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Error ejecutando seed de prueba:', error.message);
  process.exit(1);
});

