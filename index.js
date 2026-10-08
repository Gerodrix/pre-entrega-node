const API_URL = 'https://fakestoreapi.com';
const [metodoIngresado, recurso, ...datos] = process.argv.slice(2);
const metodo = metodoIngresado?.toUpperCase();

async function solicitar(recurso, opciones = {}) {
  const respuesta = await fetch(`${API_URL}/${recurso}`, {
    method: 'GET',
    ...opciones,
    signal: AbortSignal.timeout(15000),
  });
  if (!respuesta.ok) {
    throw new Error(`La API respondió con un error HTTP ${respuesta.status}.`);
  }
  const resultado = await respuesta.json();
  if (resultado === null || (recurso.includes('/') && !resultado?.id)) {
    throw new Error('No se encontró el producto solicitado.');
  }
  console.log(JSON.stringify(resultado, null, 2));
}

async function listarProductos() {
  await solicitar('products');
}

async function consultarProducto(id) {
  await solicitar(`products/${id}`);
}

async function crearProducto(title, price, category) {
  await solicitar('products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, price, category }),
  });
}

async function eliminarProducto(id) {
  await solicitar(`products/${id}`, { method: 'DELETE' });
}

function mostrarAyuda() {
  console.log(`Uso:
  npm run start GET products
  npm run start GET products/<id>
  npm run start POST products <title> <price> <category>
  npm run start DELETE products/<id>`);
}

async function main() {
  if (['--help', '-h'].includes(metodoIngresado) && recurso === undefined) {
    mostrarAyuda();
    return;
  }
  if (!['GET', 'POST', 'DELETE'].includes(metodo)) {
    throw new Error('Indicá un método válido: GET, POST o DELETE.');
  }
  const [coleccion, id, ...extra] = (recurso ?? '').split('/');
  if (coleccion !== 'products' || extra.length > 0) {
    throw new Error('El recurso debe ser products o products/<id>.');
  }
  if (id !== undefined && (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))) {
    throw new Error('El ID debe ser un número entero positivo.');
  }
  if (metodo === 'POST') {
    if (id !== undefined || datos.length !== 3) {
      throw new Error('Para crear: POST products <title> <price> <category>.');
    }
    const [title, price, category] = datos;
    if (!title.trim() || !category.trim()) {
      throw new Error('El título y la categoría no pueden estar vacíos.');
    }
    if (!price.trim() || !Number.isFinite(Number(price)) || Number(price) < 0) {
      throw new Error('El precio debe ser un número mayor o igual a cero.');
    }
    await crearProducto(title.trim(), Number(price), category.trim());
  } else {
    if (datos.length > 0) {
      throw new Error('GET y DELETE no aceptan datos adicionales.');
    }
    if (metodo === 'GET' && id === undefined) {
      await listarProductos();
    } else if (metodo === 'GET') {
      await consultarProducto(id);
    } else if (id !== undefined) {
      await eliminarProducto(id);
    } else {
      throw new Error('Para eliminar: DELETE products/<id>.');
    }
  }
}

main().catch((error) => {
  let mensaje = error.message;
  if (error.name === 'TimeoutError') {
    mensaje = 'La API tardó más de 15 segundos en responder.';
  } else if (error.name === 'SyntaxError') {
    mensaje = 'La API no devolvió datos JSON válidos. Verificá que el producto exista.';
  } else if (error.message === 'fetch failed') {
    mensaje = 'No se pudo conectar con FakeStore API.';
  }
  console.error(`Error: ${mensaje}`);
  mostrarAyuda();
  process.exitCode = 1;
});
