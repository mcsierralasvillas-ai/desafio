# Desafío de las Presas · Motor Raid Sierra Las Villas

App web instalable (iPhone y Android) para la ruta del Motor Raid 2027 del Motorclub Sierra Las Villas.

- `index.html` · pantallas (Inicio, Ruta, Carnet, Info)
- `js/config.js` · **puntos de la ruta, fechas, teléfonos y URL del servidor** (lo único que se toca normalmente)
- `js/app.js` · funcionamiento (GPS, fotos, sellos, envío, mapa)
- `css/app.css` · diseño
- `sw.js` · funcionamiento sin conexión (subir `VERSION` en cada cambio)
- `herramientas/generar-ruta.html` · genera `ruta-trazado.json` con la ruta por carretera

Se publica con GitHub Pages (rama `main`, carpeta raíz).
El servidor (Google Apps Script) está fuera de este repositorio, en `servidor-google/Codigo.gs`.
