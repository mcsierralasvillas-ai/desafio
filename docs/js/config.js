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
    fundacion: '1991-05-10',          // inscrito oficialmente el 10 de mayo de 1991
    socios: 100,
    // Texto de "Información del club". Cada elemento es un párrafo.
    presentacion: [
      'Somos el Motorclub Sierra Las Villas, un club motero de Villacarrillo (Jaén), a las puertas del Parque Natural de las Sierras de Cazorla, Segura y Las Villas.',
      'El club quedó inscrito oficialmente el 10 de mayo de 1991. Desde entonces nos une la gasolina, el compañerismo y la pasión por las motos: salimos a rodar, organizamos rutas, concentraciones y eventos benéficos y damos a conocer las carreteras de nuestra sierra.',
      'Hoy somos alrededor de 100 socios y formamos parte de la Federación Andaluza de Motociclismo.'
    ],
    // Momentos de la historia del club (año + texto). Se muestran en orden.
    historia: [
      ['1991', 'El 10 de mayo queda inscrito oficialmente el Motorclub Sierra Las Villas en Villacarrillo.'],
      ['2019', 'I Enduro Indoor Ciudad de Villacarrillo (8 de septiembre), en el recinto ferial, con premios en metálico y categorías amateur, senior y pro.'],
      ['2021', 'Nace el Moto Raid Sierra Las Villas: una ruta por puntos fotográficos de la provincia de Jaén.'],
      ['2022', 'II Moto Raid, puntuable como 4ª prueba del Trofeo Andaluz de Mototurismo de la FAM.'],
      ['2023', 'Moto Raid Sierra Las Villas junto al festival PSK Rock, con 120 plazas y salida desde el Paseo del Santo Cristo.'],
      ['2025', 'Ruta “Paraíso del Agua” en Mogón (8 de junio): ruta en moto, sendero junto al Guadalquivir, paella y barra solidaria.'],
      ['2026', 'Moto Raid Sierra Las Villas (8 y 9 de mayo): unos 300 km por la sierra con puntos fotográficos.'],
      ['2027', 'Motor Raid Sierra Las Villas · Desafío de las Presas, con app propia y carnet fotográfico.']
    ],
    // Curiosidades. Añadid las que queráis (solo cosas comprobadas).
    curiosidades: [
      'El club está inscrito desde 1991: más de tres décadas de motos en Villacarrillo.',
      'En 2022 Villacarrillo fue punto de sellado de la Rider Andalucía: más de 1.300 motos pasaron por el Parque Municipal.',
      'Nuestro Moto Raid ha sido puntuable para el Trofeo Andaluz de Mototurismo de la Federación Andaluza de Motociclismo.',
      'El club escolta y apoya pruebas ciclistas como la Clásica Ciudad de Cazorla y la Marcha Ciclodeportiva Sierra de Las Villas.',
      'Organizamos eventos solidarios, como comidas para personas desfavorecidas junto al Motoclub Olivo.',
      'Hemos sorteado entre socios y amigos una moto Café Racer.',
      'Pedro Linares, piloto del club, aparece en el Cuadro de Honor de la FAM: 3º en el Trofeo Nacional de Cross Country (Senior B 4T).',
      'Las rutas del raid recorren el Parque Natural de Cazorla, Segura y Las Villas, el espacio protegido más grande de España.'
      // PENDIENTE de confirmar: organización de una prueba del mundial de motocross (2006/2007)
    ],
    // Galería de fotos (la primera sale grande). Fotos en la carpeta club/
    galeria: [
      { foto: 'club/concentracion-2.jpg', pie: 'Concentración motera del club' },
      { foto: 'club/enduro-2.jpg', pie: 'Enduro en Villacarrillo' },
      { foto: 'club/papanoelada-1.jpg', pie: 'Papanoelada motera' },
      { foto: 'club/ruta-1.jpg', pie: 'Salida en grupo' },
      { foto: 'club/enduro-1.jpg', pie: 'También nos gusta el barro' },
      { foto: 'club/ruta-2.jpg', pie: 'Rodando por la sierra' },
      { foto: 'club/concentracion-1.jpg', pie: 'Motos de toda Andalucía' }
    ],
    // Eventos y actividades que organiza el club
    actividades: [
      { nombre: 'Motor Raid Sierra Las Villas', texto: 'Nuestra ruta sorpresa por la sierra con carnet de sellado. Edición 2026: 8 y 9 de mayo.' },
      { nombre: 'Rutas del club', texto: 'Una o dos salidas al mes: El Lince, Mar y Montaña, Velefique, Caravaca, Sierra Nevada, The Silent Route, la Alpujarra… (ver apartado Socio).' },
      { nombre: 'Rutas nocturnas', texto: 'En verano, por la Sierra de Cazorla, Segura y Las Villas y por el Condado.' },
      { nombre: 'Papanoelada motera', texto: 'En diciembre en Villacarrillo: stunt, paseo tradicional, premio a la moto más navideña, música y barra.' },
      { nombre: 'Ruta “Paraíso del Agua”', texto: 'En Mogón: ruta libre por la sierra, sendero junto al Guadalquivir, paella y barra solidaria.' },
      { nombre: 'Colaboraciones', texto: 'Escoltas de pruebas ciclistas, eventos benéficos y apoyo a otros clubes de la zona.' }
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
    // Grupo oficial de WhatsApp del evento (botón WHATSAPP del menú de la ruta)
    grupoWhatsapp: 'https://chat.whatsapp.com/CrY3hwgnqv37nSewdxEGBx?mode=gi_t',
    textoWhatsapp: 'Aquí puedes entrar en el grupo de WhatsApp oficial del Motor Raid Sierra Las Villas 2027. Avisos de la organización, horarios, cambios de última hora y ambiente motero.',
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
    desbloqueo: '2027-05-07T18:00:00+02:00',          // viernes 18:00: aparece el primer punto
    inicioSellado: '2027-05-08T05:00:00+02:00',       // sábado 05:00: ya se pueden hacer las fotos
    // (el servidor manda sus propias horas y tienen prioridad sobre estas)
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
    // La ruta REAL no está aquí (sería pública). Está en la pestaña "Ruta" de la
    // hoja de Google del club y el servidor solo se la da al conductor inscrito
    // y pagado a partir de 'desbloqueo'. Al descargarla queda guardada en el
    // móvil y funciona sin cobertura.

    // RUTA DE DEMOSTRACIÓN (ruta 2026) para enseñar la app con estos DNI.
    // Con ellos no hay horarios, se puede simular la llegada y no se envía nada.
    demo: {
      dnis: ['00000000T'],
      salida: { nombre: 'Villacarrillo', lat: 38.1196247, lng: -3.0786158 },
      puntos: [
        { id: 'demo-tranco', nombre: 'Pantano del Tranco', lugar: 'Hornos (Jaén)', lat: 38.13333, lng: -2.78333, pista: 'Foto con el embalse del Tranco de fondo.' },
        { id: 'demo-riopar', nombre: 'Riópar', lugar: 'Albacete', lat: 38.4982409, lng: -2.4171658, pista: 'Foto en el pueblo o en el Nacimiento del Mundo.' },
        { id: 'demo-yeste', nombre: 'Yeste', lugar: 'Albacete', lat: 38.3654376, lng: -2.321546, pista: 'Que se vea el castillo de Yeste.' },
        { id: 'demo-pontones', nombre: 'Pontones', lugar: 'Santiago-Pontones (Jaén)', lat: 38.1178271, lng: -2.6701259, pista: 'Último sello antes de volver.' }
      ],
      llegada: { nombre: 'Villacarrillo', lat: 38.1196247, lng: -3.0786158 }
    }
  },

  // ------------------------------------------------------------- SERVIDOR
  // URL de Google Apps Script (termina en /exec). Vacío = no se envía nada.
  urlServidor: 'https://script.google.com/macros/s/AKfycbzgsB9rOmXZY9xpGhpjYf_zZPqJR0BuUeSzk-vV-E_nhl5NHksDHWs-L5Qe8syVw5U7Uw/exec',

  // MODO PRUEBA: sin horarios y con botón "Simular llegada" para todos.
  // Para la demo del club no hace falta (el DNI de demo ya lo tiene).
  modoPrueba: false
};
