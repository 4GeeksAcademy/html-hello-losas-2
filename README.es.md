# Maison Rive

Prototipo estático de tienda online para una marca de moda francesa ficticia. Está construido con HTML y CSS, usa Tailwind CSS v4 mediante su CDN de navegador y no incluye JavaScript de aplicación.

## Páginas

- `index.html`: página de inicio.
- `catalogo.html`: catálogo de 20 productos con filtros CSS por categoría y talla.
- `producto.html`: fichas de muestra, seleccionadas mediante el fragmento de la URL.
- `carrito.html`: carrito ilustrativo.
- `checkout.html`: proceso de compra ilustrativo.

Las páginas de producto, carrito y pago son demostraciones: no funcionan las cuentas, la búsqueda, la actualización del carrito, los pedidos ni los pagos. Los campos de pago y los controles de compra están desactivados. No introduzcas datos personales ni de pago.

## Ejecución local

Se necesitan Python 3 y Flask:

```sh
python -m pip install flask
python server.py
```

Abre la dirección local que indique Flask (normalmente `http://127.0.0.1:5000`). El CDN de Tailwind necesita conexión a Internet.

## Filtros del catálogo

El filtrado usa controles de radio HTML y selectores CSS `:has()`. Se requiere un navegador moderno compatible con `:has()`. Los filtros no se guardan en la URL ni muestran un contador dinámico de resultados.
