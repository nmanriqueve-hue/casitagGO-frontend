
// @vitest-environment jsdom
import '@angular/compiler';

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { signal } from '@angular/core';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NotificacionesBackService,
  NotificacionBack
} from './notificaciones-back.service';
import { SessionService } from './session.service';
import { API_URL } from '../config/api.config';

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

describe('NotificacionesBackService', () => {
  let service: NotificacionesBackService;
  let httpGet: ReturnType<typeof vi.fn>;
  let httpPatch: ReturnType<typeof vi.fn>;
  let usuarioActual: ReturnType<typeof signal<string | null>>;

  const notificaciones: NotificacionBack[] = [
    {
      id: 'notificacion-1',
      creadoEn: '2026-10-01T10:00:00',
      tipoEvento: 'RESERVA',
      mensaje: 'Nueva reserva recibida',
      leida: false
    },
    {
      id: 'notificacion-2',
      creadoEn: '2026-10-03T12:00:00',
      tipoEvento: 'MENSAJE',
      mensaje: 'Nuevo mensaje recibido',
      leida: false
    },
    {
      id: 'notificacion-3',
      creadoEn: '2026-10-02T09:00:00',
      tipoEvento: 'PUBLICACION',
      mensaje: 'Publicación aprobada',
      leida: true
    }
  ];

  const crearNotificaciones = (): NotificacionBack[] =>
    notificaciones.map((n) => ({ ...n }));

  const establecerLista = (items: NotificacionBack[]) => {
    service.lista.set(items.map((n) => ({ ...n })));
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    httpGet = vi.fn().mockReturnValue(of([]));
    httpPatch = vi.fn().mockReturnValue(of(null));
    usuarioActual = signal<string | null>(null);

    TestBed.configureTestingModule({
      providers: [
        NotificacionesBackService,
        {
          provide: HttpClient,
          useValue: {
            get: httpGet,
            patch: httpPatch
          }
        },
        {
          provide: SessionService,
          useValue: {
            currentUser: usuarioActual
          }
        }
      ]
    });

    service = TestBed.inject(NotificacionesBackService);
    TestBed.flushEffects();
  });

  describe('Inicialización', () => {
    it('debe crear el servicio', () => {
      expect(service).toBeTruthy();
    });

    it('debe iniciar con lista vacía', () => {
      expect(service.lista()).toEqual([]);
    });

    it('debe iniciar sin estar cargando', () => {
      expect(service.cargando()).toBe(false);
    });

    it('debe iniciar sin error de carga', () => {
      expect(service.errorCarga()).toBe('');
    });

    it('debe iniciar con cero notificaciones no leídas', () => {
      expect(service.noLeidas()).toBe(0);
    });

    it('no debe consultar notificaciones sin usuario', () => {
      expect(httpGet).not.toHaveBeenCalled();
    });
  });

  describe('Carga de notificaciones', () => {
    it('debe consultar el endpoint correcto', () => {
      service.cargar();

      expect(httpGet).toHaveBeenCalledWith(
        `${API_URL}/api/notificaciones/mias`
      );
    });

    it('debe guardar las notificaciones recibidas', () => {
      httpGet.mockReturnValue(of(crearNotificaciones()));

      service.cargar();

      expect(service.lista()).toHaveLength(3);
    });

    it('debe ordenar las notificaciones de más reciente a más antigua', () => {
      httpGet.mockReturnValue(of(crearNotificaciones()));

      service.cargar();

      expect(service.lista().map((n) => n.id)).toEqual([
        'notificacion-2',
        'notificacion-3',
        'notificacion-1'
      ]);
    });

    it('debe conservar el mensaje de cada notificación', () => {
      httpGet.mockReturnValue(of(crearNotificaciones()));

      service.cargar();

      expect(service.lista().find((n) => n.id === 'notificacion-1')?.mensaje)
        .toBe('Nueva reserva recibida');
    });

    it('debe conservar el tipo de evento', () => {
      httpGet.mockReturnValue(of(crearNotificaciones()));

      service.cargar();

      expect(service.lista().find((n) => n.id === 'notificacion-2')?.tipoEvento)
        .toBe('MENSAJE');
    });

    it('debe conservar el estado de lectura', () => {
      httpGet.mockReturnValue(of(crearNotificaciones()));

      service.cargar();

      expect(service.lista().find((n) => n.id === 'notificacion-3')?.leida)
        .toBe(true);
    });

    it('debe aceptar una lista vacía', () => {
      httpGet.mockReturnValue(of([]));

      service.cargar();

      expect(service.lista()).toEqual([]);
    });

    it('debe reemplazar las notificaciones anteriores', () => {
      establecerLista(crearNotificaciones());
      httpGet.mockReturnValue(of([]));

      service.cargar();

      expect(service.lista()).toEqual([]);
    });

    it('debe activar cargando mientras espera la respuesta', () => {
      const respuesta = new Subject<NotificacionBack[]>();
      httpGet.mockReturnValue(respuesta.asObservable());

      service.cargar();

      expect(service.cargando()).toBe(true);

      respuesta.next([]);
      respuesta.complete();

      expect(service.cargando()).toBe(false);
    });

    it('debe desactivar cargando al recibir los datos', () => {
      httpGet.mockReturnValue(of(crearNotificaciones()));

      service.cargar();

      expect(service.cargando()).toBe(false);
    });

    it('debe limpiar errores anteriores antes de cargar', () => {
      service.errorCarga.set('Error anterior');
      httpGet.mockReturnValue(of([]));

      service.cargar();

      expect(service.errorCarga()).toBe('');
    });

    it('debe mostrar el mensaje de error recibido del backend', () => {
      httpGet.mockReturnValue(
        throwError(() => new HttpErrorResponse({
          status: 500,
          error: 'Error al obtener notificaciones'
        }))
      );

      service.cargar();

      expect(service.errorCarga())
        .toBe('Error al obtener notificaciones');
    });

    it('debe mostrar un mensaje genérico cuando el backend no envía texto', () => {
      httpGet.mockReturnValue(
        throwError(() => new HttpErrorResponse({
          status: 500,
          error: { mensaje: 'Error interno' }
        }))
      );

      service.cargar();

      expect(service.errorCarga())
        .toBe('No se pudieron cargar las notificaciones.');
    });

    it('debe mostrar mensaje genérico cuando el error es texto vacío', () => {
      httpGet.mockReturnValue(
        throwError(() => new HttpErrorResponse({
          status: 500,
          error: ''
        }))
      );

      service.cargar();

      expect(service.errorCarga())
        .toBe('No se pudieron cargar las notificaciones.');
    });

    it('debe desactivar cargando cuando ocurre un error', () => {
      httpGet.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 }))
      );

      service.cargar();

      expect(service.cargando()).toBe(false);
    });

    it('debe ordenar correctamente notificaciones sin fecha', () => {
      httpGet.mockReturnValue(of([
        {
          id: 'sin-fecha',
          creadoEn: null,
          tipoEvento: 'SISTEMA',
          mensaje: 'Sin fecha',
          leida: false
        },
        {
          id: 'con-fecha',
          creadoEn: '2026-10-05T10:00:00',
          tipoEvento: 'RESERVA',
          mensaje: 'Con fecha',
          leida: false
        }
      ]));

      service.cargar();

      expect(service.lista()[0].id).toBe('con-fecha');
      expect(service.lista()[1].id).toBe('sin-fecha');
    });
  });

  describe('Contador de notificaciones no leídas', () => {
    it('debe contar únicamente las no leídas', () => {
      establecerLista(crearNotificaciones());

      expect(service.noLeidas()).toBe(2);
    });

    it('debe devolver cero cuando todas están leídas', () => {
      establecerLista(
        crearNotificaciones().map((n) => ({ ...n, leida: true }))
      );

      expect(service.noLeidas()).toBe(0);
    });

    it('debe contar todas cuando ninguna está leída', () => {
      establecerLista(
        crearNotificaciones().map((n) => ({ ...n, leida: false }))
      );

      expect(service.noLeidas()).toBe(3);
    });

    it('debe actualizar el contador al agregar una notificación', () => {
      establecerLista([notificaciones[0]]);

      expect(service.noLeidas()).toBe(1);

      service.lista.update((items) => [
        ...items,
        { ...notificaciones[1] }
      ]);

      expect(service.noLeidas()).toBe(2);
    });

    it('debe actualizar el contador al eliminar una notificación', () => {
      establecerLista(crearNotificaciones());

      service.lista.update((items) =>
        items.filter((n) => n.id !== 'notificacion-1')
      );

      expect(service.noLeidas()).toBe(1);
    });
  });

  describe('Marcar una notificación como leída', () => {
    beforeEach(() => {
      establecerLista(crearNotificaciones());
    });

    it('debe marcar como leída la notificación indicada', () => {
      service.marcar('notificacion-1');

      expect(service.lista().find((n) => n.id === 'notificacion-1')?.leida)
        .toBe(true);
    });

    it('debe enviar PATCH al endpoint correcto', () => {
      service.marcar('notificacion-1');

      expect(httpPatch).toHaveBeenCalledWith(
        `${API_URL}/api/notificaciones/notificacion-1/leida`,
        null
      );
    });

    it('debe realizar una sola solicitud PATCH', () => {
      service.marcar('notificacion-1');

      expect(httpPatch).toHaveBeenCalledTimes(1);
    });

    it('no debe modificar las otras notificaciones', () => {
      service.marcar('notificacion-1');

      expect(service.lista().find((n) => n.id === 'notificacion-2')?.leida)
        .toBe(false);
    });

    it('debe reducir el contador de no leídas', () => {
      service.marcar('notificacion-1');

      expect(service.noLeidas()).toBe(1);
    });

    it('no debe enviar PATCH para un identificador inexistente', () => {
      service.marcar('inexistente');

      expect(httpPatch).not.toHaveBeenCalled();
    });

    it('no debe modificar la lista para un identificador inexistente', () => {
      const anterior = service.lista();

      service.marcar('inexistente');

      expect(service.lista()).toBe(anterior);
    });

    it('no debe enviar PATCH si ya estaba leída', () => {
      service.marcar('notificacion-3');

      expect(httpPatch).not.toHaveBeenCalled();
    });

    it('no debe volver a marcar una notificación ya leída', () => {
      service.marcar('notificacion-1');
      service.marcar('notificacion-1');

      expect(httpPatch).toHaveBeenCalledTimes(1);
    });

    it('debe recargar las notificaciones si falla PATCH', () => {
      httpPatch.mockReturnValue(
        throwError(() => new Error('Error PATCH'))
      );

      httpGet.mockReturnValue(of(crearNotificaciones()));

      service.marcar('notificacion-1');

      expect(httpGet).toHaveBeenCalledWith(
        `${API_URL}/api/notificaciones/mias`
      );
    });

    it('debe restaurar el estado recibido del backend después de un error', () => {
      httpPatch.mockReturnValue(
        throwError(() => new Error('Error PATCH'))
      );
      httpGet.mockReturnValue(of(crearNotificaciones()));

      service.marcar('notificacion-1');

      expect(service.lista().find((n) => n.id === 'notificacion-1')?.leida)
        .toBe(false);
    });
  });

  describe('Marcar todas las notificaciones como leídas', () => {
    beforeEach(() => {
      establecerLista(crearNotificaciones());
    });

    it('debe marcar todas como leídas', () => {
      service.marcarTodas();

      expect(service.lista().every((n) => n.leida)).toBe(true);
    });

    it('debe enviar PATCH por cada notificación pendiente', () => {
      service.marcarTodas();

      expect(httpPatch).toHaveBeenCalledTimes(2);
    });

    it('debe enviar PATCH para la primera notificación pendiente', () => {
      service.marcarTodas();

      expect(httpPatch).toHaveBeenCalledWith(
        `${API_URL}/api/notificaciones/notificacion-1/leida`,
        null
      );
    });

    it('debe enviar PATCH para la segunda notificación pendiente', () => {
      service.marcarTodas();

      expect(httpPatch).toHaveBeenCalledWith(
        `${API_URL}/api/notificaciones/notificacion-2/leida`,
        null
      );
    });

    it('no debe enviar PATCH para las notificaciones ya leídas', () => {
      service.marcarTodas();

      expect(httpPatch).not.toHaveBeenCalledWith(
        `${API_URL}/api/notificaciones/notificacion-3/leida`,
        null
      );
    });

    it('debe dejar el contador en cero', () => {
      service.marcarTodas();

      expect(service.noLeidas()).toBe(0);
    });

    it('no debe enviar solicitudes si todas estaban leídas', () => {
      establecerLista(
        crearNotificaciones().map((n) => ({ ...n, leida: true }))
      );

      service.marcarTodas();

      expect(httpPatch).not.toHaveBeenCalled();
    });

    it('no debe enviar solicitudes si la lista está vacía', () => {
      establecerLista([]);

      service.marcarTodas();

      expect(httpPatch).not.toHaveBeenCalled();
    });

    it('debe conservar las notificaciones en la lista', () => {
      service.marcarTodas();

      expect(service.lista()).toHaveLength(3);
    });

    it('debe recargar las notificaciones cuando falla un PATCH', () => {
      httpPatch.mockReturnValue(
        throwError(() => new Error('Error al marcar todas'))
      );
      httpGet.mockReturnValue(of(crearNotificaciones()));

      service.marcarTodas();

      expect(httpGet).toHaveBeenCalledWith(
        `${API_URL}/api/notificaciones/mias`
      );
    });

    it('debe restaurar los estados del backend cuando falla un PATCH', () => {
      httpPatch.mockReturnValue(
        throwError(() => new Error('Error al marcar todas'))
      );
      httpGet.mockReturnValue(of(crearNotificaciones()));

      service.marcarTodas();

      expect(service.noLeidas()).toBe(2);
    });

    it('no debe volver a enviar PATCH después de marcar todas', () => {
      service.marcarTodas();
      service.marcarTodas();

      expect(httpPatch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cambios de sesión', () => {
    it('debe cargar notificaciones al iniciar sesión', () => {
      httpGet.mockReturnValue(of(crearNotificaciones()));

      usuarioActual.set('usuario-1');
      TestBed.flushEffects();

      expect(httpGet).toHaveBeenCalledWith(
        `${API_URL}/api/notificaciones/mias`
      );
    });

    it('debe guardar las notificaciones al iniciar sesión', () => {
      httpGet.mockReturnValue(of(crearNotificaciones()));

      usuarioActual.set('usuario-1');
      TestBed.flushEffects();

      expect(service.lista()).toHaveLength(3);
    });

    it('debe limpiar la lista al cerrar sesión', () => {
      establecerLista(crearNotificaciones());

      usuarioActual.set('usuario-1');
      TestBed.flushEffects();

      usuarioActual.set(null);
      TestBed.flushEffects();

      expect(service.lista()).toEqual([]);
    });

    it('debe dejar el contador en cero al cerrar sesión', () => {
      establecerLista(crearNotificaciones());

      usuarioActual.set('usuario-1');
      TestBed.flushEffects();

      usuarioActual.set(null);
      TestBed.flushEffects();

      expect(service.noLeidas()).toBe(0);
    });

    it('debe volver a cargar al cambiar de usuario', () => {
      usuarioActual.set('usuario-1');
      TestBed.flushEffects();

      usuarioActual.set('usuario-2');
      TestBed.flushEffects();

      expect(httpGet).toHaveBeenCalledTimes(2);
    });

    it('no debe cargar cuando la sesión continúa vacía', () => {
      usuarioActual.set(null);
      TestBed.flushEffects();

      expect(httpGet).not.toHaveBeenCalled();
    });
  });
});
