/* =========================================================================
   CONFIGURACIÓN DEL DESAFÍO  ·  Motorclub Sierra Las Villas
   -------------------------------------------------------------------------
   Este es el ÚNICO archivo que necesitas tocar para cambiar la ruta,
   las fechas, los textos o conectar el servidor.
   Después de cambiarlo, súbelo de nuevo y sube el número de VERSION en sw.js
   ========================================================================= */

window.CONFIG = {

  // --- Datos del evento -----------------------------------------------------
  evento: {
    nombre: 'Desafío de las Presas',
    subtitulo: 'Motor Raid Sierra Las Villas 2027',
    club: 'Motorclub Sierra Las Villas',
    // Hora de salida del sábado (formato AAAA-MM-DDTHH:MM:SS+02:00)
    fechaSalida: '2027-05-08T08:00:00+02:00',
    lugarFinal: 'Pub Guzzi (Villacarrillo)',
    telefonos: ['600373448', '630874922'],
    web: 'https://sites.google.com/view/motorraidsierralasvillas/inicio'
  },

  // --- Cómo se muestra la ruta ----------------------------------------------
  //  'tramos'   -> solo se ve el tramo hasta el siguiente punto; al sellar se
  //                desbloquea el siguiente.
  //  'completa' -> se ve toda la ruta desde que se desbloquea.
  modoRuta: 'tramos',

  // Momento a partir del cual la ruta se puede ver (por ejemplo, 24 h antes)
  desbloqueoRuta: '2027-05-07T08:00:00+02:00',

  // Distancia máxima (en metros) a la que hay que estar del punto para sellar
  radioSelladoMetros: 250,

  // Código que solo tiene la organización: muestra la ruta completa en caso
  // de emergencia y permite borrar los datos del móvil. ¡Cámbialo!
  codigoOrganizacion: 'SIERRA2027',

  // Dirección del servidor (Google Apps Script). Ver GUIA, paso 2.
  // Mientras esté vacío, las fotos se guardan en el móvil pero no se envían.
  urlServidor: '',

  // MODO PRUEBA: ignora la fecha de desbloqueo y añade el botón
  // "Simular llegada" para probar sin moverte de casa.
  // ¡PONER EN false ANTES DEL EVENTO!
  modoPrueba: true,

  // --- Mapa -------------------------------------------------------------------
  mapa: {
    teselas: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribucion: '&copy; colaboradores de OpenStreetMap',
    zoomMax: 18,
    // Niveles de zoom que se guardan para usar sin conexión
    zoomsSinConexion: [9, 10, 11, 12, 13]
  },

  // --- Ruta -------------------------------------------------------------------
  // Coordenadas sacadas de la ruta de Google Maps que pasaste.
  // 'via' (opcional): puntos de paso para obligar a que el trazado vaya por
  // una carretera concreta en el tramo que LLEGA a ese punto. Ej: via: [[38.2, -3.6]]
  salida: {
    nombre: 'Paseo de Santo Cristo (Villacarrillo)',
    lat: 38.1196247, lng: -3.0786158
  },

  puntos: [
    {
      id: 'guadalen',
      nombre: 'Presa de Guadalén',
      lugar: 'Vilches (Jaén)',
      lat: 38.1617424, lng: -3.4785971,
      pista: 'Haz la foto con el muro de la presa o el embalse de fondo.'
    },
    {
      id: 'tamujoso',
      nombre: 'Playa del Tamujoso',
      lugar: 'Embalse del Rumblar · Baños de la Encina (Jaén)',
      lat: 38.179766, lng: -3.795534,
      pista: 'Que se vea el embalse del Rumblar.'
    },
    {
      id: 'encinarejo',
      nombre: 'Presa de El Encinarejo',
      lugar: 'Andújar (Jaén)',
      lat: 38.1648275, lng: -3.9934237,
      pista: 'Foto con la presa del Jándula de fondo.'
    },
    {
      id: 'montoro',
      nombre: 'Presa del Río Montoro',
      lugar: 'Sierra Madrona (Ciudad Real)',
      lat: 38.5247688, lng: -4.0988583,
      pista: 'Último sello. ¡Reposta antes de subir, hay pocas gasolineras!'
    }
  ],

  llegada: {
    nombre: 'Pub Guzzi (Villacarrillo)',
    lat: 38.1196247, lng: -3.0786158
  }
};
