// @vitest-environment jsdom
import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { BookingService } from './booking.service';
import { SessionService } from './session.service';
import { AvailabilityService } from './availability.service';
import { Listing, User } from '../models/marketplace.models';
TestBed.initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);
describe('BookingService', () => {
  let service: BookingService;
  const usuario = signal<User | null>(null);
  const bloqueado = vi.fn<(id: number, inicio: string, fin: string) => boolean>();
  const sesionSimulada = {
    currentUser: usuario,
    role: () => usuario()?.role ?? null
  };
  const disponibilidadSimulada = {
    blocked: bloqueado
  };
  const alojamiento: Listing = {
    id: 9999,
    hostId: 10,
    title: 'Apartamento de prueba',
    description: 'Alojamiento para pruebas',
    city: 'Bogotá',
    address: 'Dirección de prueba',
    type: 'Apartamento',
    capacity: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    price: 100000,
    cleaningFee: 20000,
    amenities: [],
    rules: [],
    image: '',
    images: [],
    rating: 0,
    reviewsCount: 0,
    status: 'ACTIVA',
    instantBooking: true,
    cancellationPolicy: 'Flexible'
  };
  const huesped: User = {
    id: 1,
    name: 'Huésped de prueba',
    email: 'huesped@test.com',
    phone: '',
    role: 'guest',
    active: true,
    joinedAt: '2026-01-01'
  };
  const anfitrion: User = {
    ...huesped,
    id: 10,
    role: 'host'
  };
  const administrador: User = {
    ...huesped,
    id: 20,
    role: 'admin'
  };
  const llegada = '2099-11-10';
  const salida = '2099-11-12';
  beforeEach(() => {
    TestBed.resetTestingModule();
    usuario.set(huesped);
    bloqueado.mockReset();
    bloqueado.mockReturnValue(false);
    TestBed.configureTestingModule({
      providers: [
        BookingService,
        { provide: SessionService, useValue: sesionSimulada },
        { provide: AvailabilityService, useValue: disponibilidadSimulada }
      ]
    });
    service = TestBed.inject(BookingService);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
  });
  describe('quote', () => {
    it('calcula una noche correctamente', () => {
      const q = service.quote(alojamiento, '2099-11-10', '2099-11-11');
      expect(q.nights).toBe(1);
      expect(q.base).toBe(100000);
      expect(q.cleaning).toBe(20000);
      expect(q.service).toBe(12000);
      expect(q.total).toBe(132000);
    });
    it('calcula varias noches', () => {
      const q = service.quote(alojamiento, '2099-11-10', '2099-11-13');
      expect(q.nights).toBe(3);
      expect(q.base).toBe(300000);
      expect(q.total).toBe(352000);
    });
    it('incluye servicios adicionales', () => {
      const q = service.quote(alojamiento, '2099-11-10', '2099-11-11', 30000);
      expect(q.extras).toBe(30000);
      expect(q.service).toBe(15000);
      expect(q.total).toBe(165000);
    });
    it('aplica descuento del 8 por ciento desde siete noches', () => {
      const q = service.quote(alojamiento, '2099-11-10', '2099-11-17');
      expect(q.nights).toBe(7);
      expect(q.discount).toBe(56000);
      expect(q.total).toBe(736000);
    });
    it('no aplica descuento antes de siete noches', () => {
      const q = service.quote(alojamiento, '2099-11-10', '2099-11-16');
      expect(q.discount).toBe(0);
    });
    it('calcula extras y descuento simultáneamente', () => {
      const q = service.quote(alojamiento, '2099-11-10', '2099-11-17', 30000);
      expect(q.service).toBe(75000);
      expect(q.discount).toBe(56000);
      expect(q.total).toBe(769000);
    });
  });
  describe('available', () => {
    it('permite fechas disponibles', () => {
      expect(service.available(alojamiento.id, llegada, salida)).toBe(true);
    });
    it('rechaza fechas bloqueadas', () => {
      bloqueado.mockReturnValue(true);
      expect(service.available(alojamiento.id, llegada, salida)).toBe(false);
    });
    it('rechaza fechas ocupadas por una reserva confirmada', () => {
      const q = service.quote(alojamiento, llegada, salida);
      service.create(alojamiento, huesped.id, llegada, salida, 2, q);
      expect(service.available(alojamiento.id, llegada, salida)).toBe(false);
    });
    it('permite fechas consecutivas sin superposición', () => {
      const q = service.quote(alojamiento, llegada, salida);
      service.create(alojamiento, huesped.id, llegada, salida, 2, q);
      expect(service.available(alojamiento.id, salida, '2099-11-14')).toBe(true);
    });
  });
  describe('validation', () => {
    it('acepta una reserva válida', () => {
      expect(service.validation(alojamiento, llegada, salida, 2)).toBe('');
    });
    it('rechaza usuarios sin sesión', () => {
      usuario.set(null);
      expect(service.validation(alojamiento, llegada, salida, 2))
        .toBe('Tu rol no permite hacer reservas.');
    });
    it('rechaza administradores', () => {
      usuario.set(administrador);
      expect(service.validation(alojamiento, llegada, salida, 2))
        .toBe('Tu rol no permite hacer reservas.');
    });
    it('impide reservar el propio alojamiento', () => {
      usuario.set(anfitrion);
      expect(service.validation(alojamiento, llegada, salida, 2))
        .toBe('No puedes reservar tu propio alojamiento.');
    });
    it('rechaza fechas anteriores a hoy', () => {
      expect(service.validation(alojamiento, '2020-01-01', '2020-01-03', 2))
        .toBe('La fecha de llegada no puede estar en el pasado.');
    });
    it('rechaza salida anterior o igual a llegada', () => {
      expect(service.validation(alojamiento, llegada, llegada, 2))
        .toBe('La salida debe ser posterior a la llegada.');
    });
    it('rechaza cero huéspedes', () => {
      expect(service.validation(alojamiento, llegada, salida, 0))
        .not.toBe('');
    });
    it('rechaza más huéspedes que la capacidad', () => {
      expect(service.validation(alojamiento, llegada, salida, 5))
        .not.toBe('');
    });
    it('rechaza cantidades decimales de huéspedes', () => {
      expect(service.validation(alojamiento, llegada, salida, 1.5))
        .not.toBe('');
    });
    it('rechaza publicaciones inactivas', () => {
      expect(service.validation(
        { ...alojamiento, status: 'PAUSADA' },
        llegada, salida, 2
      )).not.toBe('');
    });
    it('rechaza periodos bloqueados', () => {
      bloqueado.mockReturnValue(true);
      expect(service.validation(alojamiento, llegada, salida, 2))
        .not.toBe('');
    });
  });
  describe('create', () => {
    it('crea una reserva confirmada cuando es inmediata', () => {
      const q = service.quote(alojamiento, llegada, salida);
      const reserva = service.create(
        alojamiento, huesped.id, llegada, salida, 2, q
      );
      expect(reserva.listingId).toBe(alojamiento.id);
      expect(reserva.guestId).toBe(huesped.id);
      expect(reserva.status).toBe('CONFIRMADA');
      expect(reserva.total).toBe(q.total);
      expect(reserva.reviewed).toBe(false);
      expect(service.bookings().some(b => b.id === reserva.id)).toBe(true);
    });
    it('crea una reserva en revisión cuando no es inmediata', () => {
      const publicacion = { ...alojamiento, instantBooking: false };
      const q = service.quote(publicacion, llegada, salida);
      const reserva = service.create(
        publicacion, huesped.id, llegada, salida, 2, q
      );
      expect(reserva.status).toBe('EN_REVISION');
    });
    it('impide reservar en nombre de otra cuenta', () => {
      const q = service.quote(alojamiento, llegada, salida);
      expect(() => service.create(
        alojamiento, 999, llegada, salida, 2, q
      )).toThrow('No puedes reservar en nombre de otra cuenta.');
    });
    it('impide crear reservas con fechas bloqueadas', () => {
      bloqueado.mockReturnValue(true);
      const q = service.quote(alojamiento, llegada, salida);
      expect(() => service.create(
        alojamiento, huesped.id, llegada, salida, 2, q
      )).toThrow();
    });
  });
  describe('cancel', () => {
    it('permite cancelar una reserva propia vigente', () => {
      const q = service.quote(alojamiento, llegada, salida);
      const reserva = service.create(
        alojamiento, huesped.id, llegada, salida, 2, q
      );
      service.cancel(reserva.id);
      expect(service.bookings().find(b => b.id === reserva.id)?.status)
        .toBe('CANCELADA');
    });
    it('impide cancelar reservas de otro usuario', () => {
      const q = service.quote(alojamiento, llegada, salida);
      const reserva = service.create(
        alojamiento, huesped.id, llegada, salida, 2, q
      );
      usuario.set({ ...huesped, id: 50 });
      service.cancel(reserva.id);
      expect(service.bookings().find(b => b.id === reserva.id)?.status)
        .toBe('CONFIRMADA');
    });
    it('ignora identificadores inexistentes', () => {
      expect(() => service.cancel(-999)).not.toThrow();
    });
  });
  describe('canReview', () => {
    it('permite reseñar una reserva confirmada propia', () => {
      const q = service.quote(alojamiento, llegada, salida);
      const reserva = service.create(
        alojamiento, huesped.id, llegada, salida, 2, q
      );
      expect(service.canReview(reserva.id)).toBe(true);
    });
    it('impide reseñar reservas ajenas', () => {
      const q = service.quote(alojamiento, llegada, salida);
      const reserva = service.create(
        alojamiento, huesped.id, llegada, salida, 2, q
      );
      usuario.set({ ...huesped, id: 50 });
      expect(service.canReview(reserva.id)).toBe(false);
    });
    it('impide reseñar una reserva cancelada', () => {
      const q = service.quote(alojamiento, llegada, salida);
      const reserva = service.create(
        alojamiento, huesped.id, llegada, salida, 2, q
      );
      service.cancel(reserva.id);
      expect(service.canReview(reserva.id)).toBe(false);
    });
    it('impide reseñar una reserva en revisión', () => {
      const publicacion = { ...alojamiento, instantBooking: false };
      const q = service.quote(publicacion, llegada, salida);
      const reserva = service.create(
        publicacion, huesped.id, llegada, salida, 2, q
      );
      expect(service.canReview(reserva.id)).toBe(false);
    });
  });
  describe('hostDecision', () => {
    it('permite al anfitrión confirmar una reserva pendiente', () => {
      const publicacion = { ...alojamiento, instantBooking: false };
      const q = service.quote(publicacion, llegada, salida);
      const reserva = service.create(
        publicacion, huesped.id, llegada, salida, 2, q
      );
      usuario.set(anfitrion);
      service.hostDecision(reserva.id, publicacion, 'CONFIRMADA');
      expect(service.bookings().find(b => b.id === reserva.id)?.status)
        .toBe('CONFIRMADA');
    });
    it('impide decisiones de usuarios que no son anfitriones', () => {
      const publicacion = { ...alojamiento, instantBooking: false };
      const q = service.quote(publicacion, llegada, salida);
      const reserva = service.create(
        publicacion, huesped.id, llegada, salida, 2, q
      );
      service.hostDecision(reserva.id, publicacion, 'CONFIRMADA');
      expect(service.bookings().find(b => b.id === reserva.id)?.status)
        .toBe('EN_REVISION');
    });
    it('permite al anfitrión rechazar una reserva pendiente', () => {
      const publicacion = { ...alojamiento, instantBooking: false };
      const q = service.quote(publicacion, llegada, salida);
      const reserva = service.create(
        publicacion, huesped.id, llegada, salida, 2, q
      );
      usuario.set(anfitrion);
      service.hostDecision(reserva.id, publicacion, 'CANCELADA');
      expect(service.bookings().find(b => b.id === reserva.id)?.status)
        .toBe('CANCELADA');
    });
  });
  describe('markReviewed', () => {
    it('marca una reserva como reseñada', () => {
      const q = service.quote(alojamiento, llegada, salida);
      const reserva = service.create(
        alojamiento, huesped.id, llegada, salida, 2, q
      );
      service.markReviewed(reserva.id);
      expect(service.bookings().find(b => b.id === reserva.id)?.reviewed)
        .toBe(true);
      expect(service.canReview(reserva.id)).toBe(false);
    });
    it('impide publicar dos reseñas de la misma reserva', () => {
      const q = service.quote(alojamiento, llegada, salida);
      const reserva = service.create(
        alojamiento, huesped.id, llegada, salida, 2, q
      );
      service.markReviewed(reserva.id);
      expect(() => service.markReviewed(reserva.id)).toThrow();
    });
    it('rechaza reseñas de reservas inexistentes', () => {
      expect(() => service.markReviewed(-999)).toThrow();
    });
  });
});
