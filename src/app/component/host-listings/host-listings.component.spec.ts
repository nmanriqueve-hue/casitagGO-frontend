
// @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HostListingsComponent } from './host-listings.component';
import { PublicacionesBackService } from '../../core/services/publicaciones-back.service';
import { CatalogService } from '../../core/services/catalog.service';
import { ToastService } from '../../core/services/toast.service';
import { Listing } from '../../core/models/marketplace.models';

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

describe('HostListingsComponent', () => {
  let component: HostListingsComponent;

  let mias: ReturnType<typeof vi.fn>;
  let activar: ReturnType<typeof vi.fn>;
  let pausar: ReturnType<typeof vi.fn>;
  let desdeBack: ReturnType<typeof vi.fn>;
  let mostrarToast: ReturnType<typeof vi.fn>;

  const publicacion = (
    id: number,
    cambios: Record<string, unknown> = {}
  ): Listing => ({
    id,
    uuid: `uuid-${id}`,
    title: `Alojamiento ${id}`,
    city: 'Bogotá',
    status: 'ACTIVA',
    capacity: 4,
    ...cambios
  } as Listing);

  const errorHttp = (
    status: number,
    error: unknown = null
  ): HttpErrorResponse =>
    new HttpErrorResponse({ status, error });

  const crearComponente = (): void => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PublicacionesBackService,
          useValue: { mias, activar, pausar }
        },
        {
          provide: CatalogService,
          useValue: { desdeBack }
        },
        {
          provide: ToastService,
          useValue: { show: mostrarToast }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new HostListingsComponent()
    );
  };

  const establecerPublicaciones = (
    ...publicaciones: Listing[]
  ): void => {
    mias.mockReturnValue(of(publicaciones));
  };

  const seleccionarPublicacion = (id: number): void => {
    const seleccionada = component.items().find(
      item => item.id === id
    );

    expect(seleccionada).toBeDefined();
    component.statusTarget.set(seleccionada!);
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    mias = vi.fn().mockReturnValue(of([]));
    activar = vi.fn().mockReturnValue(of({}));
    pausar = vi.fn().mockReturnValue(of({}));
    desdeBack = vi.fn().mockImplementation(
      (item: Listing) => item
    );
    mostrarToast = vi.fn();
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe consultar las publicaciones al iniciar', () => {
      crearComponente();

      expect(mias).toHaveBeenCalledTimes(1);
    });

    it('debe iniciar sin publicaciones cuando el backend devuelve una lista vacía', () => {
      crearComponente();

      expect(component.items()).toEqual([]);
    });

    it('debe iniciar sin errores de carga', () => {
      crearComponente();

      expect(component.errorCarga()).toBe('');
    });

    it('debe iniciar sin publicación seleccionada', () => {
      crearComponente();

      expect(component.statusTarget()).toBeNull();
    });

    it('debe finalizar la carga inicial cuando el backend responde', () => {
      crearComponente();

      expect(component.cargando()).toBe(false);
    });
  });

  describe('Carga de publicaciones', () => {
    it('debe cargar una publicación', () => {
      establecerPublicaciones(publicacion(1));
      crearComponente();

      expect(component.items()).toHaveLength(1);
    });

    it('debe cargar varias publicaciones', () => {
      establecerPublicaciones(
        publicacion(1),
        publicacion(2),
        publicacion(3)
      );

      crearComponente();

      expect(component.items()).toHaveLength(3);
    });

    it('debe convertir las publicaciones recibidas del backend', () => {
      establecerPublicaciones(
        publicacion(1),
        publicacion(2)
      );

      crearComponente();

      expect(desdeBack).toHaveBeenCalledTimes(2);
    });

    it('debe convertir cada publicación individualmente', () => {
      const primera = publicacion(1);
      const segunda = publicacion(2);

      establecerPublicaciones(primera, segunda);
      crearComponente();

      expect(desdeBack).toHaveBeenCalledWith(primera);
      expect(desdeBack).toHaveBeenCalledWith(segunda);
    });

    it('debe guardar el resultado de la conversión', () => {
      establecerPublicaciones(publicacion(1));

      desdeBack.mockReturnValue(
        publicacion(10, { title: 'Casa convertida' })
      );

      crearComponente();

      expect(component.items()[0].title).toBe(
        'Casa convertida'
      );
    });

    it('debe conservar el orden de las publicaciones', () => {
      establecerPublicaciones(
        publicacion(3),
        publicacion(1),
        publicacion(2)
      );

      crearComponente();

      expect(component.items().map(item => item.id)).toEqual([
        3, 1, 2
      ]);
    });

    it('debe conservar los identificadores UUID', () => {
      establecerPublicaciones(
        publicacion(1),
        publicacion(2)
      );

      crearComponente();

      expect(component.items().map(item => item.uuid)).toEqual([
        'uuid-1',
        'uuid-2'
      ]);
    });

    it('debe conservar los estados de las publicaciones', () => {
      establecerPublicaciones(
        publicacion(1, { status: 'ACTIVA' }),
        publicacion(2, { status: 'PAUSADA' })
      );

      crearComponente();

      expect(component.items()[0].status).toBe('ACTIVA');
      expect(component.items()[1].status).toBe('PAUSADA');
    });

    it('debe mantener la carga activa mientras espera al backend', () => {
      const pendiente = new Subject<Listing[]>();

      mias.mockReturnValue(pendiente.asObservable());

      crearComponente();

      expect(component.cargando()).toBe(true);

      pendiente.next([publicacion(1)]);
      pendiente.complete();

      expect(component.cargando()).toBe(false);
      expect(component.items()).toHaveLength(1);
    });

    it('debe permitir recargar las publicaciones', () => {
      crearComponente();

      establecerPublicaciones(publicacion(2));
      component.cargar();

      expect(mias).toHaveBeenCalledTimes(2);
      expect(component.items()).toHaveLength(1);
      expect(component.items()[0].id).toBe(2);
    });

    it('debe reemplazar las publicaciones al recargar', () => {
      establecerPublicaciones(publicacion(1));
      crearComponente();

      establecerPublicaciones(
        publicacion(2),
        publicacion(3)
      );

      component.cargar();

      expect(component.items().map(item => item.id)).toEqual([
        2, 3
      ]);
    });

    it('debe vaciar las publicaciones cuando la nueva consulta no devuelve resultados', () => {
      establecerPublicaciones(publicacion(1));
      crearComponente();

      establecerPublicaciones();
      component.cargar();

      expect(component.items()).toEqual([]);
    });
  });

  describe('Activación de publicaciones', () => {
    it('no debe activar si no hay publicación seleccionada', () => {
      crearComponente();

      component.changeStatus('ACTIVA');

      expect(activar).not.toHaveBeenCalled();
    });

    it('no debe activar si la publicación no tiene UUID', () => {
      establecerPublicaciones(
        publicacion(1, { uuid: undefined })
      );

      crearComponente();
      seleccionarPublicacion(1);

      component.changeStatus('ACTIVA');

      expect(activar).not.toHaveBeenCalled();
    });

    it('debe llamar al servicio de activación con el UUID', () => {
      establecerPublicaciones(publicacion(1));
      crearComponente();
      seleccionarPublicacion(1);

      component.changeStatus('ACTIVA');

      expect(activar).toHaveBeenCalledWith('uuid-1');
    });

    it('no debe llamar al servicio de pausa cuando activa', () => {
      establecerPublicaciones(publicacion(1));
      crearComponente();
      seleccionarPublicacion(1);

      component.changeStatus('ACTIVA');

      expect(pausar).not.toHaveBeenCalled();
    });

    it('debe mostrar un mensaje de activación exitosa', () => {
      establecerPublicaciones(publicacion(1));
      crearComponente();
      seleccionarPublicacion(1);

      component.changeStatus('ACTIVA');

      expect(mostrarToast).toHaveBeenCalledWith(
        'La publicación ahora está activa.'
      );
    });

    it('debe limpiar la selección después de activar', () => {
      establecerPublicaciones(publicacion(1));
      crearComponente();
      seleccionarPublicacion(1);

      component.changeStatus('ACTIVA');

      expect(component.statusTarget()).toBeNull();
    });

    it('debe recargar las publicaciones después de activar', () => {
      establecerPublicaciones(publicacion(1));
      crearComponente();
      seleccionarPublicacion(1);

      component.changeStatus('ACTIVA');

      expect(mias).toHaveBeenCalledTimes(2);
    });

    it('debe esperar la respuesta antes de finalizar la activación', () => {
      const pendiente = new Subject<object>();

      activar.mockReturnValue(pendiente.asObservable());

      establecerPublicaciones(publicacion(1));
      crearComponente();
      seleccionarPublicacion(1);

      component.changeStatus('ACTIVA');

      expect(component.statusTarget()).not.toBeNull();
      expect(mias).toHaveBeenCalledTimes(1);

      pendiente.next({});
      pendiente.complete();

      expect(component.statusTarget()).toBeNull();
      expect(mias).toHaveBeenCalledTimes(2);
    });
  });

  describe('Pausa de publicaciones', () => {
    it('no debe pausar si no hay publicación seleccionada', () => {
      crearComponente();

      component.changeStatus('PAUSADA');

      expect(pausar).not.toHaveBeenCalled();
    });

    it('debe llamar al servicio de pausa con el UUID', () => {
      establecerPublicaciones(publicacion(2));
      crearComponente();
      seleccionarPublicacion(2);

      component.changeStatus('PAUSADA');

      expect(pausar).toHaveBeenCalledWith('uuid-2');
    });

    it('no debe llamar al servicio de activación cuando pausa', () => {
      establecerPublicaciones(publicacion(2));
      crearComponente();
      seleccionarPublicacion(2);

      component.changeStatus('PAUSADA');

      expect(activar).not.toHaveBeenCalled();
    });

    it('debe mostrar un mensaje de pausa exitosa', () => {
      establecerPublicaciones(publicacion(2));
      crearComponente();
      seleccionarPublicacion(2);

      component.changeStatus('PAUSADA');

      expect(mostrarToast).toHaveBeenCalledWith(
        'La publicación ahora está pausada.'
      );
    });

    it('debe limpiar la selección después de pausar', () => {
      establecerPublicaciones(publicacion(2));
      crearComponente();
      seleccionarPublicacion(2);

      component.changeStatus('PAUSADA');

      expect(component.statusTarget()).toBeNull();
    });

    it('debe recargar las publicaciones después de pausar', () => {
      establecerPublicaciones(publicacion(2));
      crearComponente();
      seleccionarPublicacion(2);

      component.changeStatus('PAUSADA');

      expect(mias).toHaveBeenCalledTimes(2);
    });
  });

  describe('Errores del backend', () => {
    it('debe mostrar error de conexión al cargar publicaciones', () => {
      mias.mockReturnValue(
        throwError(() => errorHttp(0))
      );

      crearComponente();

      expect(component.errorCarga()).toContain(
        'No se pudo conectar con el servidor'
      );
    });

    it('debe mostrar el mensaje del backend para error 400', () => {
      mias.mockReturnValue(
        throwError(() => errorHttp(400, 'Datos inválidos'))
      );

      crearComponente();

      expect(component.errorCarga()).toBe('Datos inválidos');
    });

    it('debe mostrar error de sesión para estado 401', () => {
      mias.mockReturnValue(
        throwError(() => errorHttp(401))
      );

      crearComponente();

      expect(component.errorCarga()).toContain(
        'Tu sesión venció'
      );
    });

    it('debe mostrar error de permisos para estado 403', () => {
      mias.mockReturnValue(
        throwError(() => errorHttp(403))
      );

      crearComponente();

      expect(component.errorCarga()).toContain(
        'no tienes permiso'
      );
    });

    it('debe mostrar error general para estado 500', () => {
      mias.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();

      expect(component.errorCarga()).toBe(
        'No se pudo completar la operación. Intenta de nuevo.'
      );
    });

    it('debe detener la carga cuando ocurre un error', () => {
      mias.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();

      expect(component.cargando()).toBe(false);
    });

    it('debe limpiar el error al recargar correctamente', () => {
      mias.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();

      expect(component.errorCarga()).not.toBe('');

      establecerPublicaciones();
      component.cargar();

      expect(component.errorCarga()).toBe('');
      expect(component.cargando()).toBe(false);
    });

    it('debe mostrar un aviso si falla la activación', () => {
      establecerPublicaciones(publicacion(1));

      activar.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();
      seleccionarPublicacion(1);

      component.changeStatus('ACTIVA');

      expect(mostrarToast).toHaveBeenCalledWith(
        'No se pudo completar la operación. Intenta de nuevo.',
        'warning'
      );
    });

    it('debe mostrar un aviso si falla la pausa', () => {
      establecerPublicaciones(publicacion(1));

      pausar.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();
      seleccionarPublicacion(1);

      component.changeStatus('PAUSADA');

      expect(mostrarToast).toHaveBeenCalledWith(
        'No se pudo completar la operación. Intenta de nuevo.',
        'warning'
      );
    });

    it('debe limpiar la selección cuando falla la activación', () => {
      establecerPublicaciones(publicacion(1));

      activar.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();
      seleccionarPublicacion(1);

      component.changeStatus('ACTIVA');

      expect(component.statusTarget()).toBeNull();
    });

    it('no debe recargar publicaciones cuando falla la pausa', () => {
      establecerPublicaciones(publicacion(1));

      pausar.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();
      seleccionarPublicacion(1);

      component.changeStatus('PAUSADA');

      expect(mias).toHaveBeenCalledTimes(1);
    });
  });
});
