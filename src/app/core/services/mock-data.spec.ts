
import { describe, expect, it } from 'vitest';

import {
  USERS,
  REVIEWS,
  LISTINGS,
  BOOKINGS,
  NOTIFICATIONS,
  AUDIT_EVENTS
} from './mock-data';

describe('Mock Data - CasitaGO', () => {

  describe('Usuarios', () => {

    it('01 - debe tener usuarios registrados', () => {
      expect(USERS.length).toBeGreaterThan(0);
    });

    it('02 - debe contener cinco usuarios', () => {
      expect(USERS).toHaveLength(5);
    });

    it('03 - debe tener identificadores únicos', () => {
      const ids = USERS.map(user => user.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('04 - debe tener nombres completos', () => {
      expect(USERS.every(user => user.name.trim().length > 0)).toBe(true);
    });

    it('05 - debe tener correos válidos', () => {
      expect(USERS.every(user =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)
      )).toBe(true);
    });

    it('06 - debe tener teléfonos registrados', () => {
      expect(USERS.every(user => user.phone.trim().length > 0)).toBe(true);
    });

    it('07 - debe tener roles permitidos', () => {
      expect(USERS.every(user =>
        ['guest', 'host', 'admin'].includes(user.role)
      )).toBe(true);
    });

    it('08 - debe existir al menos un huésped', () => {
      expect(USERS.some(user => user.role === 'guest')).toBe(true);
    });

    it('09 - debe existir al menos un anfitrión', () => {
      expect(USERS.some(user => user.role === 'host')).toBe(true);
    });

    it('10 - debe existir un administrador', () => {
      expect(USERS.some(user => user.role === 'admin')).toBe(true);
    });

    it('11 - debe registrar el estado activo como booleano', () => {
      expect(USERS.every(user => typeof user.active === 'boolean')).toBe(true);
    });

    it('12 - debe tener fechas de registro válidas', () => {
      expect(USERS.every(user =>
        /^\d{4}-\d{2}-\d{2}$/.test(user.joinedAt) &&
        !Number.isNaN(Date.parse(user.joinedAt))
      )).toBe(true);
    });
  });

  describe('Reseñas', () => {

    it('13 - debe contener tres reseñas', () => {
      expect(REVIEWS).toHaveLength(3);
    });

    it('14 - debe tener identificadores únicos', () => {
      const ids = REVIEWS.map(review => review.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('15 - debe tener autores registrados', () => {
      expect(REVIEWS.every(review => review.author.trim().length > 0)).toBe(true);
    });

    it('16 - debe tener calificaciones entre 1 y 5', () => {
      expect(REVIEWS.every(review =>
        review.rating >= 1 && review.rating <= 5
      )).toBe(true);
    });

    it('17 - debe tener calificaciones numéricas', () => {
      expect(REVIEWS.every(review =>
        typeof review.rating === 'number'
      )).toBe(true);
    });

    it('18 - debe contener comentarios', () => {
      expect(REVIEWS.every(review => review.content.trim().length > 0)).toBe(true);
    });

    it('19 - debe tener fechas de reseñas', () => {
      expect(REVIEWS.every(review => review.date.trim().length > 0)).toBe(true);
    });
  });

  describe('Alojamientos', () => {

    it('20 - debe contener cinco alojamientos', () => {
      expect(LISTINGS).toHaveLength(5);
    });

    it('21 - debe tener identificadores únicos', () => {
      const ids = LISTINGS.map(listing => listing.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('22 - debe tener títulos registrados', () => {
      expect(LISTINGS.every(listing => listing.title.trim().length > 0)).toBe(true);
    });

    it('23 - debe tener descripciones', () => {
      expect(LISTINGS.every(listing =>
        listing.description.trim().length > 0
      )).toBe(true);
    });

    it('24 - debe tener ciudades y direcciones', () => {
      expect(LISTINGS.every(listing =>
        listing.city.trim().length > 0 &&
        listing.address.trim().length > 0
      )).toBe(true);
    });

    it('25 - debe tener anfitriones existentes', () => {
      expect(LISTINGS.every(listing =>
        USERS.some(user => user.id === listing.hostId)
      )).toBe(true);
    });

    it('26 - debe asignar alojamientos a usuarios anfitriones', () => {
      expect(LISTINGS.every(listing =>
        USERS.some(user =>
          user.id === listing.hostId && user.role === 'host'
        )
      )).toBe(true);
    });

    it('27 - debe tener capacidad positiva', () => {
      expect(LISTINGS.every(listing => listing.capacity >= 1)).toBe(true);
    });

    it('28 - debe tener habitaciones y camas válidas', () => {
      expect(LISTINGS.every(listing =>
        listing.bedrooms >= 1 &&
        listing.beds >= 1 &&
        listing.bathrooms >= 1
      )).toBe(true);
    });

    it('29 - debe tener precios positivos', () => {
      expect(LISTINGS.every(listing => listing.price > 0)).toBe(true);
    });

    it('30 - debe tener tarifas de limpieza no negativas', () => {
      expect(LISTINGS.every(listing => listing.cleaningFee >= 0)).toBe(true);
    });

    it('31 - debe tener imágenes principales', () => {
      expect(LISTINGS.every(listing => listing.image.trim().length > 0)).toBe(true);
    });

    it('32 - debe tener galerías de imágenes', () => {
      expect(LISTINGS.every(listing => listing.images.length > 0)).toBe(true);
    });

    it('33 - debe incluir la imagen principal en la galería', () => {
      expect(LISTINGS.every(listing =>
        listing.images.includes(listing.image)
      )).toBe(true);
    });

    it('34 - debe tener servicios disponibles', () => {
      expect(LISTINGS.every(listing => listing.amenities.length > 0)).toBe(true);
    });

    it('35 - debe tener reglas registradas', () => {
      expect(LISTINGS.every(listing => listing.rules.length > 0)).toBe(true);
    });

    it('36 - debe tener calificaciones entre 0 y 5', () => {
      expect(LISTINGS.every(listing =>
        listing.rating >= 0 && listing.rating <= 5
      )).toBe(true);
    });

    it('37 - debe tener estados permitidos', () => {
      expect(LISTINGS.every(listing =>
        ['ACTIVA', 'PAUSADA', 'PENDIENTE_REVISION'].includes(listing.status)
      )).toBe(true);
    });

    it('38 - debe tener configuración de reserva inmediata', () => {
      expect(LISTINGS.every(listing =>
        typeof listing.instantBooking === 'boolean'
      )).toBe(true);
    });

    it('39 - debe tener políticas de cancelación', () => {
      expect(LISTINGS.every(listing =>
        listing.cancellationPolicy.trim().length > 0
      )).toBe(true);
    });
  });

  describe('Reservas', () => {

    it('40 - debe contener tres reservas', () => {
      expect(BOOKINGS).toHaveLength(3);
    });

    it('41 - debe tener códigos únicos', () => {
      const codes = BOOKINGS.map(booking => booking.code);
      expect(new Set(codes).size).toBe(codes.length);
    });

    it('42 - debe relacionar cada reserva con un alojamiento existente', () => {
      expect(BOOKINGS.every(booking =>
        LISTINGS.some(listing => listing.id === booking.listingId)
      )).toBe(true);
    });

    it('43 - debe relacionar cada reserva con un usuario existente', () => {
      expect(BOOKINGS.every(booking =>
        USERS.some(user => user.id === booking.guestId)
      )).toBe(true);
    });

    it('44 - debe tener fechas de salida posteriores a las de entrada', () => {
      expect(BOOKINGS.every(booking =>
        booking.checkOut > booking.checkIn
      )).toBe(true);
    });

    it('45 - debe tener cantidades positivas de huéspedes', () => {
      expect(BOOKINGS.every(booking => booking.guests >= 1)).toBe(true);
    });

    it('46 - debe tener totales positivos', () => {
      expect(BOOKINGS.every(booking => booking.total > 0)).toBe(true);
    });
  });

  describe('Notificaciones y auditoría', () => {

    it('47 - debe contener cuatro notificaciones', () => {
      expect(NOTIFICATIONS).toHaveLength(4);
    });

    it('48 - debe tener notificaciones con título y mensaje', () => {
      expect(NOTIFICATIONS.every(notification =>
        notification.title.trim().length > 0 &&
        notification.message.trim().length > 0
      )).toBe(true);
    });

    it('49 - debe contener cinco eventos de auditoría', () => {
      expect(AUDIT_EVENTS).toHaveLength(5);
    });

    it('50 - debe tener eventos de auditoría con información completa', () => {
      expect(AUDIT_EVENTS.every(event =>
        event.actor.trim().length > 0 &&
        event.action.trim().length > 0 &&
        event.entity.trim().length > 0 &&
        event.result.trim().length > 0 &&
        event.detail.trim().length > 0
      )).toBe(true);
    });
  });
});
