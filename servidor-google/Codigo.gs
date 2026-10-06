/* =========================================================================
   SERVIDOR DE LA APP DEL MOTORCLUB SIERRA LAS VILLAS (Google Apps Script)
   Inscripciones del Raid + sellos del Desafío de las Presas
   -------------------------------------------------------------------------
   Qué hace:
     - Recibe las solicitudes de inscripción al Raid (hoja "Solicitudes"),
       crea el pago en Stripe (tarjeta, Apple Pay, Google Pay, Bizum) y,
       SOLO cuando el pago se completa, da un número y la pasa a la hoja
       "Inscritos" (que es la lista válida y se puede bajar a Excel).
     - Recibe el registro de cada participante y lo apunta en la hoja
       "Participantes".
     - Recibe cada sello (foto + hora + posición), guarda la foto en Google
       Drive (una carpeta por participante) y lo apunta en la hoja "Sellos".
     - Cuando alguien completa todos los sellos, envía un correo al club.

   Cómo instalarlo: ver GUIA.html, paso 2.
   ========================================================================= */

// ------------------ CONFIGURA ESTO ------------------
var AJUSTES = {
  // Correo(s) del club que reciben el aviso. Varios separados por coma.
  CORREO_CLUB: 'mcsierralasvillas@gmail.com',
  NOMBRE_EVENTO: 'Desafío de las Presas 2027',
  CARPETA_FOTOS: 'Desafío de las Presas 2027 - Fotos',
  // Adjuntar las fotos al correo del club (si no, solo van los enlaces)
  ADJUNTAR_FOTOS: true,
  // Enviar también un correo de enhorabuena al participante (si dejó email).
  // Ojo: una cuenta Gmail normal puede enviar unos 100 correos al día.
  CORREO_AL_PARTICIPANTE: false,
  // Avisar al club por correo de cada inscripción PAGADA
  AVISAR_INSCRIPCIONES: true,
  // Enviar al inscrito un correo de confirmación con su número
  CONFIRMAR_AL_INSCRITO: true,
  // Dirección de la app (para volver después de pagar)
  URL_APP: 'https://mcsierralasvillas-ai.github.io/desafio/',
  // RUTA SECRETA: los puntos están en la pestaña "Ruta" de esta hoja.
  // La app solo los recibe un CONDUCTOR inscrito y pagado, y solo desde esta fecha:
  DESBLOQUEO_RUTA: '2027-05-07T18:00:00+02:00',   // viernes 7 de mayo, 18:00
  // Desde cuándo se pueden hacer las fotos de sellado:
  INICIO_SELLADO: '2027-05-08T05:00:00+02:00'     // sábado 8 de mayo, 05:00
};

// PRECIOS (en euros). Deben coincidir con js/config.js de la app.
var PRECIOS = { PILOTO: 25, ACOMPANANTE: 20, CENA: 20 };

// Lo que entrega el club (debe coincidir con "pack" en js/config.js de la app)
var PACK = {
  PILOTO: ['Camiseta del evento', 'Dorsal del evento', 'Bordado del evento', 'Consumición (cerveza o refresco)', 'Diploma de finalización', 'Papeleta para el sorteo'],
  ACOMPANANTE: ['Camiseta del evento', 'Consumición (cerveza o refresco)', 'Diploma de finalización'],
  RECOGIDA: 'Se recoge en la KDD del viernes en el Paseo de Santo Cristo (Villacarrillo).'
};
var WHATSAPP_GRUPO = 'https://chat.whatsapp.com/CrY3hwgnqv37nSewdxEGBx?mode=gi_t';

// La clave secreta de Stripe NO se escribe aquí: se guarda en
// Configuración del proyecto → Propiedades del script → STRIPE_SECRET
// (sk_test_... para pruebas, sk_live_... para cobrar de verdad).
// ----------------------------------------------------

var COLS_PART = ['Dorsal', 'Nombre', 'Teléfono', 'Email', 'Alta', 'Sellos', 'Completado', 'Hora completado', 'Aviso enviado', 'Carpeta de fotos'];
// Columnas de "Solicitudes" (todas, pagadas o no)
var COLS_SOL = ['Id solicitud', 'Fecha', 'Estado', 'Nombre', 'Apellidos', 'DNI', 'Teléfono', 'Email', 'Localidad', 'Moto', 'Talla',
  'Acompañante', 'Nombre acompañante', 'DNI acompañante', 'Talla acompañante', 'Cena piloto', 'Cena acompañante', 'Importe (€)',
  'Método de pago', 'Id sesión Stripe', 'Nº inscripción', 'Condiciones aceptadas', 'Id app',
  'Matrícula', 'Teléfono acompañante'];   // columnas nuevas siempre al final
var S = {}; COLS_SOL.forEach(function (c, i) { S[c] = i; });
// Columnas de "Inscritos" (solo pagados = inscripciones válidas)
var COLS_INSC = ['Nº / Dorsal', 'Fecha de pago', 'Nombre', 'Apellidos', 'DNI', 'Teléfono', 'Email', 'Localidad', 'Moto', 'Talla',
  'Acompañante', 'Nombre acompañante', 'DNI acompañante', 'Talla acompañante', 'Cena piloto', 'Cena acompañante', 'Personas en la cena',
  'Importe pagado (€)', 'Método de pago', 'Id solicitud', 'Matrícula', 'Teléfono acompañante'];
// Pestaña "Ruta": una fila por parada. Tipo = SALIDA, PUNTO o LLEGADA (en ese orden).
var COLS_RUTA = ['Tipo', 'Id (sin espacios)', 'Nombre', 'Lugar', 'Latitud', 'Longitud', 'Pista para la foto', 'Enlace Google Maps del tramo (opcional)'];
// La ruta REAL no se escribe aquí (este archivo está en GitHub y es público).
// Va en el archivo RutaPrivada.gs (solo en Apps Script, nunca en GitHub) o
// directamente en la pestaña "Ruta" de la hoja. Esto es solo un ejemplo.
var RUTA_EJEMPLO = [
  ['SALIDA', 'salida', 'Punto de salida', 'Villacarrillo (Jaén)', 38.1196247, -3.0786158, '', ''],
  ['PUNTO', 'punto1', 'Punto 1 (ejemplo)', 'Rellenar en la hoja', 38.13333, -2.78333, '', ''],
  ['LLEGADA', 'llegada', 'Llegada', 'Villacarrillo (Jaén)', 38.1196247, -3.0786158, '', '']
];
var COLS_SELLO = ['Recibido', 'Dorsal', 'Nombre', 'Orden', 'Punto', 'Hora de la foto', 'Distancia al punto (m)', 'Precisión GPS (m)', 'Sin GPS', 'Simulado (prueba)', 'Foto', 'Ubicación', 'Id punto'];

function doGet() {
  return responder({ ok: true, mensaje: 'Servidor del ' + AJUSTES.NOMBRE_EVENTO + ' funcionando' });
}

function doPost(e) {
  var cerrojo = LockService.getScriptLock();
  cerrojo.waitLock(30000); // evita que dos envíos a la vez se pisen
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.accion === 'inscripcion') return responder(solicitar(d));
    if (d.accion === 'estadoPago') return responder(estadoPago(d));
    if (d.accion === 'acceso') return responder(acceso(d));
    if (d.accion === 'ruta') return responder(rutaParaConductor(d));
    if (!d.dorsal || !d.nombre) return responder({ ok: false, error: 'Faltan nombre o dorsal' });
    d.dorsal = String(d.dorsal).trim().toUpperCase();
    if (d.accion === 'registro') return responder(registrar(d));
    if (d.accion === 'sello') return responder(sellar(d));
    return responder({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    console.error(err);
    return responder({ ok: false, error: String(err) });
  } finally {
    cerrojo.releaseLock();
  }
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ------------------ Hojas ------------------
function hoja(nombre, cabeceras) {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var h = libro.getSheetByName(nombre);
  if (!h) {
    h = libro.insertSheet(nombre);
    h.appendRow(cabeceras);
    h.setFrozenRows(1);
    h.getRange(1, 1, 1, cabeceras.length).setFontWeight('bold').setBackground('#d7261e').setFontColor('#ffffff');
  } else if (h.getLastColumn() < cabeceras.length) {
    // La hoja ya existía con menos columnas: añade las cabeceras nuevas al final
    var desde = h.getLastColumn() + 1, nuevas = cabeceras.slice(desde - 1);
    h.getRange(1, desde, 1, nuevas.length).setValues([nuevas]).setFontWeight('bold').setBackground('#d7261e').setFontColor('#ffffff');
  }
  return h;
}

function filaParticipante(dorsal) {
  var h = hoja('Participantes', COLS_PART);
  var datos = h.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).toUpperCase() === dorsal) return { hoja: h, fila: i + 1, valores: datos[i] };
  }
  return { hoja: h, fila: 0, valores: null };
}

function registrar(d) {
  var p = filaParticipante(d.dorsal);
  var valores = [d.dorsal, d.nombre, d.telefono || '', d.email || '', new Date()];
  if (p.fila) {
    p.hoja.getRange(p.fila, 1, 1, 4).setValues([valores.slice(0, 4)]);
  } else {
    p.hoja.appendRow(valores.concat([0, '', '', '', '']));
  }
  return { ok: true };
}

// ------------------ Inscripciones y pagos ------------------
function telValido(t) {
  var s = String(t || '').replace(/[\s.\-()]/g, '');
  return /^[6789]\d{8}$/.test(s) || /^(\+|00)\d{8,15}$/.test(s);
}
function normalizarDni(t) { return String(t || '').toUpperCase().replace(/[^0-9A-Z]/g, ''); }
function dniValido(t) {
  var d = normalizarDni(t);
  if (!/^(\d{8}|[XYZ]\d{7})[A-Z]$/.test(d)) return false;   // DNI: 8 cifras + letra · NIE: X/Y/Z + 7 cifras + letra
  var num = d.replace(/^X/, '0').replace(/^Y/, '1').replace(/^Z/, '2').slice(0, -1);
  return 'TRWAGMYFPDXBNJZSQVHLCKE'.charAt(parseInt(num, 10) % 23) === d.slice(-1);
}
function hojaSol() { return hoja('Solicitudes', COLS_SOL); }
function hojaInsc() { return hoja('Inscritos', COLS_INSC); }
function si(v) { return v === true || v === 'SÍ'; }

/** Importe calculado en el servidor (no nos fiamos del móvil) */
function lineas(d) {
  var l = [['Inscripción piloto', PRECIOS.PILOTO]];
  if (d.conAcompanante) l.push(['Inscripción acompañante', PRECIOS.ACOMPANANTE]);
  var n = (d.cenaPiloto ? 1 : 0) + (d.conAcompanante && d.cenaAcomp ? 1 : 0);
  if (n) l.push(['Gran cena de recepción (' + n + ' pers.)', n * PRECIOS.CENA]);
  return l;
}

/** Busca un DNI (del piloto o del acompañante) entre los INSCRITOS (pagados) */
function buscarInscrito(dni) {
  var datos = hojaInsc().getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (normalizarDni(datos[i][4]) === dni || normalizarDni(datos[i][12]) === dni) return { fila: i + 1, v: datos[i] };
  }
  return null;
}
function buscarSolicitud(id) {
  var h = hojaSol(), datos = h.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) if (String(datos[i][S['Id solicitud']]) === String(id)) return { hoja: h, fila: i + 1, v: datos[i] };
  return null;
}

/** Nueva solicitud (o reintento de pago de una existente) */
function solicitar(d) {
  var dni = normalizarDni(d.dni), dniA = normalizarDni(d.acompDni);
  if (!d.nombre || !d.apellidos || !d.telefono || !d.email || !d.localidad || !d.moto || !d.matricula || !d.talla) return { ok: false, error: 'Faltan datos del piloto' };
  if (!telValido(d.telefono)) return { ok: false, error: 'El teléfono del piloto no es válido' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(d.email).trim())) return { ok: false, error: 'El correo no es válido' };
  if (d.conAcompanante && (!d.acompNombre || !d.acompTalla || !telValido(d.acompTelefono))) return { ok: false, error: 'Faltan datos del acompañante' };
  if (!dniValido(dni)) return { ok: false, error: 'El DNI del piloto no es válido' };
  if (d.conAcompanante && !dniValido(dniA)) return { ok: false, error: 'El DNI del acompañante no es válido' };
  if (!d.aceptaCondiciones) return { ok: false, error: 'Hay que aceptar las condiciones' };
  var ya = buscarInscrito(dni) || (d.conAcompanante ? buscarInscrito(dniA) : null);
  if (ya) return { ok: false, error: 'Ese DNI ya está inscrito (Nº ' + ya.v[0] + '). Contacta con el club si hay un error.' };

  var total = lineas(d).reduce(function (t, x) { return t + x[1]; }, 0);
  var sol = null;
  // Reintento desde el mismo móvil: reutilizamos la solicitud
  var datos = hojaSol().getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) if (String(datos[i][S['Id app']]) === String(d.idLocal)) sol = { fila: i + 1, v: datos[i] };
  var h = hojaSol(), id;
  if (sol) {
    id = sol.v[S['Id solicitud']];
    if (sol.v[S['Estado']] === 'PAGADA') return { ok: true, idSolicitud: id, estado: 'pagada', numero: sol.v[S['Nº inscripción']], total: total };
  } else {
    id = 'S' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10);
    h.appendRow([id, new Date(), 'PENDIENTE DE PAGO', d.nombre, d.apellidos, dni, d.telefono, d.email, d.localidad || '', d.moto || '', d.talla || '',
      d.conAcompanante ? 'SÍ' : 'NO', d.acompNombre || '', dniA, d.acompTalla || '', d.cenaPiloto ? 'SÍ' : 'NO', (d.conAcompanante && d.cenaAcomp) ? 'SÍ' : 'NO',
      total, '', '', '', d.aceptaCondiciones, d.idLocal || '',
      String(d.matricula || '').toUpperCase(), d.conAcompanante ? (d.acompTelefono || '') : '']);
    sol = buscarSolicitud(id);
  }
  var url = null;
  if (claveStripe()) {
    var sesion = crearSesionStripe(id, d, (d.urlApp || AJUSTES.URL_APP));
    url = sesion.url;
    h.getRange(sol.fila, S['Id sesión Stripe'] + 1).setValue(sesion.id);
  }
  return { ok: true, idSolicitud: id, estado: 'pendiente', urlPago: url, total: total };
}

/** La app pregunta si ya se ha pagado */
function estadoPago(d) {
  var sol = buscarSolicitud(d.idSolicitud);
  if (!sol) return { ok: false, error: 'Solicitud no encontrada' };
  if (sol.v[S['Estado']] === 'PAGADA') return { ok: true, estado: 'pagada', numero: sol.v[S['Nº inscripción']] };
  var sid = sol.v[S['Id sesión Stripe']];
  if (sid && claveStripe()) {
    var ses = stripe('get', 'checkout/sessions/' + sid + '?expand[]=payment_intent.payment_method');
    if (ses.payment_status === 'paid') {
      var metodo = 'Stripe';
      try { metodo = ses.payment_intent.payment_method.type; if (ses.payment_intent.payment_method.card && ses.payment_intent.payment_method.card.wallet) metodo = ses.payment_intent.payment_method.card.wallet.type; } catch (e) {}
      var n = confirmarPago(sol, metodo);
      return { ok: true, estado: 'pagada', numero: n };
    }
  }
  return { ok: true, estado: 'pendiente' };
}

/** Pasa una solicitud a INSCRITOS con su número. Devuelve el número. */
function confirmarPago(sol, metodo) {
  var v = sol.v, h = sol.hoja || hojaSol();
  if (v[S['Estado']] === 'PAGADA' && v[S['Nº inscripción']]) return v[S['Nº inscripción']];
  var hi = hojaInsc();
  var numero = hi.getLastRow(); // fila 1 = cabecera → el primero es el Nº 1
  var personasCena = (si(v[S['Cena piloto']]) ? 1 : 0) + (si(v[S['Cena acompañante']]) ? 1 : 0);
  hi.appendRow([numero, new Date(), v[S['Nombre']], v[S['Apellidos']], v[S['DNI']], v[S['Teléfono']], v[S['Email']], v[S['Localidad']], v[S['Moto']], v[S['Talla']],
    v[S['Acompañante']], v[S['Nombre acompañante']], v[S['DNI acompañante']], v[S['Talla acompañante']], v[S['Cena piloto']], v[S['Cena acompañante']], personasCena,
    v[S['Importe (€)']], metodo, v[S['Id solicitud']], v[S['Matrícula']] || '', v[S['Teléfono acompañante']] || '']);
  h.getRange(sol.fila, S['Estado'] + 1).setValue('PAGADA');
  h.getRange(sol.fila, S['Método de pago'] + 1).setValue(metodo);
  h.getRange(sol.fila, S['Nº inscripción'] + 1).setValue(numero);
  h.getRange(sol.fila, 1, 1, COLS_SOL.length).setBackground('#d9f7e6');
  avisarInscripcion(v, numero, personasCena, metodo);
  return numero;
}

/** Correo de enhorabuena al inscrito, con todos sus datos y lo pagado */
function correoConfirmacion(v, numero, personasCena, metodo) {
  var rojo = '#e3060b', amarillo = '#ffd400';
  var dorsal = ('00' + numero).slice(-3);
  var conA = si(v[S['Acompañante']]);
  var l = lineas({ conAcompanante: conA, cenaPiloto: si(v[S['Cena piloto']]), cenaAcomp: si(v[S['Cena acompañante']]) });
  var fila = function (k, val) { return '<tr><td style="padding:6px 10px;color:#666;border-bottom:1px solid #eee">' + k + '</td><td style="padding:6px 10px;font-weight:bold;border-bottom:1px solid #eee">' + limpiar(val) + '</td></tr>'; };
  var tabla = function (filas) { return '<table style="width:100%;border-collapse:collapse;font-size:15px">' + filas.join('') + '</table>'; };
  var titulo = function (t) { return '<h3 style="margin:24px 0 8px;color:' + rojo + ';text-transform:uppercase;font-size:17px">' + t + '</h3>'; };
  var lista = function (arr) { return '<ul style="margin:6px 0;padding-left:20px">' + arr.map(function (x) { return '<li style="margin:3px 0">' + limpiar(x) + '</li>'; }).join('') + '</ul>'; };
  var nombreMetodo = ({ apple_pay: 'Apple Pay', google_pay: 'Google Pay', card: 'Tarjeta', bizum: 'Bizum' })[metodo] || metodo;

  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#111">' +
    '<div style="background:#0b0b0b;padding:20px;text-align:center;border-bottom:6px solid ' + rojo + '">' +
      '<img src="' + AJUSTES.URL_APP + 'icons/logo.png" alt="Motorclub Sierra Las Villas" style="width:220px;max-width:80%">' +
    '</div>' +
    '<div style="background:' + amarillo + ';padding:6px;text-align:center;font-weight:bold;letter-spacing:1px">MOTOR RAID SIERRA LAS VILLAS 2027</div>' +
    '<div style="padding:22px">' +
      '<h2 style="margin:0 0 6px;color:' + rojo + ';font-size:26px">¡Enhorabuena, ' + limpiar(v[S['Nombre']]) + '!</h2>' +
      '<p style="font-size:16px;margin:0 0 16px">Ya estás inscrito en el <b>Motor Raid Sierra Las Villas 2027</b> del <b>Motorclub Sierra Las Villas</b>. Tu inscripción está pagada y confirmada.</p>' +
      '<div style="text-align:center;margin:18px 0"><div style="display:inline-block;border:4px solid ' + rojo + ';border-radius:8px;padding:8px 26px;background:#fff">' +
        '<div style="color:' + rojo + ';font-weight:bold;font-size:13px;letter-spacing:2px">DORSAL</div><div style="font-size:48px;font-weight:bold;line-height:1">' + dorsal + '</div></div></div>' +
      titulo('Piloto') + tabla([
        fila('Nombre', v[S['Nombre']] + ' ' + v[S['Apellidos']]), fila('DNI', v[S['DNI']]), fila('Teléfono', v[S['Teléfono']]),
        fila('Correo', v[S['Email']]), fila('Localidad', v[S['Localidad']] || '—'), fila('Moto', v[S['Moto']] || '—'), fila('Matrícula', v[S['Matrícula']] || '—'),
        fila('Talla de camiseta', v[S['Talla']] || '—'), fila('Cena de recepción', si(v[S['Cena piloto']]) ? 'Sí' : 'No')]) +
      titulo('Acompañante') + (conA ? tabla([
        fila('Nombre', v[S['Nombre acompañante']]), fila('DNI', v[S['DNI acompañante']]), fila('Teléfono', v[S['Teléfono acompañante']] || '—'), fila('Talla de camiseta', v[S['Talla acompañante']] || '—'),
        fila('Cena de recepción', si(v[S['Cena acompañante']]) ? 'Sí' : 'No')]) : '<p>Sin acompañante.</p>') +
      titulo('Pago') + tabla(l.map(function (x) { return fila(x[0], x[1] + ' €'); }).concat([
        '<tr><td style="padding:10px;font-weight:bold;font-size:17px">TOTAL PAGADO</td><td style="padding:10px;font-weight:bold;font-size:20px;color:' + rojo + '">' + limpiar(v[S['Importe (€)']]) + ' €</td></tr>',
        fila('Forma de pago', nombreMetodo || '—')])) +
      (personasCena ? titulo('Gran cena de recepción') + '<p><b>' + personasCena + (personasCena > 1 ? ' personas apuntadas' : ' persona apuntada') + '</b>. Menú cerrado. Os avisaremos del lugar próximamente.</p>' : '') +
      titulo('Lo que te entrega el club') + '<p style="margin:4px 0;font-weight:bold">Pack del piloto</p>' + lista(PACK.PILOTO) +
      (conA ? '<p style="margin:10px 0 4px;font-weight:bold">Pack del acompañante</p>' + lista(PACK.ACOMPANANTE) : '') +
      '<p style="color:#666">' + PACK.RECOGIDA + '</p>' +
      titulo('Próximos pasos') + lista([
        'Instala la app del club en tu móvil: ' + AJUSTES.URL_APP,
        'El día del Raid entra en Raid 2027 → Ruta con tu DNI (el del conductor).',
        'Antes de salir, descarga la zona de la sierra en Google Maps sin conexión.']) +
      '<p style="text-align:center;margin:22px 0"><a href="' + WHATSAPP_GRUPO + '" style="background:#1fa855;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:6px;display:inline-block">Únete al grupo de WhatsApp del evento</a></p>' +
    '</div>' +
    '<div style="background:#0b0b0b;color:' + amarillo + ';padding:14px;text-align:center;font-size:13px">Motorclub Sierra Las Villas · Villacarrillo (Jaén)<br><span style="color:#ccc">Gasolina, compañerismo y pasión por las motos · ' + limpiar(AJUSTES.CORREO_CLUB) + '</span></div>' +
  '</div>';
}

function avisarInscripcion(v, numero, personasCena, metodo) {
  var quien = v[S['Nombre']] + ' ' + v[S['Apellidos']];
  if (AJUSTES.AVISAR_INSCRIPCIONES && MailApp.getRemainingDailyQuota() > 5) {
    MailApp.sendEmail({
      to: AJUSTES.CORREO_CLUB,
      subject: '✅ Inscripción pagada Nº ' + numero + ': ' + quien,
      htmlBody: '<p><b>' + limpiar(quien) + '</b> · DNI ' + limpiar(v[S['DNI']]) + ' · ' + limpiar(v[S['Teléfono']]) + ' · ' + limpiar(v[S['Email']]) + '</p>' +
        '<p>Moto: ' + limpiar(v[S['Moto']]) + ' · Matrícula ' + limpiar(v[S['Matrícula']] || '—') + ' · Talla ' + limpiar(v[S['Talla']]) +
        (si(v[S['Acompañante']]) ? '<br>Acompañante: ' + limpiar(v[S['Nombre acompañante']]) + ' · DNI ' + limpiar(v[S['DNI acompañante']]) + ' · Tel. ' + limpiar(v[S['Teléfono acompañante']] || '—') + ' · Talla ' + limpiar(v[S['Talla acompañante']]) : '') +
        '<br>Cena de recepción: ' + personasCena + ' persona(s)</p><p>Pagado: <b>' + limpiar(v[S['Importe (€)']]) + ' €</b> (' + limpiar(metodo) + ')</p>',
      name: 'App Motorclub Sierra Las Villas'
    });
  }
  if (AJUSTES.CONFIRMAR_AL_INSCRITO && v[S['Email']] && MailApp.getRemainingDailyQuota() > 5) {
    MailApp.sendEmail({
      to: v[S['Email']],
      subject: '🏍️ ¡Enhorabuena! Estás inscrito en el Motor Raid Sierra Las Villas 2027 · Dorsal ' + ('00' + numero).slice(-3),
      htmlBody: correoConfirmacion(v, numero, personasCena, metodo),
      name: 'Motorclub Sierra Las Villas'
    });
  }
}

/** La app pregunta si un DNI puede entrar en la ruta: solo INSCRITOS (pagados).
    La app solo deja entrar al CONDUCTOR (si es el DNI del acompañante lo indica y lo bloquea). Para inscribir a alguien a mano
    (p. ej. en la KDD), basta con añadir una fila en "Inscritos" con Nº y DNI. */
function acceso(d) {
  var dni = normalizarDni(d.dni);
  if (!dni) return { ok: false, error: 'Falta el DNI' };
  var r = buscarInscrito(dni);
  if (!r) return { ok: true, encontrado: false };
  var v = r.v, esAcomp = normalizarDni(v[12]) === dni;
  var fecha = v[1] instanceof Date ? Utilities.formatDate(v[1], 'Europe/Madrid', 'dd/MM/yyyy HH:mm') : String(v[1] || '');
  return {
    ok: true, encontrado: true, numero: v[0], esAcompanante: esAcomp,
    desbloqueoRuta: AJUSTES.DESBLOQUEO_RUTA, inicioSellado: AJUSTES.INICIO_SELLADO,
    nombre: esAcomp ? String(v[11]) : (v[2] + ' ' + v[3]).trim(), telefono: String(v[5] || ''),
    moto: String(v[8] || ''), acompanante: esAcomp ? '' : String(v[11] || ''),
    // Datos completos para el apartado "Mi inscripción" de la app
    detalle: {
      piloto: (v[2] + ' ' + v[3]).trim(), dni: String(v[4] || ''), telefono: String(v[5] || ''), email: String(v[6] || ''),
      localidad: String(v[7] || ''), moto: String(v[8] || ''), matricula: String(v[20] || ''), talla: String(v[9] || ''),
      conAcompanante: si(v[10]), acompNombre: String(v[11] || ''), acompDni: String(v[12] || ''), acompTelefono: String(v[21] || ''), acompTalla: String(v[13] || ''),
      cenaPiloto: si(v[14]), cenaAcomp: si(v[15]), personasCena: Number(v[16]) || 0,
      importe: Number(v[17]) || 0, metodo: String(v[18] || ''), fechaPago: fecha
    }
  };
}

// ------------------ Ruta secreta ------------------
function hojaRuta() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var h = libro.getSheetByName('Ruta');
  if (!h) {
    h = hoja('Ruta', COLS_RUTA);
    var filas = (typeof RUTA_PRIVADA !== 'undefined') ? RUTA_PRIVADA : RUTA_EJEMPLO;
    filas.forEach(function (f) { h.appendRow(f); });
  }
  return h;
}
function leerRuta() {
  var filas = hojaRuta().getDataRange().getValues().slice(1);
  var ruta = { salida: null, puntos: [], llegada: null };
  filas.forEach(function (f) {
    var tipo = String(f[0]).trim().toUpperCase();
    if (!tipo || f[4] === '' || f[5] === '') return;
    var p = { id: String(f[1] || '').trim() || ('p' + (ruta.puntos.length + 1)), nombre: String(f[2]), lugar: String(f[3] || ''),
      lat: Number(f[4]), lng: Number(f[5]), pista: String(f[6] || '') };
    if (f[7]) p.enlaceMaps = String(f[7]).trim();
    if (tipo === 'SALIDA') ruta.salida = p; else if (tipo === 'LLEGADA') ruta.llegada = p; else ruta.puntos.push(p);
  });
  if (!ruta.llegada) ruta.llegada = ruta.salida;
  return ruta;
}
/** Entrega la ruta SOLO a un conductor inscrito y pagado, y SOLO desde DESBLOQUEO_RUTA */
function rutaParaConductor(d) {
  var dni = normalizarDni(d.dni);
  var r = dni ? buscarInscrito(dni) : null;
  if (!r) return { ok: false, error: 'No inscrito' };
  if (normalizarDni(r.v[12]) === dni) return { ok: false, error: 'Solo el conductor puede descargar la ruta' };
  var horarios = { desbloqueoRuta: AJUSTES.DESBLOQUEO_RUTA, inicioSellado: AJUSTES.INICIO_SELLADO };
  if (new Date() < new Date(AJUSTES.DESBLOQUEO_RUTA)) { horarios.ok = true; horarios.bloqueada = true; return horarios; }
  horarios.ok = true; horarios.ruta = leerRuta();
  return horarios;
}

// ------------------ Stripe ------------------
function claveStripe() { return PropertiesService.getScriptProperties().getProperty('STRIPE_SECRET'); }
function stripe(metodo, ruta, datos) {
  var r = UrlFetchApp.fetch('https://api.stripe.com/v1/' + ruta, {
    method: metodo, payload: datos, muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + claveStripe() }
  });
  var j = JSON.parse(r.getContentText());
  if (j.error) throw new Error('Stripe: ' + j.error.message);
  return j;
}
function crearSesionStripe(id, d, urlApp) {
  var p = {
    mode: 'payment', locale: 'es', client_reference_id: id, customer_email: d.email,
    success_url: urlApp + '?pago=ok#inscripcion',
    cancel_url: urlApp + '?pago=cancelado#inscripcion',
    'metadata[solicitud]': id, 'metadata[dni]': normalizarDni(d.dni),
    'payment_intent_data[description]': 'Motor Raid Sierra Las Villas · ' + d.nombre + ' ' + d.apellidos
  };
  lineas(d).forEach(function (x, i) {
    p['line_items[' + i + '][quantity]'] = 1;
    p['line_items[' + i + '][price_data][currency]'] = 'eur';
    p['line_items[' + i + '][price_data][unit_amount]'] = Math.round(x[1] * 100);
    p['line_items[' + i + '][price_data][product_data][name]'] = x[0];
  });
  // Los métodos (tarjeta, Apple Pay, Google Pay, Bizum) se activan en el panel de Stripe.
  return stripe('post', 'checkout/sessions', p);
}

/** Revisa los pagos pendientes (por si alguien paga y cierra la app sin volver).
    Se ejecuta sola cada 10 minutos tras ejecutar una vez activarRevisionAutomatica(). */
function revisarPagosPendientes() {
  if (!claveStripe()) return;
  var h = hojaSol(), datos = h.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (datos[i][S['Estado']] === 'PENDIENTE DE PAGO' && datos[i][S['Id sesión Stripe']]) {
      try { estadoPago({ idSolicitud: datos[i][S['Id solicitud']] }); } catch (e) { console.warn(e); }
    }
  }
}
function activarRevisionAutomatica() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'revisarPagosPendientes') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('revisarPagosPendientes').timeBased().everyMinutes(10).create();
  Logger.log('Revisión automática de pagos activada (cada 10 minutos).');
}

// ------------------ Menú en la hoja de cálculo ------------------
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🏍️ Motorclub')
    .addItem('Revisar pagos con tarjeta/Bizum ahora', 'revisarPagosPendientes')
    .addItem('Confirmar pagos manuales (Estado = PAGADA)', 'confirmarPagosManuales')
    .addSeparator()
    .addItem('Enviarme el Excel de inscritos por correo', 'enviarExcelInscritos')
    .addToUi();
}
/** Para pagos por Bizum/transferencia fuera de la app: cambia el Estado de la
    solicitud a PAGADA (en mayúsculas) y ejecuta esto desde el menú. */
function confirmarPagosManuales() {
  var h = hojaSol(), datos = h.getDataRange().getValues(), n = 0;
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][S['Estado']]).trim().toUpperCase() === 'PAGADA' && !datos[i][S['Nº inscripción']]) {
      datos[i][S['Estado']] = 'PENDIENTE';
      confirmarPago({ hoja: h, fila: i + 1, v: datos[i] }, datos[i][S['Método de pago']] || 'Manual'); n++;
    }
  }
  SpreadsheetApp.getUi().alert(n + ' inscripción(es) confirmada(s).');
}
/** Envía al correo del club la hoja "Inscritos" como archivo Excel (.xlsx) */
function enviarExcelInscritos() {
  var libro = SpreadsheetApp.getActiveSpreadsheet(), hi = hojaInsc();
  var url = 'https://docs.google.com/spreadsheets/d/' + libro.getId() + '/export?format=xlsx&gid=' + hi.getSheetId();
  var blob = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob()
    .setName('Inscritos Motor Raid ' + Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd') + '.xlsx');
  MailApp.sendEmail({ to: AJUSTES.CORREO_CLUB, subject: 'Excel de inscritos (pagados) · Motor Raid', body: 'Adjunto la lista de inscripciones pagadas: ' + (hi.getLastRow() - 1) + ' inscripciones.', attachments: [blob] });
  try { SpreadsheetApp.getUi().alert('Excel enviado a ' + AJUSTES.CORREO_CLUB); } catch (e) {}
}

// ------------------ Drive ------------------
function carpeta(padre, nombre) {
  var it = padre ? padre.getFoldersByName(nombre) : DriveApp.getFoldersByName(nombre);
  if (it.hasNext()) return it.next();
  return padre ? padre.createFolder(nombre) : DriveApp.createFolder(nombre);
}

function carpetaParticipante(d) {
  return carpeta(carpeta(null, AJUSTES.CARPETA_FOTOS), d.dorsal + ' - ' + d.nombre);
}

// ------------------ Sellos ------------------
function sellar(d) {
  var hs = hoja('Sellos', COLS_SELLO);
  var datos = hs.getDataRange().getValues();

  // ¿Ya teníamos este sello? (el móvil puede reintentar el envío)
  var hechos = {};
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][1]).toUpperCase() === d.dorsal) hechos[datos[i][12]] = true;
  }
  if (hechos[d.puntoId]) return { ok: true, repetido: true };

  // Guardar la foto en Drive
  var carpetaP = carpetaParticipante(d);
  var enlace = '';
  if (d.foto) {
    var blob = Utilities.newBlob(Utilities.base64Decode(d.foto), 'image/jpeg', d.orden + ' - ' + d.puntoNombre + '.jpg');
    var archivo = carpetaP.createFile(blob);
    enlace = archivo.getUrl();
  }

  var ubic = (d.lat != null && d.lng != null) ? 'https://www.google.com/maps?q=' + d.lat + ',' + d.lng : '';
  hs.appendRow([
    new Date(), d.dorsal, d.nombre, d.orden, d.puntoNombre, d.hora ? new Date(d.hora) : '',
    d.distancia == null ? '' : d.distancia, d.precision == null ? '' : d.precision,
    d.sinGps ? 'SÍ - revisar foto' : '', d.simulado ? 'SÍ' : '',
    enlace, ubic, d.puntoId
  ]);
  hechos[d.puntoId] = true;
  var num = Object.keys(hechos).length;

  // Actualizar la hoja de participantes
  var p = filaParticipante(d.dorsal);
  if (!p.fila) { registrar(d); p = filaParticipante(d.dorsal); }
  p.hoja.getRange(p.fila, 6).setValue(num);
  p.hoja.getRange(p.fila, 10).setValue(carpetaP.getUrl());

  var total = Number(d.total) || 0;
  if (total && num >= total && !p.valores[6]) {
    p.hoja.getRange(p.fila, 7, 1, 2).setValues([['SÍ', new Date()]]);
    p.hoja.getRange(p.fila, 1, 1, COLS_PART.length).setBackground('#d9f7e6');
    var enviado = avisarCompletado(d, carpetaP);
    p.hoja.getRange(p.fila, 9).setValue(enviado ? 'Sí' : 'PENDIENTE (sin cuota de correo)');
  }
  return { ok: true, sellos: num };
}

// ------------------ Correos ------------------
function avisarCompletado(d, carpetaP) {
  if (MailApp.getRemainingDailyQuota() < 2) return false;
  var adjuntos = [];
  var lista = [];
  var archivos = carpetaP.getFiles();
  while (archivos.hasNext()) {
    var f = archivos.next();
    lista.push({ nombre: f.getName(), url: f.getUrl(), f: f });
  }
  lista.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es', { numeric: true }); });
  if (AJUSTES.ADJUNTAR_FOTOS) lista.forEach(function (x) { adjuntos.push(x.f.getBlob()); });

  var html =
    '<h2 style="color:#d7261e">🏁 ' + limpiar(d.nombre) + ' ha completado el ' + limpiar(AJUSTES.NOMBRE_EVENTO) + '</h2>' +
    '<p><b>Dorsal:</b> ' + limpiar(d.dorsal) + '<br><b>Teléfono:</b> ' + limpiar(d.telefono || '-') +
    '<br><b>Email:</b> ' + limpiar(d.email || '-') + '<br><b>Hora del último sello:</b> ' +
    Utilities.formatDate(new Date(d.hora || new Date()), 'Europe/Madrid', 'dd/MM/yyyy HH:mm') + '</p>' +
    '<p><b>Fotos:</b></p><ol>' + lista.map(function (x) { return '<li><a href="' + x.url + '">' + limpiar(x.nombre) + '</a></li>'; }).join('') + '</ol>' +
    '<p><a href="' + carpetaP.getUrl() + '">Abrir carpeta de fotos en Drive</a></p>' +
    '<p style="color:#888">Revisa en la hoja "Sellos" si algún sello está marcado como "Sin GPS".</p>';

  MailApp.sendEmail({
    to: AJUSTES.CORREO_CLUB,
    subject: '✅ Desafío completado: ' + d.nombre + ' (dorsal ' + d.dorsal + ')',
    htmlBody: html,
    attachments: adjuntos,
    name: AJUSTES.NOMBRE_EVENTO
  });

  if (AJUSTES.CORREO_AL_PARTICIPANTE && d.email && MailApp.getRemainingDailyQuota() > 1) {
    MailApp.sendEmail({
      to: d.email,
      subject: '¡Enhorabuena! Has completado el ' + AJUSTES.NOMBRE_EVENTO,
      htmlBody: '<h2>¡Enhorabuena, ' + limpiar(d.nombre.split(' ')[0]) + '!</h2>' +
        '<p>Has completado el <b>' + limpiar(AJUSTES.NOMBRE_EVENTO) + '</b>. Te esperamos en la meta para entregarte tu diploma.</p>' +
        '<p>Motorclub Sierra Las Villas · Gasolina, compañerismo y pasión por las motos 🏍️</p>',
      name: 'Motorclub Sierra Las Villas'
    });
  }
  return true;
}

function limpiar(t) {
  return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}

// ------------------ Utilidades para el club ------------------

/** Ejecuta esta función UNA VEZ desde el editor para dar permisos y crear las hojas. */
function probarServidor() {
  hojaRuta();
  hoja('Solicitudes', COLS_SOL);
  hoja('Inscritos', COLS_INSC);
  hoja('Participantes', COLS_PART);
  hoja('Sellos', COLS_SELLO);
  carpeta(null, AJUSTES.CARPETA_FOTOS);
  Logger.log('Hojas y carpeta listas. Correos que puedes enviar hoy: ' + MailApp.getRemainingDailyQuota());
}

/** Si un día se acaba la cuota de correo, ejecuta esto al día siguiente. */
function enviarAvisosPendientes() {
  var h = hoja('Participantes', COLS_PART);
  var datos = h.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][8]).indexOf('PENDIENTE') === 0) {
      var d = { dorsal: String(datos[i][0]), nombre: datos[i][1], telefono: datos[i][2], email: datos[i][3], hora: datos[i][7] };
      if (avisarCompletado(d, carpetaParticipante(d))) h.getRange(i + 1, 9).setValue('Sí');
      else { Logger.log('Sin cuota de correo, prueba mañana'); return; }
    }
  }
}
