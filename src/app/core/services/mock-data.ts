import { AppNotification, AuditEvent, Booking, Listing, Review, User } from '../models/marketplace.models';

export const USERS: User[] = [
  { id: 1, name: 'Laura Méndez', email: 'laura@correo.com', phone: '300 456 7890', role: 'guest', active: true, joinedAt: '2026-02-14' },
  { id: 2, name: 'Santiago Rojas', email: 'santiago@correo.com', phone: '315 220 1640', role: 'host', active: true, joinedAt: '2025-11-06' },
  { id: 3, name: 'Camila Torres', email: 'camila@inversioneslr.co', phone: '601 555 0180', role: 'admin', active: true, joinedAt: '2025-08-01' },
  { id: 4, name: 'Martín Vélez', email: 'martin@correo.com', phone: '310 663 2001', role: 'guest', active: true, joinedAt: '2026-05-09' },
  { id: 5, name: 'Andrea Ruiz', email: 'andrea@correo.com', phone: '301 008 1944', role: 'host', active: false, joinedAt: '2026-01-22' }
];

export const REVIEWS: Review[] = [
  { id: 1, author: 'Valentina', rating: 5, date: '12 ago 2026', content: 'Un lugar tranquilo, impecable y muy bien ubicado. La llegada fue sencilla y el anfitrión siempre estuvo pendiente.' },
  { id: 2, author: 'Felipe', rating: 4, date: '28 jul 2026', content: 'La vista es tal como aparece en las fotos. Volvería por la comodidad y la zona.' },
  { id: 3, author: 'Mariana', rating: 5, date: '03 jul 2026', content: 'Todo estuvo muy organizado. La cocina tiene lo necesario y el espacio es perfecto para descansar.' }
];

export const LISTINGS: Listing[] = [
  {
    id: 101,
    hostId: 2,
    title: 'Loft sereno junto a los cerros',
    description: 'Un loft luminoso en Chapinero Alto, pensado para descansar y explorar Bogotá. Tiene espacios abiertos, cocina equipada y una ventana amplia hacia los cerros.',
    city: 'Bogotá',
    address: 'Chapinero Alto, Bogotá',
    type: 'Loft',
    capacity: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    price: 248000,
    cleaningFee: 52000,
    amenities: ['Wi-Fi', 'Cocina', 'Lavadora', 'Espacio de trabajo'],
    rules: ['No fumar', 'No se permiten fiestas', 'Llegada después de las 3:00 p. m.'],
    image: 'images/loft-bogota.svg',
    images: ['images/loft-bogota.svg', 'images/interior-purple.svg', 'images/bedroom.svg'],
    rating: 4.9,
    reviewsCount: 86,
    status: 'ACTIVA',
    instantBooking: true,
    cancellationPolicy: 'Flexible: devolución total hasta 48 horas antes de la llegada.'
  },
  {
    id: 102,
    hostId: 2,
    title: 'Casa colonial en Getsemaní',
    description: 'Casa restaurada con patio interior, diseño local y espacios frescos a pocos minutos de la plaza de la Trinidad.',
    city: 'Cartagena',
    address: 'Getsemaní, Cartagena',
    type: 'Casa',
    capacity: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 2,
    price: 620000,
    cleaningFee: 90000,
    amenities: ['Wi-Fi', 'Piscina', 'Aire acondicionado', 'Cocina'],
    rules: ['No fumar', 'Mascotas con autorización', 'Silencio después de las 10:00 p. m.'],
    image: 'images/casa-cartagena.svg',
    images: ['images/casa-cartagena.svg', 'images/patio.svg', 'images/interior-purple.svg'],
    rating: 4.8,
    reviewsCount: 121,
    status: 'ACTIVA',
    instantBooking: true,
    cancellationPolicy: 'Moderada: devolución del 50 % hasta 5 días antes de la llegada.'
  },
  {
    id: 103,
    hostId: 5,
    title: 'Cabaña entre montañas',
    description: 'Cabaña privada con chimenea y terraza en un entorno natural cercano a Medellín.',
    city: 'Medellín',
    address: 'Santa Elena, Medellín',
    type: 'Cabaña',
    capacity: 4,
    bedrooms: 2,
    beds: 3,
    bathrooms: 1,
    price: 335000,
    cleaningFee: 68000,
    amenities: ['Wi-Fi', 'Chimenea', 'Parqueadero', 'Cocina'],
    rules: ['No se permiten fiestas', 'No fumar dentro de la cabaña'],
    image: 'images/cabana-medellin.svg',
    images: ['images/cabana-medellin.svg', 'images/bedroom.svg', 'images/patio.svg'],
    rating: 4.7,
    reviewsCount: 59,
    status: 'ACTIVA',
    instantBooking: false,
    cancellationPolicy: 'Flexible: devolución total hasta 48 horas antes de la llegada.'
  },
  {
    id: 104,
    hostId: 2,
    title: 'Apartamento moderno con balcón',
    description: 'Apartamento contemporáneo con balcón, zonas comunes y acceso fácil al centro de la ciudad.',
    city: 'Cali',
    address: 'Granada, Cali',
    type: 'Apartamento',
    capacity: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    price: 210000,
    cleaningFee: 45000,
    amenities: ['Wi-Fi', 'Balcón', 'Aire acondicionado', 'Gimnasio'],
    rules: ['No fumar', 'No se permiten fiestas'],
    image: 'images/apartamento-cali.svg',
    images: ['images/apartamento-cali.svg', 'images/interior-purple.svg', 'images/bedroom.svg'],
    rating: 4.6,
    reviewsCount: 34,
    status: 'PAUSADA',
    instantBooking: true,
    cancellationPolicy: 'Moderada: devolución del 50 % hasta 5 días antes de la llegada.'
  },
  {
    id: 105,
    hostId: 2,
    title: 'Refugio de diseño en Villa de Leyva',
    description: 'Refugio de piedra y madera con jardín privado, perfecto para una escapada tranquila.',
    city: 'Villa de Leyva',
    address: 'Vereda El Roble, Villa de Leyva',
    type: 'Casa',
    capacity: 5,
    bedrooms: 2,
    beds: 3,
    bathrooms: 2,
    price: 410000,
    cleaningFee: 75000,
    amenities: ['Wi-Fi', 'Chimenea', 'Parqueadero', 'Jardín'],
    rules: ['Mascotas con autorización', 'No se permiten fiestas'],
    image: 'images/casa-villa.svg',
    images: ['images/casa-villa.svg', 'images/patio.svg', 'images/bedroom.svg'],
    rating: 4.9,
    reviewsCount: 47,
    status: 'PENDIENTE_REVISION',
    instantBooking: false,
    cancellationPolicy: 'Flexible: devolución total hasta 48 horas antes de la llegada.'
  }
];

export const BOOKINGS: Booking[] = [
  { id: 301, code: 'LR-84021', listingId: 101, guestId: 1, checkIn: '2026-10-16', checkOut: '2026-10-20', guests: 2, status: 'CONFIRMADA', total: 1146400, createdAt: '2026-09-12', reviewed: false },
  { id: 302, code: 'LR-79144', listingId: 102, guestId: 1, checkIn: '2026-06-04', checkOut: '2026-06-08', guests: 4, status: 'COMPLETADA', total: 2856000, createdAt: '2026-04-20', reviewed: false },
  { id: 303, code: 'LR-70218', listingId: 103, guestId: 4, checkIn: '2026-08-11', checkOut: '2026-08-13', guests: 2, status: 'CANCELADA', total: 835600, createdAt: '2026-07-30', reviewed: false }
];

export const NOTIFICATIONS: AppNotification[] = [
  { id: 1, title: 'Reserva confirmada', message: 'Tu reserva LR-84021 en Bogotá quedó confirmada.', date: 'Hace 2 horas', read: false, type: 'booking' },
  { id: 2, title: 'Alojamiento en revisión', message: 'Refugio de diseño en Villa de Leyva está pendiente de revisión.', date: 'Ayer', read: false, type: 'listing' },
  { id: 3, title: 'Perfil actualizado', message: 'Tus datos personales fueron actualizados correctamente.', date: '12 sep 2026', read: true, type: 'account' },
  { id: 4, title: 'Nueva política de servicio', message: 'Consulta los cambios aplicables a futuras reservas.', date: '08 sep 2026', read: true, type: 'system' }
];

export const AUDIT_EVENTS: AuditEvent[] = [
  { id: 1, date: '20 sep 2026 · 18:42', actor: 'Camila Torres', action: 'BLOQUEÓ_PUBLICACIÓN', entity: 'Publicación #118', result: 'BLOQUEADO', detail: 'Información de ubicación inconsistente' },
  { id: 2, date: '20 sep 2026 · 17:16', actor: 'Laura Méndez', action: 'INICIÓ_SESIÓN', entity: 'Usuario #1', result: 'EXITOSO', detail: 'Acceso desde navegador web' },
  { id: 3, date: '20 sep 2026 · 15:03', actor: 'Sistema', action: 'CONFIRMÓ_RESERVA', entity: 'Reserva LR-84021', result: 'EXITOSO', detail: 'Validación de disponibilidad completada' },
  { id: 4, date: '19 sep 2026 · 21:35', actor: 'Camila Torres', action: 'RESTRINGIÓ_USUARIO', entity: 'Usuario #24', result: 'REVISIÓN', detail: 'Actividad inusual reportada' },
  { id: 5, date: '19 sep 2026 · 10:08', actor: 'Santiago Rojas', action: 'ACTUALIZÓ_PUBLICACIÓN', entity: 'Publicación #101', result: 'EXITOSO', detail: 'Cambios en precio y servicios' }
];
