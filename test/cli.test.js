import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const entrada = new URL('../index.js', import.meta.url).href;

// Ejecuta el punto de entrada completo en otro proceso, con una API simulada.
function ejecutar(argumentos, respuesta = { id: 15, title: 'Producto de prueba' }, escenario = 'ok') {
  const codigo = `
    process.argv = [process.execPath, 'index.js', ...${JSON.stringify(argumentos)}];
    globalThis.fetch = async (url, opciones) => {
      console.error('PETICION:' + JSON.stringify({
        url, method: opciones.method, headers: opciones.headers,
        body: opciones.body ? JSON.parse(opciones.body) : undefined
      }));
      const escenario = ${JSON.stringify(escenario)};
      if (escenario === 'red') throw new TypeError('fetch failed');
      if (escenario === 'timeout') throw new DOMException('Timeout', 'TimeoutError');
      if (escenario === 'http') return new Response('Servicio no disponible', { status: 503 });
      if (escenario === 'vacio') return new Response('');
      if (escenario === 'json') return new Response('<html>Error</html>');
      return new Response(JSON.stringify(${JSON.stringify(respuesta)}));
    };
    await import(${JSON.stringify(entrada)});
  `;
  return spawnSync(process.execPath, ['--input-type=module', '-e', codigo], {
    encoding: 'utf8', timeout: 10000,
  });
}

function peticion(resultado) {
  const linea = resultado.stderr.split('\n').find((item) => item.startsWith('PETICION:'));
  return linea ? JSON.parse(linea.slice('PETICION:'.length)) : undefined;
}

test('GET products muestra la lista completa', () => {
  const productos = [{ id: 1, title: 'Remera' }, { id: 2, title: 'Camisa' }];
  const resultado = ejecutar(['GET', 'products'], productos);
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.deepEqual(JSON.parse(resultado.stdout), productos);
  assert.deepEqual(peticion(resultado), { url: 'https://fakestoreapi.com/products', method: 'GET' });
});

test('GET products/15 consulta un producto y admite el método en minúsculas', () => {
  const resultado = ejecutar(['get', 'products/15']);
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.equal(JSON.parse(resultado.stdout).id, 15);
  assert.equal(peticion(resultado).url, 'https://fakestoreapi.com/products/15');
});

test('POST envía título y categoría con espacios y precio numérico', () => {
  const producto = { id: 21, title: 'T-Shirt Rex', price: 19.99, category: 'ropa de hombre' };
  const resultado = ejecutar(['POST', 'products', 'T-Shirt Rex', '19.99', 'ropa de hombre'], producto);
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.deepEqual(JSON.parse(resultado.stdout), producto);
  const solicitud = peticion(resultado);
  assert.equal(solicitud.url, 'https://fakestoreapi.com/products');
  assert.equal(solicitud.method, 'POST');
  assert.equal(solicitud.headers['Content-Type'], 'application/json');
  assert.equal(solicitud.body.title, producto.title);
  assert.equal(solicitud.body.price, 19.99);
  assert.equal(solicitud.body.category, producto.category);
});

test('DELETE products/7 muestra la respuesta de la API', () => {
  const resultado = ejecutar(['DELETE', 'products/7'], { id: 7 });
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.deepEqual(JSON.parse(resultado.stdout), { id: 7 });
  assert.deepEqual(peticion(resultado), { url: 'https://fakestoreapi.com/products/7', method: 'DELETE' });
});

test('la ayuda no consulta la API', () => {
  const resultado = ejecutar(['--help']);
  assert.equal(resultado.status, 0);
  assert.match(resultado.stdout, /Uso:/);
  assert.equal(peticion(resultado), undefined);
});

const comandosInvalidos = [
  [], ['PUT', 'products/1'], ['GET', 'users'], ['GET', 'products/'],
  ['GET', 'products/0'], ['GET', 'products/-1'], ['GET', 'products/1.5'],
  ['GET', 'products/1/extra'], ['GET', 'products/9007199254740992'],
  ['GET', 'products', 'extra'], ['DELETE', 'products'],
  ['POST', 'products/1', 'Remera', '100', 'ropa'],
  ['POST', 'products', 'Remera', '100'],
  ['POST', 'products', 'Remera', 'abc', 'ropa'],
  ['POST', 'products', 'Remera', '-5', 'ropa'],
  ['POST', 'products', 'Remera', 'Infinity', 'ropa'],
  ['POST', 'products', 'Remera', ' ', 'ropa'],
  ['POST', 'products', ' ', '100', 'ropa'],
  ['POST', 'products', 'Remera', '100', ' '],
];

for (const argumentos of comandosInvalidos) {
  test(`rechaza ${JSON.stringify(argumentos)} antes de consultar la API`, () => {
    const resultado = ejecutar(argumentos);
    assert.equal(resultado.status, 1, resultado.stderr);
    assert.match(resultado.stderr, /Error:/);
    assert.equal(peticion(resultado), undefined);
  });
}

test('permite un precio de cero', () => {
  const resultado = ejecutar(['POST', 'products', 'Muestra', '0', 'ropa']);
  assert.equal(resultado.status, 0, resultado.stderr);
  assert.equal(peticion(resultado).body.price, 0);
});

for (const [escenario, mensaje] of [
  ['http', /HTTP 503/], ['red', /No se pudo conectar/],
  ['timeout', /15 segundos/], ['vacio', /no devolvió datos/],
  ['json', /no es JSON válido/],
]) {
  test(`informa el error de API: ${escenario}`, () => {
    const resultado = ejecutar(['GET', 'products/15'], null, escenario);
    assert.equal(resultado.status, 1, resultado.stderr);
    assert.match(resultado.stderr, mensaje);
    assert.equal(resultado.stdout, '');
  });
}

for (const respuesta of [null, {}]) {
  test(`informa un producto inexistente: ${JSON.stringify(respuesta)}`, () => {
    const resultado = ejecutar(['GET', 'products/999'], respuesta);
    assert.equal(resultado.status, 1);
    assert.match(resultado.stderr, /No se encontró/);
  });
}
