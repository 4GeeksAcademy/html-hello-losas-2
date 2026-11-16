"""Flask server for the Maison Rive prototype and its session-based cart."""

from __future__ import annotations

import html
import os
import re
import subprocess
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from flask import Flask, redirect, request, send_from_directory, session, url_for
from markupsafe import escape

BASE_DIR = Path(__file__).resolve().parent
app = Flask(__name__)
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0
app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY", "local-prototype-change-this-key")


def load_products() -> dict[str, dict]:
    """Read trusted product details and available sizes from the existing HTML."""
    product_html = (BASE_DIR / "producto.html").read_text(encoding="utf-8")
    catalog_html = (BASE_DIR / "catalogo.html").read_text(encoding="utf-8")
    catalogue_info = {
        product_id: {"category": category, "sizes": sizes.split()}
        for category, sizes, product_id in re.findall(
            r'<li data-category="([^"]+)" data-sizes="([^"]+)"><article class="group"><a href="producto\.html#([^"]+)"',
            catalog_html,
        )
    }
    products = {}
    for product_id, section in re.findall(r'<section id="([^"]+)"[^>]*>(.*?)</section>', product_html, re.DOTALL):
        name_match = re.search(r'<h1[^>]*>(.*?)</h1>', section, re.DOTALL)
        code_match = re.search(r'Código:\s*([^<]+)', section)
        price_match = re.search(r'class="mt-4 text-3xl font-semibold">([\d,]+)&nbsp;€', section)
        image_match = re.search(r'<img src="([^"]+)"[^>]*alt="([^"]+)"', section)
        if not all((name_match, code_match, price_match, image_match)):
            continue
        price = Decimal(price_match.group(1).replace(",", "."))
        products[product_id] = {
            "id": product_id,
            "name": html.unescape(re.sub(r"<[^>]+>", "", name_match.group(1))).strip(),
            "code": code_match.group(1).strip(),
            "price_cents": int((price * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)),
            "image": image_match.group(1),
            "alt": html.unescape(image_match.group(2)),
            **catalogue_info.get(product_id, {"category": "accesorios", "sizes": ["unica"]}),
        }
    return products


PRODUCTS = load_products()


def cart_state() -> dict[str, dict]:
    """Return validated cart data from the signed Flask session."""
    raw_cart = session.get("cart", {})
    clean_cart = {}
    if not isinstance(raw_cart, dict):
        return clean_cart
    for key, raw_line in raw_cart.items():
        if not isinstance(raw_line, dict):
            continue
        product = PRODUCTS.get(str(raw_line.get("product_id", "")))
        size = str(raw_line.get("size", ""))
        try:
            quantity = int(raw_line.get("quantity", 0))
        except (TypeError, ValueError):
            continue
        if product and size in product["sizes"] and 1 <= quantity <= 20:
            clean_cart[key] = {"product_id": product["id"], "size": size, "quantity": quantity}
    return clean_cart


def cart_lines() -> list[dict]:
    lines = []
    for key, item in cart_state().items():
        product = PRODUCTS[item["product_id"]]
        lines.append({**product, **item, "key": key, "line_total": product["price_cents"] * item["quantity"]})
    return lines


def totals(lines: list[dict]) -> dict[str, int]:
    subtotal = sum(line["line_total"] for line in lines)
    vat = int((Decimal(subtotal) * Decimal("0.21")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return {"subtotal": subtotal, "vat": vat, "total": subtotal + vat}


def euros(cents: int) -> str:
    whole, fraction = divmod(cents, 100)
    return f"{whole:,}".replace(",", ".") + f",{fraction:02d}\u00a0€"


def product_form(product: dict) -> str:
    options = '<option value="" selected disabled>Selecciona una talla</option>' + "".join(
        f'<option value="{escape(size)}">{escape(size.title() if size == "unica" else size)}</option>'
        for size in product["sizes"]
    )
    size_control = (
        f'<label for="talla-{escape(product["id"])}" class="text-sm font-medium">Talla'
        f'<select id="talla-{escape(product["id"])}" name="size" required class="mt-1 min-h-11 w-full rounded-md border border-stone-300 bg-white px-3">{options}</select></label>'
    )
    if product["sizes"] == ["unica"]:
        size_control = '<input type="hidden" name="size" value="unica"><p class="text-sm text-stone-600">Talla única</p>'
    return (
        '<form action="/carrito/anadir" method="post" class="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-4">'
        f'<input type="hidden" name="product_id" value="{escape(product["id"])}">'
        f'<div class="grid gap-3 sm:grid-cols-2">{size_control}'
        f'<label for="cantidad-{escape(product["id"])}" class="text-sm font-medium">Cantidad'
        f'<input id="cantidad-{escape(product["id"])}" name="quantity" type="number" min="1" max="20" value="1" required class="mt-1 min-h-11 w-full rounded-md border border-stone-300 px-3"></label></div>'
        '<button type="submit" class="min-h-12 w-full rounded-full bg-stone-900 px-6 font-semibold text-white hover:bg-stone-700">Añadir al carrito</button>'
        '</form>'
    )


def render_product_page() -> str:
    page = (BASE_DIR / "producto.html").read_text(encoding="utf-8")
    # Replace the static notice directly rather than capturing each outer
    # product section with a non-greedy regex: product sections contain nested
    # <section> elements, so that regex would stop at the nested closing tag.
    product_ids = [
        product_id
        for product_id in re.findall(r'<section id="([^"]+)"[^>]*>', page)
        if product_id in PRODUCTS
    ]
    notice = re.compile(
        r'<p class="mt-6 rounded-md bg-stone-100 p-4 text-sm text-stone-700">'
        r'Ficha de producto de muestra\. La compra no está habilitada en esta maqueta estática\.</p>'
    )
    if len(product_ids) != len(PRODUCTS) or notice.subn("", page)[1] != len(product_ids):
        raise ValueError("Cada ficha de producto debe tener exactamente un aviso estático.")
    forms = iter(product_form(PRODUCTS[product_id]) for product_id in product_ids)
    page = notice.sub(lambda _: next(forms), page)
    return page.replace(
        "Explora las fichas de producto de ejemplo. La selección de variantes y la compra no están habilitadas en esta maqueta estática.",
        "Elige una variante y una cantidad para añadir productos al carrito. Las selecciones se guardan en esta sesión.",
    )


def render_cart_page() -> str:
    page = (BASE_DIR / "carrito.html").read_text(encoding="utf-8")
    lines = cart_lines()
    amount = totals(lines)
    if lines:
        list_items = []
        for line in lines:
            key = escape(line["key"])
            size = line["size"].title() if line["size"] == "unica" else line["size"]
            list_items.append(
                '<li class="grid grid-cols-[5rem_1fr] gap-4 p-4 sm:grid-cols-[6rem_1fr_auto] sm:p-6">'
                f'<img src="{escape(line["image"])}" width="200" height="250" loading="lazy" alt="{escape(line["alt"])}" class="aspect-4/5 w-full rounded-md object-cover">'
                '<div>'
                f'<h3 class="font-medium"><a href="producto.html#{escape(line["id"])}" class="hover:underline">{escape(line["name"])}</a></h3>'
                f'<p class="mt-1 text-sm text-stone-600">Talla {escape(size)} · {escape(line["code"])}</p>'
                f'<p class="mt-1 text-sm">Precio unitario: <span class="font-medium">{euros(line["price_cents"])}</span></p>'
                f'<form action="/carrito/actualizar" method="post" class="mt-3 flex flex-wrap items-end gap-2"><input type="hidden" name="key" value="{key}">'
                f'<label class="text-sm text-stone-600">Cantidad<input name="quantity" type="number" min="1" max="20" value="{line["quantity"]}" class="mt-1 block min-h-10 w-24 rounded-md border border-stone-300 px-3"></label>'
                '<button name="action" value="update" class="min-h-10 rounded-md border border-stone-300 px-3 text-sm font-medium hover:bg-stone-100">Actualizar</button>'
                '<button name="action" value="remove" class="min-h-10 rounded-md px-3 text-sm text-red-800 underline">Eliminar</button></form></div>'
                f'<p class="col-span-2 text-right font-semibold sm:col-span-1 sm:col-start-3"><span class="text-sm font-normal text-stone-600 sm:sr-only">Total: </span>{euros(line["line_total"])}</p></li>'
            )
        content = '<ul class="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">' + "".join(list_items) + "</ul>"
        content += '<p class="mt-4 text-sm"><a href="catalogo.html" class="underline underline-offset-4 hover:text-stone-600">&larr; Seguir comprando</a></p>'
        content += '<form action="/carrito/vaciar" method="post" class="mt-3"><button class="text-sm text-red-800 underline">Vaciar carrito</button></form>'
        checkout_button = '<a href="checkout.html" class="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-stone-900 px-8 text-base font-semibold text-white hover:bg-stone-700">Continuar al pago</a>'
        unit_count = sum(line["quantity"] for line in lines)
        item_count = len(lines)
        count_note = f'{unit_count} {"unidad" if unit_count == 1 else "unidades"} · {item_count} {"artículo" if item_count == 1 else "artículos"}'
    else:
        content = '<div class="rounded-xl border border-stone-200 bg-white p-8 text-center"><p class="text-stone-700">Tu carrito está vacío.</p><a href="catalogo.html" class="mt-4 inline-flex min-h-11 items-center underline">Explorar catálogo</a></div>'
        checkout_button = '<p class="mt-6 text-sm text-stone-500">Añade algún artículo para continuar.</p>'
        count_note = "0 artículos"
    lines_section = f'<section aria-labelledby="lineas-titulo"><h2 id="lineas-titulo" class="sr-only">Artículos de tu carrito</h2>{content}</section>'
    page = re.sub(r'<section aria-labelledby="lineas-titulo">.*?</section>', lines_section, page, count=1, flags=re.DOTALL)
    summary = (
        '<aside aria-labelledby="resumen-titulo" class="rounded-xl border border-stone-200 bg-white p-6 lg:sticky lg:top-40">'
        '<h2 id="resumen-titulo" class="text-lg font-semibold">Resumen del pedido</h2>'
        f'<dl class="mt-4 space-y-3 text-sm"><div class="flex justify-between"><dt>Subtotal</dt><dd>{euros(amount["subtotal"])}</dd></div>'
        f'<div class="flex justify-between"><dt>IVA (21%)</dt><dd>{euros(amount["vat"])}</dd></div><div class="flex justify-between"><dt>Envío</dt><dd>Gratis</dd></div>'
        f'<div class="flex justify-between border-t border-stone-200 pt-3 text-base font-semibold"><dt>Total</dt><dd>{euros(amount["total"])}</dd></div></dl>'
        '<p class="mt-3 text-xs text-stone-600">El IVA se calcula al 21%; el envío es gratuito en este prototipo.</p>' + checkout_button + '</aside>'
    )
    page = re.sub(r'<aside aria-labelledby="resumen-titulo".*?</aside>', summary, page, count=1, flags=re.DOTALL)
    page = re.sub(r'<title>.*?</title>', '<title>Carrito | Maison Rive</title>', page, count=1)
    page = page.replace(
        '<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Carrito de ejemplo</h1>\n    <p class="mt-2 text-stone-600">Ejemplo estático: 3 productos · 4 unidades</p>',
        f'<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Tu carrito</h1>\n    <p class="mt-2 text-stone-600">{count_note}</p>',
    ).replace("Paso 1 de 3: Carrito de ejemplo", "Paso 1 de 3: Carrito")
    return page


def render_checkout_page() -> str:
    page = (BASE_DIR / "checkout.html").read_text(encoding="utf-8")
    lines = cart_lines()
    amount = totals(lines)
    rows = "".join(
        f'<li class="flex items-center justify-between gap-3"><img src="{escape(line["image"])}" width="56" height="56" alt="" class="size-14 rounded-md object-cover">'
        f'<span class="flex-1">{escape(line["name"])} · talla {escape(line["size"])} × {line["quantity"]}</span><span class="shrink-0">{euros(line["line_total"])}</span></li>'
        for line in lines
    ) or '<li class="text-stone-600">El carrito está vacío.</li>'
    page = re.sub(r'<ul class="mt-4 space-y-2 text-sm">.*?</ul>', f'<ul class="mt-4 space-y-2 text-sm">{rows}</ul>', page, count=1, flags=re.DOTALL)
    summary = (
        '<dl class="mt-4 space-y-2 border-t border-stone-200 pt-4 text-sm">'
        f'<div class="flex justify-between"><dt>Subtotal</dt><dd>{euros(amount["subtotal"])}</dd></div>'
        f'<div class="flex justify-between"><dt>IVA (21%)</dt><dd>{euros(amount["vat"])}</dd></div>'
        '<div class="flex justify-between"><dt>Envío</dt><dd>Gratis</dd></div>'
        f'<div class="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold"><dt>Total</dt><dd>{euros(amount["total"])}</dd></div></dl>'
    )
    return re.sub(r'<dl class="mt-4 space-y-2 border-t border-stone-200 pt-4 text-sm">.*?</dl>', summary, page, count=1, flags=re.DOTALL)


@app.get("/")
def serve_home():
    if (BASE_DIR / "app.py").exists():
        out = subprocess.Popen(["python3", "app.py"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, cwd=BASE_DIR)
        stdout, _ = out.communicate()
        return stdout if out.returncode == 0 else f"<pre style='color: red;'>{stdout.decode('utf-8')}</pre>"
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/producto.html")
def serve_products():
    return render_product_page()


@app.get("/carrito.html")
def serve_cart():
    return render_cart_page()


@app.get("/checkout.html")
def serve_checkout():
    return render_checkout_page()


@app.post("/carrito/anadir")
def add_to_cart():
    product_id = request.form.get("product_id", "")
    product = PRODUCTS.get(product_id)
    size = request.form.get("size", "")
    try:
        quantity = int(request.form.get("quantity", "1"))
    except ValueError:
        quantity = 0
    if not product or size not in product["sizes"] or not 1 <= quantity <= 20:
        return "Selección de producto no válida. Vuelve a la ficha e inténtalo de nuevo.", 400
    cart = cart_state()
    key = f"{product_id}|{size}"
    current = cart.get(key, {}).get("quantity", 0)
    cart[key] = {"product_id": product_id, "size": size, "quantity": min(current + quantity, 20)}
    session["cart"] = cart
    return redirect(url_for("serve_cart"))


@app.post("/carrito/actualizar")
def update_cart():
    cart = cart_state()
    key = request.form.get("key", "")
    if key not in cart:
        return redirect(url_for("serve_cart"))
    if request.form.get("action") == "remove":
        cart.pop(key)
    else:
        try:
            quantity = int(request.form.get("quantity", "0"))
        except ValueError:
            quantity = 0
        if not 1 <= quantity <= 20:
            return "La cantidad debe estar entre 1 y 20.", 400
        cart[key]["quantity"] = quantity
    session["cart"] = cart
    return redirect(url_for("serve_cart"))


@app.post("/carrito/vaciar")
def clear_cart():
    session.pop("cart", None)
    return redirect(url_for("serve_cart"))


@app.get("/<path:path>")
def serve_static(path: str):
    if not (BASE_DIR / path).is_file():
        path = os.path.join(path, "index.html")
    response = send_from_directory(BASE_DIR, path)
    response.cache_control.max_age = 0
    return response


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, debug=True, extra_files=[str(BASE_DIR)])
