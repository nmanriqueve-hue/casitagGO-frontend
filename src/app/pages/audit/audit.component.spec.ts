
// @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { of, Subject, throwError } from 'rxjs';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { AuditComponent } from './audit.component';
import {
  AdminBackService,
  EventoAuditoriaBack
} from '../../core/services/admin-back.service';
import { ToastService } from '../../core/services/toast.service';

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

describe('AuditComponent', () => {
  let component: AuditComponent;
  let auditoria: ReturnType<typeof vi.fn>;
  let mostrarToast: ReturnType<typeof vi.fn>;

  const crearEvento = (
    cambios: Partial<EventoAuditoriaBack> = {}
  ): EventoAuditoriaBack => ({
    id: 'evento-1',
    creadoEn: '2026-10-10T10:30:00',
    usuarioId: 'usuario-123456789',
    entidad: 'PUBLICACION',
    accion: 'APROBAR',
    resultado: 'EXITOSO',
    detalle: { publicacionId: 10 },
    ...cambios
  });

  const crearLista = (): EventoAuditoriaBack[] => [
    crearEvento({
      id: 'evento-1',
      creadoEn: '2026-10-09T08:00:00',
      usuarioId: 'usuario-111111',
      entidad: 'USUARIO',
      accion: 'BLOQUEAR',
      resultado: 'EXITOSO',
      detalle: { motivo: 'Incumplimiento' }
    }),
    crearEvento({
      id: 'evento-2',
      creadoEn: '2026-10-11T12:00:00',
      usuarioId: 'usuario-222222',
      entidad: 'PUBLICACION',
      accion: 'APROBAR',
      resultado: 'EXITOSO',
      detalle: { publicacionId: 25 }
    }),
    crearEvento({
      id: 'evento-3',
      creadoEn: '2026-10-10T09:00:00',
      usuarioId: null,
      entidad: 'RESERVA',
      accion: 'CANCELAR',
      resultado: 'ERROR',
      detalle: { codigo: 403 }
    })
  ];

  const crearError = (
    status: number,
    error: unknown = null
  ): HttpErrorResponse =>
    new HttpErrorResponse({ status, error });

  const crearComponente = (): void => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AdminBackService,
          useValue: { auditoria }
        },
        {
          provide: ToastService,
          useValue: { show: mostrarToast }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new AuditComponent()
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    auditoria = vi.fn().mockReturnValue(of(crearLista()));
    mostrarToast = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe consultar los eventos al iniciar', () => {
      crearComponente();

      expect(auditoria).toHaveBeenCalledTimes(1);
    });

    it('debe iniciar con búsqueda vacía', () => {
      crearComponente();

      expect(component.search()).toBe('');
    });

    it('debe iniciar con filtro TODOS', () => {
      crearComponente();

      expect(component.result()).toBe('TODOS');
    });

    it('debe cargar los eventos recibidos', () => {
      crearComponente();

      expect(component.eventos()).toHaveLength(3);
    });

    it('debe terminar la carga al recibir los eventos', () => {
      crearComponente();

      expect(component.cargando()).toBe(false);
    });

    it('debe iniciar sin errores cuando la consulta es correcta', () => {
      crearComponente();

      expect(component.errorCarga()).toBe('');
    });

    it('debe mantener la carga mientras espera respuesta', () => {
      const pendiente = new Subject<EventoAuditoriaBack[]>();

      auditoria.mockReturnValue(pendiente.asObservable());
      crearComponente();

      expect(component.cargando()).toBe(true);
      expect(component.eventos()).toEqual([]);

      pendiente.next(crearLista());
      pendiente.complete();

      expect(component.cargando()).toBe(false);
      expect(component.eventos()).toHaveLength(3);
    });
  });

  describe('Ordenamiento de eventos', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe ordenar los eventos del más reciente al más antiguo', () => {
      expect(component.eventos().map(evento => evento.id)).toEqual([
        'evento-2',
        'evento-3',
        'evento-1'
      ]);
    });

    it('debe colocar primero el evento más reciente', () => {
      expect(component.eventos()[0].creadoEn).toBe(
        '2026-10-11T12:00:00'
      );
    });

    it('debe conservar los identificadores de los eventos', () => {
      expect(component.eventos().map(evento => evento.id)).toContain(
        'evento-1'
      );
    });

    // CORREGIDO: se actualiza la señal existente.
    // No se vuelve a crear el componente ni a configurar TestBed.
    it('debe aceptar eventos sin fecha', () => {
      const eventoSinFecha = crearEvento({
        id: 'sin-fecha',
        creadoEn: null
      });

      component.eventos.set([eventoSinFecha]);

      expect(component.eventos()).toHaveLength(1);
      expect(component.eventos()[0].creadoEn).toBeNull();
      expect(component.visible()[0].id).toBe('sin-fecha');
    });
  });

  describe('Filtros por resultado', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe incluir la opción TODOS', () => {
      expect(component.resultados()[0]).toBe('TODOS');
    });

    it('debe incluir el resultado EXITOSO', () => {
      expect(component.resultados()).toContain('EXITOSO');
    });

    it('debe incluir el resultado ERROR', () => {
      expect(component.resultados()).toContain('ERROR');
    });

    it('no debe repetir los resultados', () => {
      expect(component.resultados()).toEqual([
        'TODOS',
        'EXITOSO',
        'ERROR'
      ]);
    });

    it('debe mostrar todos los eventos con filtro TODOS', () => {
      expect(component.visible()).toHaveLength(3);
    });

    it('debe filtrar los eventos exitosos', () => {
      component.result.set('EXITOSO');

      expect(component.visible()).toHaveLength(2);
    });

    it('debe filtrar los eventos con error', () => {
      component.result.set('ERROR');

      expect(component.visible()).toHaveLength(1);
    });

    it('debe devolver una lista vacía para resultados inexistentes', () => {
      component.result.set('DESCONOCIDO');

      expect(component.visible()).toEqual([]);
    });

    it('debe restaurar todos los eventos al seleccionar TODOS', () => {
      component.result.set('ERROR');
      expect(component.visible()).toHaveLength(1);

      component.result.set('TODOS');
      expect(component.visible()).toHaveLength(3);
    });
  });

  describe('Búsqueda de eventos', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe buscar por acción', () => {
      component.search.set('APROBAR');

      expect(component.visible().map(evento => evento.id)).toEqual([
        'evento-2'
      ]);
    });

    it('debe buscar por entidad', () => {
      component.search.set('RESERVA');

      expect(component.visible().map(evento => evento.id)).toEqual([
        'evento-3'
      ]);
    });

    it('debe buscar por resultado', () => {
      component.search.set('ERROR');

      expect(component.visible()).toHaveLength(1);
    });

    it('debe ignorar mayúsculas y minúsculas', () => {
      component.search.set('bloquear');

      expect(component.visible().map(evento => evento.id)).toEqual([
        'evento-1'
      ]);
    });

    it('debe eliminar espacios al inicio y al final de la búsqueda', () => {
      component.search.set('  APROBAR  ');

      expect(component.visible().map(evento => evento.id)).toEqual([
        'evento-2'
      ]);
    });

    it('debe buscar por actor', () => {
      component.search.set('Sistema');

      expect(component.visible().map(evento => evento.id)).toEqual([
        'evento-3'
      ]);
    });

    it('debe buscar por información del detalle', () => {
      component.search.set('Incumplimiento');

      expect(component.visible().map(evento => evento.id)).toEqual([
        'evento-1'
      ]);
    });

    it('debe devolver una lista vacía sin coincidencias', () => {
      component.search.set('NO EXISTE');

      expect(component.visible()).toEqual([]);
    });

    it('debe combinar búsqueda y filtro de resultado', () => {
      component.result.set('EXITOSO');
      component.search.set('PUBLICACION');

      expect(component.visible().map(evento => evento.id)).toEqual([
        'evento-2'
      ]);
    });

    it('debe actualizar los resultados al limpiar la búsqueda', () => {
      component.search.set('CANCELAR');
      expect(component.visible()).toHaveLength(1);

      component.search.set('');
      expect(component.visible()).toHaveLength(3);
    });
  });

  describe('Actor y detalle', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe mostrar los primeros ocho caracteres del usuario', () => {
      const evento = crearEvento({
        usuarioId: '123456789abcdef'
      });

      expect(component.actor(evento)).toBe('12345678');
    });

    it('debe mostrar Sistema cuando no existe usuario', () => {
      const evento = crearEvento({
        usuarioId: null
      });

      expect(component.actor(evento)).toBe('Sistema');
    });

    it('debe devolver el detalle vacío cuando es nulo', () => {
      const evento = crearEvento({
        detalle: null
      });

      expect(component.detalle(evento)).toBe('');
    });

    it('debe convertir los valores del detalle a texto', () => {
      const evento = crearEvento({
        detalle: {
          numero: 10,
          activo: true
        }
      });

      expect(component.detalle(evento)).toBe(
        'numero: 10 · activo: true'
      );
    });

    it('debe convertir objetos del detalle a JSON', () => {
      const evento = crearEvento({
        detalle: {
          datos: { codigo: 5 }
        }
      });

      expect(component.detalle(evento)).toBe(
        'datos: {"codigo":5}'
      );
    });

    it('debe convertir listas del detalle a JSON', () => {
      const evento = crearEvento({
        detalle: {
          estados: ['ACTIVA', 'BLOQUEADA']
        }
      });

      expect(component.detalle(evento)).toBe(
        'estados: ["ACTIVA","BLOQUEADA"]'
      );
    });

    it('debe separar los campos del detalle', () => {
      const evento = crearEvento({
        detalle: {
          motivo: 'Prueba',
          codigo: 123
        }
      });

      expect(component.detalle(evento)).toContain(' · ');
    });
  });

  describe('Errores del backend', () => {
    it('debe mostrar error de conexión', () => {
      auditoria.mockReturnValue(
        throwError(() => crearError(0))
      );

      crearComponente();

      expect(component.errorCarga()).toContain(
        'No se pudo conectar con el servidor'
      );
    });

    it('debe mostrar el mensaje del backend para error 400', () => {
      auditoria.mockReturnValue(
        throwError(() => crearError(400, 'Solicitud inválida'))
      );

      crearComponente();

      expect(component.errorCarga()).toBe('Solicitud inválida');
    });

    it('debe mostrar error de sesión para 401', () => {
      auditoria.mockReturnValue(
        throwError(() => crearError(401))
      );

      crearComponente();

      expect(component.errorCarga()).toContain('Tu sesión venció');
    });

    it('debe mostrar error de permisos para 403', () => {
      auditoria.mockReturnValue(
        throwError(() => crearError(403))
      );

      crearComponente();

      expect(component.errorCarga()).toContain('no tienes permiso');
    });

    it('debe mostrar error general para 500', () => {
      auditoria.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();

      expect(component.errorCarga()).toBe(
        'No se pudieron cargar los eventos. Intenta de nuevo.'
      );
    });

    it('debe detener la carga cuando ocurre un error', () => {
      auditoria.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();

      expect(component.cargando()).toBe(false);
    });
  });

  describe('Exportación CSV', () => {
    it('debe generar un archivo CSV y notificar la exportación', () => {
      crearComponente();

      const crearURL = vi.fn().mockReturnValue(
        'blob:prueba-auditoria'
      );
      const revocarURL = vi.fn();

      const originalCrearURL = URL.createObjectURL;
      const originalRevocarURL = URL.revokeObjectURL;

      URL.createObjectURL = crearURL;
      URL.revokeObjectURL = revocarURL;

      const click = vi.spyOn(
        HTMLAnchorElement.prototype,
        'click'
      ).mockImplementation(() => {});

      try {
        component.exportCsv();

        expect(crearURL).toHaveBeenCalledTimes(1);
        expect(click).toHaveBeenCalledTimes(1);
        expect(revocarURL).toHaveBeenCalledWith(
          'blob:prueba-auditoria'
        );
        expect(mostrarToast).toHaveBeenCalledWith(
          'El registro de auditoría fue exportado.'
        );
      } finally {
        URL.createObjectURL = originalCrearURL;
        URL.revokeObjectURL = originalRevocarURL;
      }
    });

    it('debe exportar únicamente los eventos visibles', () => {
      crearComponente();
      component.result.set('ERROR');

      const crearURL = vi.fn().mockReturnValue('blob:filtrado');
      const originalCrearURL = URL.createObjectURL;
      const originalRevocarURL = URL.revokeObjectURL;

      URL.createObjectURL = crearURL;
      URL.revokeObjectURL = vi.fn();

      const click = vi.spyOn(
        HTMLAnchorElement.prototype,
        'click'
      ).mockImplementation(() => {});

      try {
        component.exportCsv();

        expect(crearURL).toHaveBeenCalledTimes(1);
        expect(click).toHaveBeenCalledTimes(1);

        const archivo = crearURL.mock.calls[0][0] as Blob;

        expect(archivo.type).toBe(
          'text/csv;charset=utf-8'
        );
      } finally {
        URL.createObjectURL = originalCrearURL;
        URL.revokeObjectURL = originalRevocarURL;
      }
    });
  });
});
