const API_URL = 'https://fakestoreapi.com';

const AYUDA = `Uso:
  npm run start GET products
  npm run start GET products/<productId>
  npm run start POST products <title> <price> <category>
  npm run start DELETE products/<productId>

Ejemplos:
  npm run start GET products/15
  npm run start POST products "T-Shirt Rex" 300 remeras
  npm run start DELETE products/7

Usá comillas si el título o la categoría contienen espacios.
Para ver esta ayuda: npm run start -- --help`;

function interpretarComando(argumentos) {
  const [metodoIngresado, recurso, ...datos] = argumentos;
  const metodo = metodoIngresado?.toUpperCase();

  if (!['GET', 'POST', 'DELETE'].includes(metodo)) {
    throw new Error('Indicá un método válido: GET, POST o DELETE.');
  }

  const [coleccion, id, ...segmentosExtra] = (recurso ?? '').split('/');
  if (coleccion !== 'products' || segmentosExtra.length > 0) {
    throw new Error('El recurso debe ser products o products/<productId>.');
  }

  if (id !== undefined && (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))) {
    throw new Error('El ID debe ser un número entero positivo.');
  }

  if (metodo === 'POST') {
    if (id !== undefined || datos.length !== 3) {
      throw new Error('Para crear: POST products <title> <price> <category>.');
    }

    const [tituloIngresado, precioIngresado, categoriaIngresada] = datos;
    const title = tituloIngresado.trim();
    const category = categoriaIngresada.trim();
    const price = Number(precioIngresado);

    if (!title || !category) {
      throw new Error('El título y la categoría no pueden estar vacíos.');
    }
    if (!precioIngresado.trim() || !Number.isFinite(price) || price < 0) {
      throw new Error('El precio debe ser un número mayor o igual a cero. Usá punto para los decimales.');
    }

    return { metodo, recurso, producto: { title, price, category } };
  }

  if (datos.length > 0) {
    throw new Error('GET y DELETE no aceptan datos adicionales.');
  }
  if (metodo === 'DELETE' && id === undefined) {
    throw new Error('Para eliminar: DELETE products/<productId>.');
  }

  return { metodo, recurso };
}

async function gestionarProductos({ metodo, recurso, producto }) {
  const opciones = {
    method: metodo,
    signal: AbortSignal.timeout(15000),
  };

  if (producto) {
    opciones.headers = { 'Content-Type': 'application/json' };
    opciones.body = JSON.stringify({ ...producto, description: '', image: '' });
  }

  const respuesta = await fetch(`${API_URL}/${recurso}`, opciones);
  if (!respuesta.ok) {
    throw new Error(`La API respondió con un error HTTP ${respuesta.status}.`);
  }

  // Un ID inexistente puede devolver una respuesta vacía.
  const contenido = await respuesta.text();
  if (!contenido.trim()) {
    throw new Error('La API no devolvió datos. Verificá que el producto exista.');
  }

  let resultado;
  try {
    resultado = JSON.parse(contenido);
  } catch {
    throw new Error('La API devolvió una respuesta que no es JSON válido.');
  }
  if (resultado === null || (recurso.includes('/') && !resultado?.id)) {
    throw new Error('No se encontró el producto solicitado.');
  }

  console.log(JSON.stringify(resultado, null, 2));
}

// Los primeros dos argumentos son las rutas de Node y de este archivo.
const argumentos = process.argv.slice(2);

try {
  if (argumentos.length === 1 && ['--help', '-h'].includes(argumentos[0])) {
    console.log(AYUDA);
  } else {
    const comando = interpretarComando(argumentos);
    await gestionarProductos(comando);
  }
} catch (error) {
  let mensaje = error.message;
  if (error.name === 'TimeoutError') {
    mensaje = 'La API tardó más de 15 segundos en responder. Intentá nuevamente.';
  } else if (error.message === 'fetch failed') {
    mensaje = 'No se pudo conectar con FakeStore API. Revisá tu conexión e intentá nuevamente.';
  }

  console.error(`Error: ${mensaje}`);
  console.error('\n' + AYUDA);
  process.exitCode = 1;
}
