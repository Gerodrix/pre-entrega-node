import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const entry = fileURLToPath(new URL('../index.js', import.meta.url));
function run(args, response = "return Response.json({ id: 7, title: 'Producto' });") {
  const mock = `globalThis.fetch = async (url, options) => {
    process.stderr.write('REQUEST:' + JSON.stringify({url, method: options.method, body: options.body, headers: options.headers}) + '\\n');
    ${response}
  };`;
  return spawnSync(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(mock), entry, ...args], { encoding: 'utf8' });
}
function request(result) {
  return JSON.parse(result.stderr.split('\n').find(line => line.startsWith('REQUEST:')).slice(8));
}

test('help succeeds without making an HTTP request', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Uso:/);
  assert.equal(result.stderr, '');
});
test('GET lists products and accepts lowercase method', () => {
  const result = run(['get', 'products'], 'return Response.json([{ id: 7 }]);');
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), [{ id: 7 }]);
  assert.deepEqual(request(result), { url: 'https://fakestoreapi.com/products', method: 'GET' });
});
test('GET by ID and DELETE select the intended resource and method', () => {
  for (const method of ['GET', 'DELETE']) {
    const result = run([method, 'products/7']);
    assert.equal(result.status, 0);
    assert.equal(request(result).url, 'https://fakestoreapi.com/products/7');
    assert.equal(request(result).method, method);
  }
});
test('POST sends numeric prices and preserves spaces in titles and categories', () => {
  const result = run(['POST', 'products', ' T-Shirt Rex ', '19.99', ' ropa de hombre ']);
  assert.equal(result.status, 0);
  assert.equal(request(result).method, 'POST');
  assert.equal(request(result).headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(request(result).body), { title: 'T-Shirt Rex', price: 19.99, category: 'ropa de hombre' });
});
test('invalid arguments fail before reaching the API', () => {
  for (const args of [[], ['PATCH', 'products'], ['GET', 'products/0'], ['GET', 'products/1/extra'], ['DELETE', 'products'], ['GET', 'products', 'extra'], ['POST', 'products', 'x', '-1', 'y'], ['POST', 'products', ' ', '1', 'y']]) {
    const result = run(args);
    assert.equal(result.status, 1, JSON.stringify(args));
    assert.match(result.stderr, /Error:/);
    assert.ok(!result.stderr.includes('REQUEST:'), JSON.stringify(args));
  }
});
test('HTTP, malformed JSON, missing product and connection errors fail clearly', () => {
  for (const [response, expected] of [
    ["return new Response('', {status: 503});", /HTTP 503/],
    ["return new Response('not json');", /JSON válidos/],
    ['return Response.json(null);', /No se encontró/],
    ["throw new TypeError('fetch failed');", /No se pudo conectar/],
    ["throw new DOMException('timeout', 'TimeoutError');", /15 segundos/],
  ]) {
    const result = run(['GET', 'products/7'], response);
    assert.equal(result.status, 1);
    assert.match(result.stderr, expected);
  }
});
