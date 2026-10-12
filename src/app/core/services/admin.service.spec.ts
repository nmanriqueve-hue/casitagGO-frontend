
// @vitest-environment jsdom
import '@angular/compiler';

import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminService } from './admin.service';
import { SessionService } from './session.service';
import { AUDIT_EVENTS, NOTIFICATIONS } from './mock-data';

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

describe('AdminService', () => {
  let service: AdminService;
  let toggleUserMock: ReturnType<typeof vi.fn>;

  const usuariosIniciales = [
    { id: 1, name: 'Usuario uno', active: true },
    { id: 2, name: 'Usuario dos', active: false }
  ];

  let usuariosSignal: ReturnType<typeof signal<typeof usuariosIniciales>>;

  beforeEach(() => {
    TestBed.resetTestingModule();

    usuariosSignal = signal(
      usuariosIniciales.map(usuario => ({ ...usuario }))
    );

    toggleUserMock = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AdminService,
        {
          provide: SessionService,
          useValue: {
            users: usuariosSignal,
            toggleUser: toggleUserMock
          }
        }
      ]
    });

    service = TestBed.inject(AdminService);
  });

  describe('Inicialización', () => {
    it('debe crear el servicio', () => {
      expect(service).toBeTruthy();
    });

    it('debe ser una instancia de AdminService', () => {
      expect(service).toBeInstanceOf(AdminService);
    });

    it('debe exponer los usuarios de la sesión', () => {
      expect(service.users()).toEqual(usuariosIniciales);
    });

    it('debe iniciar con las notificaciones configuradas', () => {
      expect(service.notifications()).toEqual(NOTIFICATIONS);
    });

    it('debe exponer los eventos de auditoría', () => {
      expect(service.auditEvents).toEqual(AUDIT_EVENTS);
    });

    it('debe mantener la referencia de los eventos de auditoría', () => {
      expect(service.auditEvents).toBe(AUDIT_EVENTS);
    });
  });

  describe('Administración de usuarios', () => {
    it('debe delegar el cambio de estado de un usuario', () => {
      service.toggleUser(1);

      expect(toggleUserMock).toHaveBeenCalledWith(1);
    });

    it('debe llamar una sola vez al servicio de sesión', () => {
      service.toggleUser(2);

      expect(toggleUserMock).toHaveBeenCalledTimes(1);
    });

    it('debe permitir cambiar distintos usuarios', () => {
      service.toggleUser(1);
      service.toggleUser(2);

      expect(toggleUserMock).toHaveBeenNthCalledWith(1, 1);
      expect(toggleUserMock).toHaveBeenNthCalledWith(2, 2);
    });

    it('debe delegar identificadores inexistentes', () => {
      service.toggleUser(999);

      expect(toggleUserMock).toHaveBeenCalledWith(999);
    });

    it('no debe llamar toggleUser durante la inicialización', () => {
      expect(toggleUserMock).not.toHaveBeenCalled();
    });

    it('debe reflejar cambios realizados en la sesión', () => {
      usuariosSignal.update(usuarios =>
        usuarios.map(usuario =>
          usuario.id === 1
            ? { ...usuario, active: false }
            : usuario
        )
      );

      expect(service.users()[0].active).toBe(false);
    });

    it('debe reflejar usuarios nuevos de la sesión', () => {
      usuariosSignal.update(usuarios => [
        ...usuarios,
        { id: 3, name: 'Usuario tres', active: true }
      ]);

      expect(service.users()).toHaveLength(3);
    });

    it('debe reflejar la eliminación de usuarios en la sesión', () => {
      usuariosSignal.update(usuarios =>
        usuarios.filter(usuario => usuario.id !== 1)
      );

      expect(service.users()).toHaveLength(1);
      expect(service.users()[0].id).toBe(2);
    });

    it('debe mantener los usuarios como señal de solo lectura', () => {
      expect(typeof service.users).toBe('function');
      expect('set' in service.users).toBe(false);
      expect('update' in service.users).toBe(false);
    });
  });

  describe('Notificaciones iniciales', () => {
    it('debe mantener la cantidad inicial de notificaciones', () => {
      expect(service.notifications().length)
        .toBe(NOTIFICATIONS.length);
    });

    it('debe copiar las notificaciones iniciales', () => {
      expect(service.notifications()).not.toBe(NOTIFICATIONS);
    });

    it('debe crear copias de los objetos de notificación', () => {
      const notificaciones = service.notifications();

      notificaciones.forEach((item, index) => {
        expect(item).not.toBe(NOTIFICATIONS[index]);
      });
    });

    it('debe conservar los identificadores originales', () => {
      expect(service.notifications().map(item => item.id))
        .toEqual(NOTIFICATIONS.map(item => item.id));
    });

    it('debe conservar el estado inicial de lectura', () => {
      expect(service.notifications().map(item => item.read))
        .toEqual(NOTIFICATIONS.map(item => item.read));
    });

    it('debe exponer notificaciones como señal de solo lectura', () => {
      expect(typeof service.notifications).toBe('function');
      expect('set' in service.notifications).toBe(false);
      expect('update' in service.notifications).toBe(false);
    });
  });

  describe('Marcar una notificación', () => {
    it('debe marcar como leída una notificación existente', () => {
      const notificacion = service.notifications()[0];

      if (!notificacion) return;

      service.markNotification(notificacion.id);

      expect(
        service.notifications().find(
          item => item.id === notificacion.id
        )?.read
      ).toBe(true);
    });

    it('debe conservar la cantidad de notificaciones', () => {
      const cantidad = service.notifications().length;

      service.markNotification(1);

      expect(service.notifications()).toHaveLength(cantidad);
    });

    it('debe conservar los identificadores', () => {
      const ids = service.notifications().map(item => item.id);

      service.markNotification(1);

      expect(service.notifications().map(item => item.id))
        .toEqual(ids);
    });

    it('debe conservar el orden de las notificaciones', () => {
      const idsAntes = service.notifications().map(item => item.id);

      service.markNotification(1);

      const idsDespues = service.notifications().map(item => item.id);

      expect(idsDespues).toEqual(idsAntes);
    });

    it('debe permitir marcar la misma notificación varias veces', () => {
      const notificacion = service.notifications()[0];

      if (!notificacion) return;

      service.markNotification(notificacion.id);
      service.markNotification(notificacion.id);

      expect(
        service.notifications().find(
          item => item.id === notificacion.id
        )?.read
      ).toBe(true);
    });

    it('no debe modificar datos del archivo mock-data', () => {
      const originales = NOTIFICATIONS.map(item => ({ ...item }));

      const notificacion = service.notifications()[0];

      if (notificacion) {
        service.markNotification(notificacion.id);
      }

      expect(NOTIFICATIONS).toEqual(originales);
    });

    it('debe conservar las demás propiedades de una notificación', () => {
      const notificacion = service.notifications()[0];

      if (!notificacion) return;

      const original = { ...notificacion };

      service.markNotification(notificacion.id);

      const actualizada = service.notifications().find(
        item => item.id === notificacion.id
      );

      expect(actualizada).toEqual({
        ...original,
        read: true
      });
    });

    it('debe mantener las notificaciones no seleccionadas', () => {
      const notificacionesAntes = service.notifications()
        .map(item => ({ ...item }));

      const seleccionada = notificacionesAntes[0];

      if (!seleccionada) return;

      service.markNotification(seleccionada.id);

      service.notifications().forEach(item => {
        if (item.id !== seleccionada.id) {
          expect(item).toEqual(
            notificacionesAntes.find(
              anterior => anterior.id === item.id
            )
          );
        }
      });
    });

    it('debe ignorar identificadores inexistentes', () => {
      const originales = service.notifications()
        .map(item => ({ ...item }));

      service.markNotification(-999);

      expect(service.notifications()).toEqual(originales);
    });
  });

  describe('Marcar todas las notificaciones', () => {
    it('debe marcar todas como leídas', () => {
      service.markAllNotifications();

      expect(
        service.notifications().every(item => item.read === true)
      ).toBe(true);
    });

    it('debe conservar la cantidad de notificaciones', () => {
      const cantidad = service.notifications().length;

      service.markAllNotifications();

      expect(service.notifications()).toHaveLength(cantidad);
    });

    it('debe conservar los identificadores originales', () => {
      const ids = service.notifications().map(item => item.id);

      service.markAllNotifications();

      expect(service.notifications().map(item => item.id))
        .toEqual(ids);
    });

    it('debe conservar el orden de las notificaciones', () => {
      const ids = service.notifications().map(item => item.id);

      service.markAllNotifications();

      expect(service.notifications().map(item => item.id))
        .toEqual(ids);
    });

    it('debe permitir marcar todas varias veces', () => {
      service.markAllNotifications();
      service.markAllNotifications();

      expect(
        service.notifications().every(item => item.read)
      ).toBe(true);
    });

    it('no debe modificar las notificaciones originales', () => {
      const originales = NOTIFICATIONS.map(item => ({ ...item }));

      service.markAllNotifications();

      expect(NOTIFICATIONS).toEqual(originales);
    });

    it('debe conservar las demás propiedades', () => {
      const originales = service.notifications()
        .map(item => ({ ...item }));

      service.markAllNotifications();

      expect(service.notifications()).toEqual(
        originales.map(item => ({
          ...item,
          read: true
        }))
      );
    });

    it('debe funcionar después de marcar una notificación', () => {
      const primera = service.notifications()[0];

      if (primera) {
        service.markNotification(primera.id);
      }

      service.markAllNotifications();

      expect(
        service.notifications().every(item => item.read)
      ).toBe(true);
    });
  });

  describe('Independencia de funcionalidades', () => {
    it('marcar notificaciones no debe cambiar los usuarios', () => {
      const usuariosAntes = service.users()
        .map(usuario => ({ ...usuario }));

      service.markAllNotifications();

      expect(service.users()).toEqual(usuariosAntes);
    });

    it('cambiar usuarios no debe modificar notificaciones', () => {
      const notificacionesAntes = service.notifications()
        .map(item => ({ ...item }));

      service.toggleUser(1);

      expect(service.notifications()).toEqual(notificacionesAntes);
    });

    it('marcar notificaciones no debe modificar auditoría', () => {
      const auditoriaAntes = [...service.auditEvents];

      service.markAllNotifications();

      expect(service.auditEvents).toEqual(auditoriaAntes);
    });
  });
});
