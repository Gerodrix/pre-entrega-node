# Preentrega de Node.js

Aplicación de terminal para consultar, crear y eliminar productos con FakeStore API.

## Requisitos

- Node.js 22 o superior.
- Conexión a Internet.

El proyecto usa ESModules y el `fetch` de Node.js, sin dependencias externas.

## Uso

Abrir una terminal dentro de la carpeta `pre-entrega-node` y ejecutar:

```sh
# Consultar todos los productos
npm run start GET products

# Consultar un producto por su ID
npm run start GET products/15

# Crear un producto
npm run start POST products T-Shirt-Rex 300 remeras

# Eliminar un producto por su ID
npm run start DELETE products/7
```

Para títulos o categorías con espacios, usar comillas:

```sh
npm run start POST products "T-Shirt Rex" 19.99 "ropa de hombre"
```

El precio debe ser un número mayor o igual a cero, con punto para los decimales.
Las respuestas se muestran en la consola en formato JSON.

## Funcionamiento

Los argumentos se leen con `process.argv`. El programa valida el método, el
recurso y los datos ingresados, y realiza la petición con `fetch` y `async/await`.
Si ocurre un error, muestra un mensaje y los comandos disponibles.

## Pruebas

```sh
npm test
```

Las pruebas comprueban los comandos, las validaciones y los errores usando
respuestas simuladas de la API.

## API

[Documentación de FakeStore API](https://fakestoreapi.com/docs).
Las creaciones y eliminaciones de esta API son simuladas y no persisten.
