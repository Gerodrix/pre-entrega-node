# Preentrega de Node.js

Programa de terminal para consultar, crear y eliminar productos con FakeStore API.

## Requisitos

Node.js 22 o superior y conexión a Internet. No requiere dependencias externas.

## Uso

Abrir una terminal en la carpeta del proyecto y ejecutar:

```sh
npm run start GET products
npm run start GET products/15
npm run start POST products T-Shirt-Rex 300 remeras
npm run start DELETE products/7
```

Para títulos o categorías con espacios, usar comillas:

```sh
npm run start POST products "T-Shirt Rex" 19.99 "ropa de hombre"
```

El precio usa punto para los decimales. Si el comando es incorrecto, el programa
muestra un mensaje y los usos válidos.

[Documentación de FakeStore API](https://fakestoreapi.com/docs).
Las creaciones y eliminaciones son simuladas y no persisten en la API.
