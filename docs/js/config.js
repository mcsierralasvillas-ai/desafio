/* =========================================================================
   CONFIGURACIÓN DE LA APP · Motorclub Sierra Las Villas
   -------------------------------------------------------------------------
   Aquí se cambian textos, fechas, precios, teléfonos, la ruta y el servidor.
   Después de cambiar algo, sube el número de VERSION en sw.js.
   Lo que pone "COMPLETAR" está pendiente de que el club lo rellene.
   ========================================================================= */

window.CONFIG = {

  // ------------------------------------------------------------------ CLUB
  club: {
    nombre: 'Motorclub Sierra Las Villas',
    lema: 'Gasolina, compañerismo y pasión por las motos',
    localidad: 'Villacarrillo (Jaén)',
    // Texto de "Información del club". Cada elemento es un párrafo.
    presentacion: [
      'Somos el Motorclub Sierra Las Villas, un club motero de Villacarrillo (Jaén), a las puertas de la Sierra de Cazorla, Segura y Las Villas.',
      'Nos une la gasolina, el compañerismo y la pasión por las motos: salimos a rodar, organizamos rutas y eventos y damos a conocer las carreteras de nuestra sierra.',
      'COMPLETAR: año de fundación, número de socios, cómo hacerse socio…'
    ],
    // Eventos y actividades que organiza el club
    actividades: [
      { nombre: 'Motor Raid Sierra Las Villas', texto: 'Nuestra ruta sorpresa por la sierra con carnet de sellado. Edición 2026: 8 y 9 de mayo.' },
      { nombre: 'Rutas del club', texto: 'Una o dos salidas al mes: El Lince, Mar y Montaña, Velefique, Caravaca, Sierra Nevada, The Silent Route, la Alpujarra… (ver apartado Socio).' },
      { nombre: 'Rutas nocturnas', texto: 'En verano, por la Sierra de Cazorla, Segura y Las Villas y por el Condado.' },
      { nombre: 'Papanoelada motera', texto: 'En diciembre en Villacarrillo: stunt, paseo tradicional, premio a la moto más navideña, música y barra.' }
    ]
  },

  // ------------------------------------------------------------------ SOCIO
  socio: {
    portada: 'rutas/portada-rutas-2026.jpg',
    tituloRutas: 'Rutas 2026',
    // Cada ruta: fecha (texto que sale encima) + cartel. Para añadir una,
    // copia una línea y pon la imagen en la carpeta "rutas".
    rutas: [
      { fecha: '14 y 15 de febrero', cartel: 'rutas/2026-02-el-lince.jpg', nombre: 'El Lince · concentración motera invernal', ancho: 900, alto: 1125 },
      { fecha: '28 y 29 de marzo', cartel: 'rutas/2026-03-mar-y-montana.jpg', nombre: 'Ruta motera Mar y Montaña', ancho: 900, alto: 1297 },
      { fecha: '12 de abril', cartel: 'rutas/2026-04-velefique.jpg', nombre: 'Ruta a Velefique', ancho: 863, alto: 1400 },
      { fecha: '8, 9 y 10 de mayo', cartel: 'rutas/2026-05-motor-raid.jpg', nombre: 'Motor Raid Sierra Las Villas', ancho: 900, alto: 1273 },
      { fecha: '31 de mayo', cartel: 'rutas/2026-05-convivencia.jpg', nombre: 'Jornada de convivencia', ancho: 900, alto: 1157 },
      { fecha: '14 de junio', cartel: 'rutas/2026-06-caravaca.jpg', nombre: 'Ruta a Caravaca de la Cruz', ancho: 900, alto: 1125 },
      { fecha: '17 de julio', cartel: 'rutas/2026-07-nocturna-cazorla.jpg', nombre: 'Ruta nocturna por la Sierra de Cazorla', ancho: 900, alto: 1261 },
      { fecha: '8 de agosto', cartel: 'rutas/2026-08-nocturna-condado.jpg', nombre: 'Ruta nocturna por el Condado', ancho: 900, alto: 1273 },
      { fecha: '26 de septiembre', cartel: 'rutas/2026-09-sierra-nevada.jpg', nombre: 'Ruta a Sierra Nevada', ancho: 900, alto: 1273 },
      { fecha: '10, 11 y 12 de octubre', cartel: 'rutas/2026-10-silent-route.jpg', nombre: 'The Silent Route', ancho: 900, alto: 1317 },
      { fecha: '8 de noviembre', cartel: 'rutas/2026-11-alpujarra.jpg', nombre: 'Ruta a la Alpujarra', ancho: 900, alto: 1248 },
      { fecha: '12 de diciembre', cartel: 'rutas/2026-12-papanoelada.jpg', nombre: 'Papanoelada VIII', ancho: 900, alto: 1320 }
    ],
    hazteSocio: [
      'Rueda con nosotros todo el año: rutas por Andalucía y más allá, rutas nocturnas, viajes de varios días, la jornada de convivencia con comida para los socios y el Motor Raid.',
      'Si quieres formar parte del Motorclub Sierra Las Villas, escríbenos o llámanos y te contamos cómo hacerte socio.'
    ]
  },

  // --------------------------------------------------------------- CONTACTO
  contacto: {
    telefonos: [
      { nombre: 'Contacto 1', numero: '600373448' },
      { nombre: 'Contacto 2', numero: '630874922' }
    ],
    whatsapp: '600373448',
    email: 'mcsierralasvillas@gmail.com',
    instagram: 'mcsierralasvillas',
    facebook: '',                   // COMPLETAR: dirección completa de la página de Facebook
    direccion: 'Villacarrillo (Jaén)',
    mapa: 'https://www.google.com/maps/search/?api=1&query=Villacarrillo%2C%20Ja%C3%A9n'
  },

  // ------------------------------------------------------------- RAID 2027
  evento: {
    nombre: 'Motor Raid Sierra Las Villas 2027',
    reto: 'Desafío de las Presas',
    fechas: '7 y 8 de mayo de 2027',                  // COMPLETAR/REVISAR
    fechaSalida: '2027-05-08T08:00:00+02:00',          // para la cuenta atrás
    lugarSalida: 'Paseo de Santo Cristo (Villacarrillo)',
    lugarFinal: 'Pub Guzzi (Villacarrillo)',
    resumen: 'Una ruta 100% on road por la Sierra de Cazorla, Segura y Las Villas y Sierra Morena, uniendo presas y embalses. La ruta es sorpresa: se va desvelando en la app según vas sellando cada punto con una foto. No es una carrera: se trata de disfrutar.',
    programa: [
      { dia: 'Viernes', hora: 'Desde las 18:00', titulo: 'Bienvenida y KDD motera', texto: 'Paseo de Santo Cristo. Entrega del pack de bienvenida y dorsales, música, sorteo y ambiente motero.' },
      { dia: 'Sábado', hora: '07:00 – 08:00', titulo: 'Últimas inscripciones y salida', texto: 'Paseo de Santo Cristo. La app desbloquea el primer punto de la ruta.' },
      { dia: 'Sábado', hora: 'Todo el día', titulo: 'Desafío de las Presas', texto: 'Unos 420 km por la sierra. Comida libre según el ritmo de cada uno.' },
      { dia: 'Sábado', hora: 'Desde las 18:30', titulo: 'Llegada y diplomas', texto: 'Pub Guzzi (Villacarrillo). Entrega de diplomas y cena para quien quiera.' }
    ],
    incluye: ['Camiseta del evento', 'Dorsal y bordado', 'Consumición', 'Diploma de finalización', 'Papeleta para el sorteo'],
    avisos: [
      'Plazas limitadas: tienen prioridad las inscripciones hechas en la app.',
      'Respeta las normas de tráfico y las indicaciones de la organización. No es una carrera.',
      'Descarga el mapa en la app antes de salir: hay zonas sin cobertura.',
      'Para ver la ruta en la app necesitas estar inscrito: se entra con tu DNI.'
    ],
    alojamiento: 'https://drive.google.com/file/d/1zj3bdQRfXXiJfaPYlIVhl2DhWXRX_xnT/view?usp=sharing',
    patrocinadores: ['Paradise Motos (Jaén)', 'Yamaha Xauen Motor'],  // REVISAR para 2027
    sorteo: 'Durante la KDD del viernes habrá sorteo de premios de nuestros patrocinadores. Cada inscrito recibe una papeleta y se pueden comprar más allí mismo.',
    video: 'https://www.youtube.com/watch?v=wcieWYd9Jk4'   // "Conoce la Sierra de Cazorla, Segura y Las Villas"
  },

  // ----------------------------------------------------------- INSCRIPCIÓN
  // Los precios se comprueban también en el servidor (servidor-google/Codigo.gs).
  // Si cambias un precio aquí, cámbialo también allí (apartado PRECIOS).
  inscripcion: {
    abierta: true,
    precioPiloto: 25,
    precioAcompanante: 20,
    tallas: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],

    cena: {
      activa: true,
      precio: 20,     // por persona
      texto: 'El sábado por la noche celebraremos una <b>gran cena de recepción</b> para todos los participantes. El lugar se anunciará próximamente. <b>Menú cerrado: 20 € por persona.</b> Marca quién viene y se sumará al pago.'
    },

    // Formas de pago que se muestran al participante
    metodos: 'Pago seguro con tarjeta, Apple Pay, Google Pay o Bizum.',

    // Lo que ENTREGA EL CLUB a cada inscrito (sale en "Mi inscripción").
    // Tomado del pack de bienvenida de 2026: REVISAR para 2027.
    pack: {
      piloto: ['Camiseta del evento', 'Dorsal del evento', 'Bordado del evento', 'Consumición (cerveza o refresco)', 'Diploma de finalización', 'Papeleta para el sorteo'],
      acompanante: ['Camiseta del evento', 'Consumición (cerveza o refresco)', 'Diploma de finalización'],   // REVISAR
      recogida: 'Se recoge en la KDD del viernes en el Paseo de Santo Cristo (Villacarrillo). Enseña esta pantalla al llegar.'
    },

    // Pago manual (solo se usa si el servidor no tiene configurado Stripe)
    bizum: '',            // COMPLETAR si se quiere: teléfono de Bizum del club
    iban: '',             // COMPLETAR si se quiere: cuenta del club
    titular: 'Motorclub Sierra Las Villas',

    textoDatos: 'Acepto que el Motorclub Sierra Las Villas trate mis datos y los de mi acompañante solo para gestionar el evento. Puedo ejercer mis derechos escribiendo a mcsierralasvillas@gmail.com.',

    // CONDICIONES DE PARTICIPACIÓN Y EXENCIÓN DE RESPONSABILIDAD
    // Modelo orientativo: conviene que lo revise el asesor o la aseguradora del club.
    condiciones: [
      ['1. Naturaleza del evento', 'El Motor Raid Sierra Las Villas es una actividad recreativa y turística, sin carácter competitivo. No es una carrera ni una prueba de velocidad o regularidad. El recorrido transcurre por vías abiertas al tráfico, donde cada participante circula como un usuario más de la vía.'],
      ['2. Normas de circulación', 'El participante se compromete a cumplir en todo momento la Ley sobre Tráfico, Circulación de Vehículos a Motor y Seguridad Vial y el Reglamento General de Circulación, respetando las señales, los límites de velocidad y las indicaciones de los agentes de la autoridad y de la organización. La organización no controla ni garantiza el estado de las carreteras del recorrido.'],
      ['3. Documentación y estado de la motocicleta', 'El participante declara que tiene el permiso de conducción en vigor adecuado a su motocicleta; que la motocicleta está matriculada, tiene la ITV en vigor y un seguro obligatorio en vigor; y que se encuentra en condiciones técnicas óptimas (frenos, neumáticos, luces y demás elementos) para realizar el recorrido. Piloto y acompañante usarán casco homologado y equipación de protección adecuada.'],
      ['4. Estado físico', 'El participante declara encontrarse en condiciones físicas adecuadas para realizar el recorrido y se compromete a no conducir bajo los efectos del alcohol, drogas o medicamentos que afecten a la conducción.'],
      ['5. Responsabilidad', 'El participante asume voluntariamente los riesgos propios de la circulación en motocicleta. En la medida en que la ley lo permite, el Motorclub Sierra Las Villas, sus organizadores, voluntarios y colaboradores no se hacen responsables de los accidentes, lesiones, daños personales o materiales que el participante o su acompañante sufran o causen a sí mismos, a otras personas o a bienes durante el recorrido, que serán responsabilidad del conductor y de su compañía aseguradora. El participante renuncia a reclamar al club por estos hechos. Tampoco se responsabiliza el club de pérdidas, robos o averías de los vehículos y objetos personales.'],
      ['6. Acompañante', 'El piloto que inscribe a un acompañante se compromete a informarle de estas condiciones y declara que las acepta.'],
      ['7. Cambios y cancelación', 'La organización puede modificar el recorrido, los horarios o suspender la actividad por razones meteorológicas (lluvia, riesgo de hielo en la calzada), de seguridad o de fuerza mayor. La cuota de inscripción no se devolverá salvo que el evento sea cancelado por la organización.'],
      ['8. Imagen', 'El participante autoriza al club a usar las fotografías del sellado y las tomadas durante el evento en su web, app y redes sociales para la difusión del Motor Raid.'],
      ['9. Validez de la inscripción', 'La inscripción solo es válida una vez completado el pago. Las inscripciones sin pagar no reservan plaza.']
    ]
  },

  // ----------------------------------------------------------------- RUTA
  ruta: {
    modo: 'tramos',                                   // 'tramos' o 'completa'
    desbloqueo: '2027-05-07T08:00:00+02:00',          // cuándo se puede ver la ruta
    radioSelladoMetros: 250,
    codigoOrganizacion: 'SIERRA2027',                 // ¡CAMBIAR!

    // Logo que sale en el menú de la ruta (cuando tengáis el del Motor Raid,
    // ponedlo en icons/ y cambiad el nombre aquí)
    logo: 'icons/logo.png',
    mapa: {
      teselas: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      atribucion: '&copy; colaboradores de OpenStreetMap',
      zoomMax: 18,
      zoomsSinConexion: [9, 10, 11, 12, 13]
    },
    salida: { nombre: 'Paseo de Santo Cristo (Villacarrillo)', lat: 38.1196247, lng: -3.0786158 },
    // Cada punto es el FINAL de un tramo (el tramo 1 va de la salida al punto 1).
    // enlaceMaps (opcional): pega aquí el enlace de Google Maps de ese tramo
    //   tal cual lo copias de Google Maps, y se abrirá exactamente esa ruta.
    // via (opcional): puntos de paso [[lat, lng], ...] si no hay enlaceMaps.
    puntos: [
      { id: 'guadalen', nombre: 'Presa de Guadalén', lugar: 'Vilches (Jaén)', lat: 38.1617424, lng: -3.4785971, pista: 'Haz la foto con el muro de la presa o el embalse de fondo.' },
      { id: 'tamujoso', nombre: 'Playa del Tamujoso', lugar: 'Embalse del Rumblar · Baños de la Encina (Jaén)', lat: 38.179766, lng: -3.795534, pista: 'Que se vea el embalse del Rumblar.' },
      { id: 'encinarejo', nombre: 'Presa de El Encinarejo', lugar: 'Andújar (Jaén)', lat: 38.1648275, lng: -3.9934237, pista: 'Foto con la presa del Jándula de fondo.' },
      { id: 'montoro', nombre: 'Presa del Río Montoro', lugar: 'Sierra Madrona (Ciudad Real)', lat: 38.5247688, lng: -4.0988583, pista: 'Último sello. ¡Reposta antes de subir, hay pocas gasolineras!' }
    ],
    llegada: { nombre: 'Pub Guzzi (Villacarrillo)', lat: 38.1196247, lng: -3.0786158 }
  },

  // ------------------------------------------------------------- SERVIDOR
  // URL de Google Apps Script (termina en /exec). Vacío = no se envía nada.
  urlServidor: 'https://script.google.com/macros/s/AKfycbzgsB9rOmXZY9xpGhpjYf_zZPqJR0BuUeSzk-vV-E_nhl5NHksDHWs-L5Qe8syVw5U7Uw/exec',

  // MODO PRUEBA: ruta desbloqueada y botón "Simular llegada". ¡false en el evento!
  modoPrueba: true
};
