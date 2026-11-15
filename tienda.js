// Interacciones de la maqueta: el carrito vive solo en sessionStorage, sin servidor ni base de datos.
const CLAVE = "carrito-maison";
const CLAVE_CUENTA = "maison-cuenta-activa";
const CLAVE_CUENTAS = "maison-cuentas-demo";
const IVA = 0.21;
const ENVIO_GRATIS_DESDE = 10000;
const ENVIO = 495;

const euros = (cents) => (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

const cuentaLaura = {
  nombre: "Laura Martín",
  email: "laura@example.com",
  telefono: "+34 600 000 000",
  pedidosDemo: true,
};

function leerJSON(storage, clave, alternativa) {
  try {
    return JSON.parse(storage.getItem(clave)) ?? alternativa;
  } catch {
    return alternativa;
  }
}

function leerCuentaActiva() {
  return leerJSON(sessionStorage, CLAVE_CUENTA, null);
}

function guardarCuentaActiva(cuenta) {
  sessionStorage.setItem(CLAVE_CUENTA, JSON.stringify(cuenta));
}

function renderCuenta() {
  const cuenta = leerCuentaActiva();
  if (!cuenta) return;

  const nombre = cuenta.nombre.trim().split(/\s+/)[0];
  document.querySelectorAll('nav[aria-label="Cuenta y carrito"] details').forEach((menu) => {
    const resumen = menu.querySelector("summary");
    const textoVisible = resumen.querySelector(".hidden.sm\\:inline");
    const textoAccesible = resumen.querySelector(".sr-only");
    if (textoVisible) textoVisible.textContent = nombre;
    if (textoAccesible) textoAccesible.textContent = `Cuenta de ${cuenta.nombre}`;
    resumen.setAttribute("aria-label", `Cuenta de ${cuenta.nombre}`);

    const lista = menu.querySelector("ul");
    lista.replaceChildren();
    const item = document.createElement("li");
    const cerrar = document.createElement("a");
    cerrar.href = "index.html";
    cerrar.dataset.cerrarSesion = "";
    cerrar.className = "block px-4 py-2 text-sm hover:bg-stone-100";
    cerrar.textContent = "Cerrar sesión";
    item.append(cerrar);
    lista.append(item);
  });

  const saludo = document.getElementById("saludo-cuenta");
  if (saludo) saludo.textContent = `Hola, ${nombre}. Aquí tienes el resumen de tu actividad.`;
  const campoNombre = document.getElementById("perfil-nombre");
  if (campoNombre) campoNombre.textContent = cuenta.nombre;
  const campoEmail = document.getElementById("perfil-email");
  if (campoEmail) campoEmail.textContent = cuenta.email;
  const campoTelefono = document.getElementById("perfil-telefono");
  if (campoTelefono && cuenta.telefono) campoTelefono.textContent = cuenta.telefono;

  const pedidosDemo = document.getElementById("pedidos-demo");
  const pedidosVacios = document.getElementById("pedidos-vacios");
  if (pedidosDemo && pedidosVacios && !cuenta.pedidosDemo) {
    pedidosDemo.classList.add("hidden");
    pedidosVacios.classList.remove("hidden");
  }
}

function initCuenta() {
  document.querySelectorAll("form[data-form-login]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = document.getElementById("login-email").value.trim().toLowerCase();
      const mensaje = document.getElementById("login-error");
      let cuenta;

      if (email === cuentaLaura.email) {
        cuenta = cuentaLaura;
      } else {
        const cuentas = leerJSON(localStorage, CLAVE_CUENTAS, []);
        cuenta = cuentas.find((item) => item.email.toLowerCase() === email);
      }

      if (!cuenta) {
        mensaje.textContent = "No encontramos esa cuenta. Crea una cuenta para continuar.";
        mensaje.classList.remove("hidden");
        return;
      }

      guardarCuentaActiva(cuenta);
      window.location.href = "mis-pedidos.html";
    });
  });

  document.querySelectorAll("form[data-form-registro]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const nombre = document.getElementById("reg-nombre").value.trim();
      const apellidos = document.getElementById("reg-apellidos").value.trim();
      const email = document.getElementById("reg-email").value.trim().toLowerCase();
      const password = document.getElementById("reg-password").value;
      const repetir = document.getElementById("reg-password2").value;
      const mensaje = document.getElementById("registro-error");

      if (password !== repetir) {
        mensaje.textContent = "Las contraseñas no coinciden.";
        mensaje.classList.remove("hidden");
        document.getElementById("reg-password2").focus();
        return;
      }

      const cuentas = leerJSON(localStorage, CLAVE_CUENTAS, []);
      if (email === cuentaLaura.email || cuentas.some((item) => item.email.toLowerCase() === email)) {
        mensaje.textContent = "Ya existe una cuenta con ese correo. Inicia sesión.";
        mensaje.classList.remove("hidden");
        document.getElementById("reg-email").focus();
        return;
      }

      const cuenta = { nombre: `${nombre} ${apellidos}`.trim(), email, pedidosDemo: false };
      localStorage.setItem(CLAVE_CUENTAS, JSON.stringify([...cuentas, cuenta]));
      guardarCuentaActiva(cuenta);
      window.location.href = "mis-pedidos.html";
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-cerrar-sesion]")) return;
    sessionStorage.removeItem(CLAVE_CUENTA);
  });
}

function leerCarrito() {
  try {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE));
    return Array.isArray(guardado) ? guardado : null;
  } catch {
    return null;
  }
}

function guardarCarrito(items) {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(items));
  } catch {
    // Sin almacenamiento disponible: la maqueta sigue funcionando en la página actual.
  }
}

function calcular(items) {
  const subtotal = items.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  const iva = Math.round(subtotal * IVA);
  const envio = subtotal === 0 || subtotal >= ENVIO_GRATIS_DESDE ? 0 : ENVIO;
  const unidades = items.reduce((suma, item) => suma + item.cantidad, 0);
  return { subtotal, iva, envio, total: subtotal + iva + envio, unidades };
}

function pintarResumen(items) {
  const { subtotal, iva, envio, total } = calcular(items);
  const poner = (id, texto) => {
    const nodo = document.getElementById(id);
    if (nodo) nodo.textContent = texto;
  };
  poner("resumen-subtotal", euros(subtotal));
  poner("resumen-iva", euros(iva));
  poner("resumen-envio", envio === 0 ? "Gratis" : euros(envio));
  poner("resumen-total", euros(total));
  poner("pagar-total", euros(total));
}

function pintarInsignia(items) {
  document.querySelectorAll("[data-insignia-carrito]").forEach((insignia) => {
    insignia.textContent = String(items.length);
    insignia.setAttribute("aria-label", `${items.length} productos en el carrito`);
  });
}

function initCarrito() {
  const contenido = document.getElementById("carrito-contenido");
  if (!contenido) return;

  const lineas = () => [...contenido.querySelectorAll("[data-linea]")];
  const cantidadDe = (linea) => {
    const valor = Math.round(Number(linea.querySelector("[data-cantidad]").value));
    return Number.isFinite(valor) ? Math.min(Math.max(valor, 1), 10) : 1;
  };
  const aItems = () =>
    lineas().map((linea) => ({
      id: linea.dataset.id,
      nombre: linea.querySelector("h3").textContent.trim(),
      imagen: linea.querySelector("img").getAttribute("src"),
      precio: Number(linea.dataset.precio),
      cantidad: cantidadDe(linea),
    }));

  const guardado = leerCarrito();
  if (guardado) {
    lineas().forEach((linea) => {
      const item = guardado.find((x) => x.id === linea.dataset.id);
      if (!item) linea.remove();
      else linea.querySelector("[data-cantidad]").value = item.cantidad;
    });
  }

  function actualizar() {
    const items = aItems();
    lineas().forEach((linea, i) => {
      linea.querySelector("[data-total-linea]").textContent = euros(items[i].precio * items[i].cantidad);
    });
    const { unidades } = calcular(items);
    document.getElementById("resumen-unidades").textContent =
      `${items.length} ${items.length === 1 ? "producto" : "productos"} (${unidades} ${unidades === 1 ? "unidad" : "unidades"})`;

    const vacio = items.length === 0;
    contenido.classList.toggle("hidden", vacio);
    document.getElementById("resumen-unidades").classList.toggle("hidden", vacio);
    document.getElementById("carrito-vacio").classList.toggle("hidden", !vacio);

    pintarResumen(items);
    pintarInsignia(items);
    guardarCarrito(items);
  }

  contenido.addEventListener("input", (e) => {
    if (e.target.matches("[data-cantidad]") && e.target.value !== "") actualizar();
  });

  contenido.addEventListener("change", (e) => {
    if (!e.target.matches("[data-cantidad]")) return;
    e.target.value = cantidadDe(e.target.closest("[data-linea]"));
    actualizar();
  });

  contenido.addEventListener("click", (e) => {
    const boton = e.target.closest("[data-eliminar]");
    if (!boton) return;
    boton.closest("[data-linea]").remove();
    actualizar();
  });

  actualizar();
}

function initCheckout() {
  const lista = document.getElementById("resumen-lineas");
  const items = leerCarrito();
  if (!lista || !items) return;

  lista.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement("li");
      li.className = "flex items-center justify-between gap-3";
      const img = document.createElement("img");
      img.src = item.imagen;
      img.alt = "";
      img.width = 56;
      img.height = 56;
      img.className = "size-14 rounded-md object-cover";
      const nombre = document.createElement("span");
      nombre.className = "flex-1";
      nombre.textContent = `${item.nombre} × ${item.cantidad}`;
      const precio = document.createElement("span");
      precio.className = "shrink-0";
      precio.textContent = euros(item.precio * item.cantidad);
      li.append(img, nombre, precio);
      return li;
    }),
  );
  pintarResumen(items);
}

function initPagos() {
  const opciones = document.querySelectorAll('input[name="metodo-pago"]');
  const panelTarjeta = document.getElementById("datos-tarjeta");
  if (!opciones.length || !panelTarjeta) return;

  const campos = panelTarjeta.querySelectorAll("input");
  const actualizar = () => {
    const tarjeta = document.querySelector('input[name="metodo-pago"]:checked')?.value === "tarjeta";
    panelTarjeta.hidden = !tarjeta;
    campos.forEach((campo) => {
      campo.required = tarjeta;
      campo.disabled = !tarjeta;
    });
  };
  opciones.forEach((opcion) => opcion.addEventListener("change", actualizar));
  actualizar();
}

function initCatalogo() {
  const lista = document.querySelector("#listado-titulo")?.nextElementSibling;
  if (!lista) return;

  const productos = [...lista.querySelectorAll(":scope > li")];
  if (!productos.length) return;

  const parametros = new URLSearchParams(window.location.search);
  const campoBusqueda = document.getElementById("buscar");
  const estado = document.getElementById("estado-resultados");
  const categorias = new Set(["camisas", "pantalones", "calzado", "accesorios"]);
  const categoriaSolicitada = parametros.get("categoria") ?? "";
  const categoriaActiva = categorias.has(categoriaSolicitada) ? categoriaSolicitada : "";
  const textoBusqueda = parametros.get("q")?.trim() ?? "";
  const normalizar = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (campoBusqueda) campoBusqueda.value = textoBusqueda;

  let visibles = 0;
  for (const producto of productos) {
    const etiquetaCategoria = normalizar(producto.querySelector("p.text-stone-600")?.textContent.trim() ?? "");
    const coincideCategoria = !categoriaActiva || etiquetaCategoria === categoriaActiva;
    const coincideBusqueda = !textoBusqueda || normalizar(producto.textContent).includes(normalizar(textoBusqueda));
    const mostrar = coincideCategoria && coincideBusqueda;

    producto.hidden = !mostrar;
    if (mostrar) visibles += 1;
  }

  if (estado) {
    estado.textContent = visibles
      ? `Mostrando ${visibles} de ${productos.length} productos`
      : "No hay productos que coincidan con la búsqueda.";
  }

  document.querySelectorAll('nav[aria-label="Categorías principales"] a').forEach((enlace) => {
    const categoriaEnlace = new URL(enlace.href, window.location.href).searchParams.get("categoria") ?? "";
    if (categoriaEnlace === categoriaActiva) enlace.setAttribute("aria-current", "page");
    else enlace.removeAttribute("aria-current");
  });
}

function initGalerias() {
  document.querySelectorAll(".product-view article").forEach((articulo) => {
    const galeria = articulo.firstElementChild;
    const principal = galeria?.querySelector(":scope > img");
    const lista = galeria?.querySelector("ul");
    if (!principal || !lista) return;

    const fotos = [principal, ...lista.querySelectorAll("img")].map((imagen) => ({
      src: imagen.getAttribute("src"),
      alt: imagen.alt,
    }));
    const marco = document.createElement("div");
    marco.className = "gallery-frame";
    const ampliar = document.createElement("button");
    ampliar.type = "button";
    ampliar.className = "gallery-image";
    ampliar.setAttribute("aria-label", "Ampliar imagen");
    ampliar.setAttribute("aria-pressed", "false");
    principal.before(marco);
    marco.append(ampliar);
    ampliar.append(principal);

    const contador = document.createElement("p");
    contador.className = "gallery-counter";
    contador.setAttribute("aria-live", "polite");
    marco.append(contador);
    let indice = 0;
    let zoom = false;
    const miniaturas = [];

    function cambiarZoom(valor) {
      zoom = valor;
      ampliar.classList.toggle("is-zoomed", zoom);
      ampliar.setAttribute("aria-pressed", String(zoom));
      ampliar.setAttribute("aria-label", zoom ? "Reducir imagen" : "Ampliar imagen");
      principal.style.objectPosition = "50% 50%";
    }

    function mostrar(nuevoIndice) {
      indice = (nuevoIndice + fotos.length) % fotos.length;
      principal.src = fotos[indice].src;
      principal.alt = fotos[indice].alt;
      contador.textContent = `${indice + 1} / ${fotos.length}`;
      miniaturas.forEach((boton, posicion) => {
        boton.setAttribute("aria-pressed", String(posicion === indice));
      });
      cambiarZoom(false);
    }

    lista.replaceChildren();
    lista.className = "gallery-thumbnails";
    fotos.forEach((foto, posicion) => {
      const item = document.createElement("li");
      const boton = document.createElement("button");
      boton.type = "button";
      boton.setAttribute("aria-label", `Ver imagen ${posicion + 1}: ${foto.alt}`);
      const imagen = document.createElement("img");
      imagen.src = foto.src;
      imagen.alt = "";
      imagen.loading = "lazy";
      imagen.width = 120;
      imagen.height = 150;
      boton.append(imagen);
      boton.addEventListener("click", () => mostrar(posicion));
      miniaturas.push(boton);
      item.append(boton);
      lista.append(item);
    });

    [[-1, "Anterior", "\u2190"], [1, "Siguiente", "\u2192"]].forEach(([paso, nombre, simbolo]) => {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = `gallery-arrow ${paso < 0 ? "gallery-prev" : "gallery-next"}`;
      boton.textContent = simbolo;
      boton.setAttribute("aria-label", `${nombre} imagen`);
      boton.title = `${nombre} imagen`;
      boton.addEventListener("click", () => mostrar(indice + paso));
      marco.append(boton);
    });

    ampliar.addEventListener("click", () => cambiarZoom(!zoom));
    ampliar.addEventListener("pointermove", (evento) => {
      if (!zoom || evento.pointerType === "touch") return;
      const limites = ampliar.getBoundingClientRect();
      principal.style.objectPosition = `${(evento.clientX - limites.left) / limites.width * 100}% ${(evento.clientY - limites.top) / limites.height * 100}%`;
    });
    galeria.addEventListener("keydown", (evento) => {
      if (!["ArrowLeft", "ArrowRight", "Escape"].includes(evento.key)) return;
      evento.preventDefault();
      if (evento.key === "Escape") cambiarZoom(false);
      else mostrar(indice + (evento.key === "ArrowRight" ? 1 : -1));
    });
    mostrar(0);
  });
}

initCatalogo();
initGalerias();
renderCuenta();
initCuenta();
const guardadoInicial = leerCarrito();
if (guardadoInicial) pintarInsignia(guardadoInicial);
initCarrito();
initCheckout();
initPagos();
