# Instrucción Maestra para Google AI Studio (o LLMs Avanzados): Clon SaaS KR36

Copia todo el texto a continuación y pégalo en tu IA de programación favorita (como Google AI Studio, Claude o ChatGPT) para generar tu plataforma.

---

**Rol:** Actúa como un Ingeniero de Software Full-Stack y Experto en UI/UX.

**Objetivo:** Desarrollar una Single Page Application (SPA) funcional en un único archivo `index.html` (usando HTML5, Tailwind CSS vía CDN, FontAwesome y Vanilla JavaScript avanzado) que replique un SaaS de catálogos online tipo "KR36.link".

## 1. Arquitectura de la Aplicación (SPA)
La aplicación debe manejar 3 vistas principales controladas por JavaScript (mostrando/ocultando contenedores `<section>`):
1.  **Modo Landing Page:** La página de ventas del SaaS.
2.  **Modo Dashboard (Admin):** El panel de control interno del vendedor.
3.  **Modo Catálogo en Vivo:** La tienda pública que verá el cliente final.

Debe existir un menú flotante discreto (solo para fines de desarrollo/demo) en la esquina inferior izquierda que permita alternar rápidamente entre estas 3 vistas.

## 2. Requerimientos del Dashboard (Panel de Administración Avanzado)
El Dashboard debe tener un diseño limpio tipo panel SaaS (sidebar a la izquierda y contenido a la derecha) y guardar todo en el `localStorage`. Debe incluir:

*   **Pestaña "Configuración de Tienda":** 
    *   Input para "Nombre del Negocio" y "Subdominio" (ej. mi-tienda.kr36.link).
    *   Textarea para "Descripción de la Biografía" (por defecto debe tener una advertencia para que el usuario la cambie y no deje textos de plantilla).
    *   Selector de Tema/Plantilla visual (Minimalista Claro, Minimalista Oscuro, Galaxia).
*   **Pestaña "Gestión de Inventario" (CRUD & Drag/Drop):**
    *   Una tabla o lista visual con los productos.
    *   **Drag and Drop:** Implementa la API nativa de HTML5 Drag & Drop para que el usuario pueda arrastrar las filas y cambiar el orden visual de los productos.
    *   Formulario manual para añadir un producto (Nombre, Precio Actual, Precio Tachado, Categoría, Descripción).
*   **Módulo "Importación Mágica con IA" (Simulación):**
    *   Un modal con un gran `<textarea>`. El usuario pegará texto libre ahí (ej: "1. Reloj de Oro - $200.000\n2. Reloj de Plata - $100.000").
    *   Al hacer clic en "Procesar", crea una función en JavaScript que divida el texto por saltos de línea e intente extraer nombres y precios (con un Regex básico) para añadirlos automáticamente al inventario, simulando el comportamiento mágico del SaaS.

## 3. Especificaciones del Catálogo en Vivo (El Producto Final)
La vista de catálogo debe inyectar el diseño dinámicamente basado en la configuración del Dashboard y los productos del `localStorage`. 
*   **Optimizaciones CRO (Fricción Cero):** Todos los productos deben mostrar el Precio Actual destacado y el "Precio de Anclaje" (precio original) tachado y en gris.
*   **Lógica de Carrito a WhatsApp:** Cada producto debe tener un botón "Añadir". Al agregar productos, aparece un botón flotante global "Ver Pedido ($XXX)".
*   **Checkout Conversacional:** Al darle comprar al carrito, usa JavaScript para codificar la URL (`encodeURIComponent`) y abrir WhatsApp (`https://wa.me/?text=...`) con un mensaje estructurado: "Hola, quiero pedir: [Cantidades y Nombres]. Total: $XXX".

## 4. Carga Inicial de Datos (Caso: Auren Time)
Si el `localStorage` está vacío al cargar la app por primera vez, inicialízalo con esta información por defecto:
*   **Nombre Tienda:** Auren Time (Etiqueta PRO activada).
*   **Descripción:** "Aquí va la descripción de tu negocio. Los botones de las redes actualmente tienen las redes de KR..." (replicando el error real para mostrar cómo funciona el texto base).
*   **Inventario (Inyecta este JSON):**

```json
[
  { "id": 1, "categoria": "Caballero", "nombre": "Reloj Urban Graphite Acero Pavonado Mate", "precioActual": 175000, "precioAnterior": 240000, "descripcion": "Acabado militar en gris titanio mate con esfera multicapa de alta legibilidad y cristal con tratamiento antirreflejo" },
  { "id": 2, "categoria": "Dama", "nombre": "Reloj Petite Diamant Pulsera de Eslabones", "precioActual": 128000, "precioAnterior": 175000, "descripcion": "Caja compacta de 28mm ideal para muñecas finas con dial satinado y cuatro puntos de diamante en hora clave" },
  { "id": 3, "categoria": "Dama", "nombre": "Reloj Milano Minimalist Dial Champagne", "precioActual": 119000, "precioAnterior": 165000, "descripcion": "Esfera monocromática champagne con acabado rayos de sol, caja esbelta en acero y correa milanesa dorada" },
  { "id": 4, "categoria": "Caballero", "nombre": "Reloj Imperial Skeleton Maquinaria Visible", "precioActual": 245000, "precioAnterior": 330000, "descripcion": "Movimiento mecánico automático con puente esqueleto expuesto, volante rítmico visible y fondo de cristal transparente" },
  { "id": 5, "categoria": "Caballero", "nombre": "Reloj Classic Black Cuero Genuino Negro", "precioActual": 140000, "precioAnterior": 190000, "descripcion": "Diseño formal sobrio con caja delgada en acero pulido, dial negro azabache y pulso de piel con costura reforzada" },
  { "id": 6, "categoria": "Dama", "nombre": "Reloj Siena Gold con Circones Facetados", "precioActual": 145000, "precioAnterior": 195000, "descripcion": "Bisel con incrustaciones de circones suizos de alto brillo, caja dorada de 34mm y movimiento de cuarzo japonés" },
  { "id": 7, "categoria": "Dama", "nombre": "Reloj Aurora Rose Gold Malla Milanesa", "precioActual": 135000, "precioAnterior": 185000, "descripcion": "Reloj femenino ultra delgado con caja en oro rosa, esfera pulida y correa ajustable en malla milanesa transpirable" },
  { "id": 8, "categoria": "Dama", "nombre": "Reloj Royal Grace Bicolor Oro y Plata", "precioActual": 155000, "precioAnterior": 210000, "descripcion": "Brazalete jubileo en acero inoxidable de dos tonos, bisel estriado clásico y fechador con lupa de aumento" },
  { "id": 9, "categoria": "Caballero", "nombre": "Reloj Executive Steel Silver Cronógrafo", "precioActual": 185000, "precioAnterior": 250000, "descripcion": "Cronógrafo funcional de 3 subdiales en acero macizo 316L, taquímetro exterior y agujas luminiscentes nocturnas" },
  { "id": 10, "categoria": "Caballero", "nombre": "Reloj Monaco Gold Esfera Verde Esmeralda", "precioActual": 210000, "precioAnterior": 285000, "descripcion": "Combinación de lujo entre caja bañada en oro de 18k y dial verde sol con fechador e índices dorados aplicados" }
]
```

## 5. Reglas Estrictas de Entrega
*   NO separes el código. Debes entregar UN ÚNICO bloque de código con todo el HTML, y dentro sus etiquetas `<style>` y `<script>`.
*   Diseño "App-like": Usa esquinas muy redondeadas, sombras fluidas, y asegúrate de que el diseño se vea perfecto en móvil.
*   En el código JavaScript final, incluye comentarios explicativos en las secciones críticas (Renderizado, Carrito y LocalStorage).