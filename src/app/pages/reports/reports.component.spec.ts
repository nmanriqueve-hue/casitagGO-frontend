
// @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { Subject, of, throwError } from 'rxjs';
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { ReportsComponent } from './reports.component';
import { AdminBackService } from '../../core/services/admin-back.service';
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

describe('ReportsComponent', () => {
  let component: ReportsComponent;

  let reporteGestion: ReturnType<typeof vi.fn>;
  let mostrarToast: ReturnType<typeof vi.fn>;
  let crearUrl: ReturnType<typeof vi.fn>;
  let revocarUrl: ReturnType<typeof vi.fn>;

  const pdf = new Blob(
    ['Contenido del reporte'],
    { type: 'application/pdf' }
  );

  const crearError = (
    status: number,
    error?: unknown
  ): HttpErrorResponse => {
    return new HttpErrorResponse({
      status,
      error
    });
  };

  const crearComponente = (): void => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AdminBackService,
          useValue: {
            reporteGestion
          }
        },
        {
          provide: ToastService,
          useValue: {
            show: mostrarToast
          }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new ReportsComponent()
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    reporteGestion = vi.fn().mockReturnValue(of(pdf));
    mostrarToast = vi.fn();
    crearUrl = vi.fn().mockReturnValue('blob:reporte-prueba');
    revocarUrl = vi.fn();

    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: crearUrl,
      revokeObjectURL: revocarUrl
    });

    vi.spyOn(
      HTMLAnchorElement.prototype,
      'click'
    ).mockImplementation(() => {});

    crearComponente();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Inicialización', () => {
    it('debe crear el componente correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debe ser una instancia de ReportsComponent', () => {
      expect(component).toBeInstanceOf(ReportsComponent);
    });

    it('debe iniciar sin generar un reporte', () => {
      expect(component.generating()).toBe(false);
    });

    it('debe tener disponible el método descargarPdf', () => {
      expect(typeof component.descargarPdf).toBe('function');
    });

    it('no debe solicitar el reporte al crear el componente', () => {
      expect(reporteGestion).not.toHaveBeenCalled();
    });

    it('no debe mostrar notificaciones al iniciar', () => {
      expect(mostrarToast).not.toHaveBeenCalled();
    });
  });

  describe('Descarga del reporte PDF', () => {
    it('debe solicitar el reporte al servidor', () => {
      component.descargarPdf();

      expect(reporteGestion).toHaveBeenCalledTimes(1);
    });

    it('debe crear una URL para el archivo PDF', () => {
      component.descargarPdf();

      expect(crearUrl).toHaveBeenCalledWith(pdf);
    });

    it('debe crear una URL una sola vez por descarga', () => {
      component.descargarPdf();

      expect(crearUrl).toHaveBeenCalledTimes(1);
    });

    it('debe activar la descarga mediante un enlace', () => {
      const spy = vi.spyOn(
        HTMLAnchorElement.prototype,
        'click'
      );

      component.descargarPdf();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('debe asignar el nombre reporte-gestion.pdf', () => {
      const enlaces: HTMLAnchorElement[] = [];
      const crearElementoOriginal =
        document.createElement.bind(document);

      const spy = vi.spyOn(document, 'createElement')
        .mockImplementation((nombre: string) => {
          const elemento = crearElementoOriginal(nombre);

          if (nombre === 'a') {
            enlaces.push(elemento as HTMLAnchorElement);
          }

          return elemento;
        });

      component.descargarPdf();

      expect(enlaces.length).toBe(1);
      expect(enlaces[0].download).toBe('reporte-gestion.pdf');

      spy.mockRestore();
    });

    it('debe asignar la URL generada al enlace', () => {
      const enlaces: HTMLAnchorElement[] = [];
      const crearElementoOriginal =
        document.createElement.bind(document);

      const spy = vi.spyOn(document, 'createElement')
        .mockImplementation((nombre: string) => {
          const elemento = crearElementoOriginal(nombre);

          if (nombre === 'a') {
            enlaces.push(elemento as HTMLAnchorElement);
          }

          return elemento;
        });

      component.descargarPdf();

      expect(enlaces[0].getAttribute('href'))
        .toBe('blob:reporte-prueba');

      spy.mockRestore();
    });

    it('debe liberar la URL después de descargar', () => {
      component.descargarPdf();

      expect(revocarUrl).toHaveBeenCalledWith(
        'blob:reporte-prueba'
      );
    });

    it('debe liberar la URL una sola vez', () => {
      component.descargarPdf();

      expect(revocarUrl).toHaveBeenCalledTimes(1);
    });

    it('debe finalizar el estado de carga al descargar', () => {
      component.descargarPdf();

      expect(component.generating()).toBe(false);
    });

    it('debe mostrar una notificación de éxito', () => {
      component.descargarPdf();

      expect(mostrarToast).toHaveBeenCalledWith(
        'El reporte de gestión fue generado.'
      );
    });

    it('no debe mostrar advertencias cuando la descarga es exitosa', () => {
      component.descargarPdf();

      expect(mostrarToast).not.toHaveBeenCalledWith(
        expect.any(String),
        'warning'
      );
    });
  });

  describe('Control de descargas simultáneas', () => {
    it('no debe iniciar otra descarga si ya está generando', () => {
      component.generating.set(true);

      component.descargarPdf();

      expect(reporteGestion).not.toHaveBeenCalled();
    });

    it('debe mantener el estado de carga mientras espera el PDF', () => {
      const respuesta = new Subject<Blob>();
      reporteGestion.mockReturnValue(respuesta.asObservable());

      component.descargarPdf();

      expect(component.generating()).toBe(true);
    });

    it('no debe descargar dos veces mientras espera respuesta', () => {
      const respuesta = new Subject<Blob>();
      reporteGestion.mockReturnValue(respuesta.asObservable());

      component.descargarPdf();
      component.descargarPdf();

      expect(reporteGestion).toHaveBeenCalledTimes(1);
    });

    it('debe permitir una nueva descarga después de terminar', () => {
      component.descargarPdf();
      component.descargarPdf();

      expect(reporteGestion).toHaveBeenCalledTimes(2);
    });

    it('debe finalizar la carga cuando llega una respuesta pendiente', () => {
      const respuesta = new Subject<Blob>();
      reporteGestion.mockReturnValue(respuesta.asObservable());

      component.descargarPdf();
      respuesta.next(pdf);

      expect(component.generating()).toBe(false);
    });
  });

  describe('Manejo de errores', () => {
    it('debe finalizar la carga si falla la solicitud', () => {
      reporteGestion.mockReturnValue(
        throwError(() => crearError(500))
      );

      component.descargarPdf();

      expect(component.generating()).toBe(false);
    });

    it('debe mostrar advertencia para un error del servidor', () => {
      reporteGestion.mockReturnValue(
        throwError(() => crearError(500))
      );

      component.descargarPdf();

      expect(mostrarToast).toHaveBeenCalledWith(
        'No se pudo generar el reporte. Intenta de nuevo.',
        'warning'
      );
    });

    it('debe informar si no hay conexión con el servidor', () => {
      reporteGestion.mockReturnValue(
        throwError(() => crearError(0))
      );

      component.descargarPdf();

      expect(mostrarToast).toHaveBeenCalledWith(
        'No se pudo conectar con el servidor. Revisa que el back esté corriendo.',
        'warning'
      );
    });

    it('debe informar cuando la sesión ha vencido', () => {
      reporteGestion.mockReturnValue(
        throwError(() => crearError(401))
      );

      component.descargarPdf();

      expect(mostrarToast).toHaveBeenCalledWith(
        'Tu sesión venció o no tienes permiso. Vuelve a iniciar sesión.',
        'warning'
      );
    });

    it('debe informar cuando no tiene permisos', () => {
      reporteGestion.mockReturnValue(
        throwError(() => crearError(403))
      );

      component.descargarPdf();

      expect(mostrarToast).toHaveBeenCalledWith(
        'Tu sesión venció o no tienes permiso. Vuelve a iniciar sesión.',
        'warning'
      );
    });

    it('debe mostrar el mensaje de un error 400 con Blob', async () => {
      const errorBlob = new Blob(
        ['No hay datos disponibles para el reporte'],
        { type: 'text/plain' }
      );

      reporteGestion.mockReturnValue(
        throwError(() => crearError(400, errorBlob))
      );

      component.descargarPdf();

      await vi.waitFor(() => {
        expect(mostrarToast).toHaveBeenCalledWith(
          'No hay datos disponibles para el reporte',
          'warning'
        );
      });
    });

    it('debe mostrar el mensaje general si el Blob está vacío', async () => {
      const errorBlob = new Blob(
        [],
        { type: 'text/plain' }
      );

      reporteGestion.mockReturnValue(
        throwError(() => crearError(400, errorBlob))
      );

      component.descargarPdf();

      await vi.waitFor(() => {
        expect(mostrarToast).toHaveBeenCalledWith(
          'No se pudo generar el reporte. Intenta de nuevo.',
          'warning'
        );
      });
    });

    it('no debe crear un enlace cuando ocurre un error', () => {
      const spy = vi.spyOn(
        HTMLAnchorElement.prototype,
        'click'
      );

      reporteGestion.mockReturnValue(
        throwError(() => crearError(500))
      );

      component.descargarPdf();

      expect(spy).not.toHaveBeenCalled();
      expect(crearUrl).not.toHaveBeenCalled();
    });
  });
});
