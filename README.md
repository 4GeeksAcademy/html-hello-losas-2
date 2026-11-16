# HTML Hello

The most basic boilerplate for any 4Geeks Academy student, start your very first website from scratch.

> There is a video tutorial on [how to use this template to create your very first website here](https://youtu.be/dfbDCMu_p-0).

## What to do next?

Create an `index.html` file with the [basic HTML structure](http://4geeks.com/lesson/what-is-html-learn-html#page-structure) and see it live by running a web-server using the following command:

```bash
$ pip3 install flask && python3 server.py
```

- You can create as many HTML files as you want.
- You can also create CSS files and import them into your website using a `<link>` tag placed between the `<head></head>` tags, like this:

```html
# Maison Rive

Static e-commerce storefront prototype for a fictional French fashion brand. The site is built with HTML and CSS, uses Tailwind CSS v4 via its browser CDN, and does not include custom application JavaScript.

## Pages

- `index.html` — home page
- `catalogo.html` — 20-item catalog with category- and size-specific CSS-only filters
- `producto.html` — sample product details selected by URL fragment
- `carrito.html` — illustrative cart
- `checkout.html` — illustrative checkout

The product, cart, and checkout pages are demonstrations only. No account, search, cart updates, orders, or payments are implemented. Checkout fields and purchase controls are disabled; do not enter personal or payment information.

## Run locally

Requires Python 3 and Flask:

```sh
python -m pip install flask
python server.py
```

Open the local address printed by Flask (typically `http://127.0.0.1:5000`). The Tailwind browser CDN requires an internet connection.

## Catalog filter support

Filtering uses HTML radio inputs and CSS `:has()` selectors. Use a modern browser with `:has()` support. The filters are not persisted in the URL and do not display a live result count.
