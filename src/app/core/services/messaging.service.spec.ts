
// @vitest-environment jsdom
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MessagingService } from './messaging.service';
import { SessionService } from './session.service';
import { CatalogService } from './catalog.service';
import { User } from '../models/marketplace.models';

try {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting()
  );
} catch (error) {
  if (
    !(error instanceof Error) ||
    !error.message.includes('already been initialized')
  ) {
    throw error;
  }
}

describe('MessagingService', () => {
  let service: MessagingService;

  const guest: User = {
    id: 1,
    name: 'Laura',
    email: 'laura@test.com',
    phone: '',
    role: 'guest',
    active: true,
    joinedAt: '2026-01-01'
  };

  const host: User = {
    id: 2,
    name: 'Anfitrion',
    email: 'host@test.com',
    phone: '',
    role: 'host',
    active: true,
    joinedAt: '2026-01-01'
  };

  const otherGuest: User = {
    id: 3,
    name: 'Otro huesped',
    email: 'otro@test.com',
    phone: '',
    role: 'guest',
    active: true,
    joinedAt: '2026-01-01'
  };

  const admin: User = {
    id: 4,
    name: 'Administrador',
    email: 'admin@test.com',
    phone: '',
    role: 'admin',
    active: true,
    joinedAt: '2026-01-01'
  };

  let usuarioActual: User | null;
  let alojamiento: { id: number; hostId: number } | null;

  const currentUser = vi.fn();
  const getById = vi.fn();

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();

    usuarioActual = null;
    alojamiento = { id: 101, hostId: 2 };

    currentUser.mockImplementation(() => usuarioActual);
    getById.mockImplementation((id: number) => {
      return alojamiento?.id === id ? alojamiento : null;
    });

    TestBed.configureTestingModule({
      providers: [
        MessagingService,
        {
          provide: SessionService,
          useValue: { currentUser }
        },
        {
          provide: CatalogService,
          useValue: { getById }
        }
      ]
    });

    service = TestBed.inject(MessagingService);
  });

  const iniciarComo = (usuario: User | null): void => {
    usuarioActual = usuario;
  };

  describe('Inicializacion', () => {
    it('debe crear el servicio', () => {
      expect(service).toBeTruthy();
    });

    it('debe iniciar sin conversaciones visibles cuando no hay sesion', () => {
      expect(service.conversations()).toEqual([]);
    });

    it('debe iniciar con una conversacion de ejemplo para el huesped', () => {
      iniciarComo(guest);

      expect(service.conversations()).toHaveLength(1);
    });

    it('debe iniciar con una conversacion de ejemplo para el anfitrion', () => {
      iniciarComo(host);

      expect(service.conversations()).toHaveLength(1);
    });

    it('no debe mostrar conversaciones ajenas', () => {
      iniciarComo(otherGuest);

      expect(service.conversations()).toEqual([]);
    });
  });

  describe('Listado de conversaciones', () => {
    it('debe mostrar las conversaciones del huesped', () => {
      iniciarComo(guest);

      const conversaciones = service.conversations();

      expect(conversaciones[0].guestId).toBe(guest.id);
    });

    it('debe mostrar las conversaciones del anfitrion', () => {
      iniciarComo(host);

      const conversaciones = service.conversations();

      expect(conversaciones[0].hostId).toBe(host.id);
    });

    it('debe ocultar las conversaciones al cerrar sesion', () => {
      iniciarComo(guest);
      expect(service.conversations()).toHaveLength(1);

      iniciarComo(null);

      expect(service.conversations()).toEqual([]);
    });

    it('debe devolver un arreglo de conversaciones', () => {
      iniciarComo(guest);

      expect(Array.isArray(service.conversations())).toBe(true);
    });
  });

  describe('Abrir conversaciones', () => {
    it('debe rechazar la apertura sin sesion', () => {
      iniciarComo(null);

      expect(service.open(101)).toBeNull();
    });

    it('debe rechazar alojamientos inexistentes', () => {
      iniciarComo(guest);

      expect(service.open(999)).toBeNull();
    });

    it('debe rechazar usuarios administradores', () => {
      iniciarComo(admin);

      expect(service.open(101)).toBeNull();
    });

    it('debe impedir conversar sobre un alojamiento propio', () => {
      iniciarComo(host);

      expect(service.open(101)).toBeNull();
    });

    it('debe recuperar una conversacion existente', () => {
      iniciarComo(guest);

      const conversacion = service.open(101);

      expect(conversacion?.id).toBe(1);
      expect(conversacion?.listingId).toBe(101);
    });

    it('no debe duplicar una conversacion existente', () => {
      iniciarComo(guest);

      service.open(101);
      service.open(101);

      expect(service.conversations()).toHaveLength(1);
    });

    it('debe crear una conversacion para otro huesped', () => {
      iniciarComo(otherGuest);

      const conversacion = service.open(101);

      expect(conversacion).not.toBeNull();
      expect(conversacion?.guestId).toBe(otherGuest.id);
      expect(conversacion?.hostId).toBe(host.id);
    });

    it('debe asignar un identificador a la nueva conversacion', () => {
      iniciarComo(otherGuest);

      const conversacion = service.open(101);

      expect(conversacion?.id).toBe(2);
    });

    it('debe permitir al anfitrion consultar una nueva conversacion', () => {
      iniciarComo(otherGuest);
      const conversacion = service.open(101);

      iniciarComo(host);

      expect(
        service.conversations().some(
          item => item.id === conversacion?.id
        )
      ).toBe(true);
    });

    it('debe permitir abrir conversaciones de distintos alojamientos', () => {
      iniciarComo(otherGuest);

      const primera = service.open(101);

      alojamiento = { id: 102, hostId: 2 };
      const segunda = service.open(102);

      expect(primera?.listingId).toBe(101);
      expect(segunda?.listingId).toBe(102);
      expect(primera?.id).not.toBe(segunda?.id);
    });
  });

  describe('Historial de mensajes', () => {
    it('debe impedir consultar historial sin sesion', () => {
      expect(service.history(1)).toEqual([]);
    });

    it('debe mostrar el historial a un participante', () => {
      iniciarComo(guest);

      expect(service.history(1)).toHaveLength(1);
    });

    it('debe ocultar el historial a usuarios ajenos', () => {
      iniciarComo(otherGuest);

      expect(service.history(1)).toEqual([]);
    });

    it('debe devolver vacio para conversaciones inexistentes', () => {
      iniciarComo(guest);

      expect(service.history(999)).toEqual([]);
    });

    it('debe incluir el mensaje inicial de ejemplo', () => {
      iniciarComo(guest);

      expect(service.history(1)[0].senderId).toBe(host.id);
      expect(service.history(1)[0].conversationId).toBe(1);
    });
  });

  describe('Envio de mensajes', () => {
    it('debe impedir enviar mensajes sin sesion', () => {
      expect(service.send(1, 'Hola')).toBe(false);
    });

    it('debe permitir enviar mensajes a un participante', () => {
      iniciarComo(guest);

      expect(service.send(1, 'Hola')).toBe(true);
    });

    it('debe agregar el mensaje al historial', () => {
      iniciarComo(guest);

      service.send(1, 'Mensaje de prueba');

      expect(service.history(1)).toHaveLength(2);
      expect(service.history(1)[1].content).toBe('Mensaje de prueba');
    });

    it('debe registrar el remitente del mensaje', () => {
      iniciarComo(guest);

      service.send(1, 'Hola');

      expect(service.history(1)[1].senderId).toBe(guest.id);
    });

    it('debe eliminar espacios al guardar el mensaje', () => {
      iniciarComo(guest);

      service.send(1, '  Hola, buenos dias  ');

      expect(service.history(1)[1].content).toBe('Hola, buenos dias');
    });

    it('debe rechazar mensajes vacios', () => {
      iniciarComo(guest);

      expect(service.send(1, '')).toBe(false);
      expect(service.history(1)).toHaveLength(1);
    });

    it('debe rechazar mensajes compuestos por espacios', () => {
      iniciarComo(guest);

      expect(service.send(1, '     ')).toBe(false);
    });

    it('debe rechazar mensajes mayores a 2000 caracteres', () => {
      iniciarComo(guest);

      expect(service.send(1, 'A'.repeat(2001))).toBe(false);
    });

    it('debe permitir mensajes de exactamente 2000 caracteres', () => {
      iniciarComo(guest);

      expect(service.send(1, 'A'.repeat(2000))).toBe(true);
    });

    it('debe impedir enviar mensajes a conversaciones ajenas', () => {
      iniciarComo(otherGuest);

      expect(service.send(1, 'Mensaje no autorizado')).toBe(false);
    });

    it('debe impedir enviar a conversaciones inexistentes', () => {
      iniciarComo(guest);

      expect(service.send(999, 'Hola')).toBe(false);
    });

    it('debe marcar el mensaje como leido por su remitente', () => {
      iniciarComo(guest);

      service.send(1, 'Hola');

      expect(service.history(1)[1].readBy).toContain(guest.id);
    });

    it('debe registrar la fecha de envio', () => {
      iniciarComo(guest);

      service.send(1, 'Hola');

      const fecha = service.history(1)[1].sentAt;

      expect(Number.isNaN(Date.parse(fecha))).toBe(false);
    });
  });

  describe('Lectura y mensajes no leidos', () => {
    it('debe contar los mensajes no leidos del huesped', () => {
      iniciarComo(guest);

      expect(service.unread(1)).toBe(1);
    });

    it('no debe contar como pendiente un mensaje leido por el anfitrion', () => {
      iniciarComo(host);

      expect(service.unread(1)).toBe(0);
    });

    it('debe marcar los mensajes como leidos', () => {
      iniciarComo(guest);

      service.read(1);

      expect(service.unread(1)).toBe(0);
    });

    it('debe agregar al usuario a la lista de lectores', () => {
      iniciarComo(guest);

      service.read(1);

      expect(service.history(1)[0].readBy).toContain(guest.id);
    });

    it('no debe duplicar la marca de lectura', () => {
      iniciarComo(guest);

      service.read(1);
      service.read(1);

      const lectores = service.history(1)[0].readBy;

      expect(
        lectores.filter(id => id === guest.id)
      ).toHaveLength(1);
    });

    it('no debe permitir leer conversaciones ajenas', () => {
      iniciarComo(otherGuest);

      service.read(1);

      iniciarComo(guest);

      expect(service.unread(1)).toBe(1);
    });

    it('no debe modificar mensajes si no hay sesion', () => {
      service.read(1);

      iniciarComo(guest);

      expect(service.unread(1)).toBe(1);
    });

    it('debe contar como no leido un mensaje del otro participante', () => {
      iniciarComo(guest);
      service.send(1, 'Mensaje para anfitrion');

      iniciarComo(host);

      expect(service.unread(1)).toBe(1);
    });

    it('debe actualizar el contador despues de leer mensajes', () => {
      iniciarComo(guest);
      service.send(1, 'Mensaje para anfitrion');

      iniciarComo(host);

      expect(service.unread(1)).toBe(1);

      service.read(1);

      expect(service.unread(1)).toBe(0);
    });
  });
});
