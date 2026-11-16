# Maison Rive

Prototipo de tienda online para una marca de moda francesa ficticia. Está construido con HTML y CSS, usa Tailwind CSS v4 mediante su CDN de navegador y no incluye JavaScript de aplicación. Flask gestiona el carrito mediante formularios HTML tradicionales y sesiones de servidor.

## Páginas

- `index.html`: página de inicio.
- `catalogo.html`: catálogo de 20 productos con filtros CSS por categoría y talla.
- `producto.html`: fichas de muestra, seleccionadas mediante el fragmento de la URL.
- `carrito.html`: carrito de la sesión, con edición de cantidades, eliminación de artículos y cálculo de subtotal, IVA y total.
- `checkout.html`: proceso de compra ilustrativo; el resumen muestra los artículos y el total del carrito actual.

Las fichas permiten elegir talla y cantidad y añadir productos al carrito. El carrito se mantiene en una cookie de sesión firmada por Flask; los precios y variantes válidos se verifican en el servidor. El checkout sigue siendo únicamente visual: no se procesan pedidos ni pagos, y sus campos personales y de tarjeta continúan desactivados. No introduzcas datos personales ni de pago.

## Ejecución local

Se necesitan Python 3 y Flask:

```sh
python -m pip install flask
python server.py
```

Abre `http://127.0.0.1:3000`. Para un entorno que no sea local, configura una clave secreta propia mediante la variable `FLASK_SECRET_KEY`. El CDN de Tailwind necesita conexión a Internet.

## Filtros del catálogo

El filtrado usa controles de radio HTML y selectores CSS `:has()`. Se requiere un navegador moderno compatible con `:has()`. Los filtros no se guardan en la URL ni muestran un contador dinámico de resultados.
