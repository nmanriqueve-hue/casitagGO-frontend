
 // @vitest-environment jsdom
import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { FavoritesService } from './favorites.service';
import { SessionService } from './session.service';
import { CatalogService } from './catalog.service';
import { Listing, User } from '../models/marketplace.models';
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

describe('FavoritesService', () => {
  let service: FavoritesService;

  const usuario = signal<User | null>(null);
  const rol = signal<string>('guest');

  const get = vi.fn();
  const post = vi.fn();
  const eliminar = vi.fn();
  const desdeBack = vi.fn();

  const httpSimulado = {
    get,
    post,
    delete: eliminar
  };

  const sesionSimulada = {
    currentUser: usuario,
    role: rol
  };

  const catalogoSimulado = {
    desdeBack
  };

  const huesped: User = {
    id: 101,
    name: 'Huesped de prueba',
    email: 'huesped@test.com',
    phone: '',
    role: 'guest',
    active: true,
    joinedAt: '2026-01-01'
  };

  const otroHuesped: User = {
    ...huesped,
    id: 102,
    email: 'otro@test.com'
  };

  const alojamiento = {
    id: 5001,
    uuid: 'uuid-alojamiento-1',
    title: 'Alojamiento de prueba'
  } as Listing;

  const alojamiento2 = {
    id: 5002,
    uuid: 'uuid-alojamiento-2',
    title: 'Segundo alojamiento'
  } as Listing;

  const errorHttp = new HttpErrorResponse({
    status: 500,
    error: 'Error del servidor'
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();

    usuario.set(null);
    rol.set('guest');

    get.mockReturnValue(of([]));
    post.mockReturnValue(of('OK'));
    eliminar.mockReturnValue(of('OK'));

    desdeBack.mockImplementation((item: any) => ({
      id: item.id,
      uuid: item.uuid,
      title: item.title
    }));

    TestBed.configureTestingModule({
      providers: [
        FavoritesService,
        { provide: SessionService, useValue: sesionSimulada },
        { provide: HttpClient, useValue: httpSimulado },
        { provide: CatalogService, useValue: catalogoSimulado }
      ]
    });

    service = TestBed.inject(FavoritesService);
    TestBed.flushEffects();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  describe('Inicializacion', () => {
    it('debe crear el servicio', () => {
      expect(service).toBeTruthy();
    });

    it('debe iniciar sin favoritos reales', () => {
      expect(service.reales()).toEqual([]);
    });

    it('debe iniciar sin carga activa', () => {
      expect(service.cargando()).toBe(false);
    });

    it('debe iniciar sin mensaje de error', () => {
      expect(service.errorCarga()).toBe('');
    });

    it('no debe consultar el backend sin usuario', () => {
      expect(get).not.toHaveBeenCalled();
    });
  });

  describe('Favoritos locales', () => {
    it('debe iniciar sin favoritos numericos', () => {
      usuario.set(huesped);
      expect(service.ids()).toEqual([]);
    });

    it('no debe agregar favoritos sin usuario', () => {
      service.toggle(100);
      expect(service.ids()).toEqual([]);
    });

    it('debe agregar un favorito numerico', () => {
      usuario.set(huesped);
      service.toggle(100);
      expect(service.ids()).toEqual([100]);
    });

    it('debe reconocer un favorito agregado', () => {
      usuario.set(huesped);
      service.toggle(100);
      expect(service.has(100)).toBe(true);
    });

    it('debe indicar cuando un favorito no existe', () => {
      usuario.set(huesped);
      expect(service.has(999)).toBe(false);
    });

    it('debe eliminar un favorito al alternarlo nuevamente', () => {
      usuario.set(huesped);

      service.toggle(100);
      service.toggle(100);

      expect(service.has(100)).toBe(false);
    });

    it('debe conservar otros favoritos al eliminar uno', () => {
      usuario.set(huesped);

      service.toggle(100);
      service.toggle(200);
      service.toggle(100);

      expect(service.ids()).toEqual([200]);
    });

    it('debe evitar duplicados al alternar el mismo favorito', () => {
      usuario.set(huesped);

      service.toggle(100);
      service.toggle(100);
      service.toggle(100);

      expect(service.ids()).toEqual([100]);
    });

    it('debe separar los favoritos de diferentes usuarios', () => {
      usuario.set(huesped);
      service.toggle(100);

      usuario.set(otroHuesped);
      service.toggle(200);

      expect(service.ids()).toEqual([200]);

      usuario.set(huesped);
      expect(service.ids()).toEqual([100]);
    });
  });

  describe('Carga de favoritos reales', () => {
    it('debe consultar el endpoint correcto', () => {
      service.cargar();

      expect(get).toHaveBeenCalledWith(
        `${API_URL}/api/favoritos`
      );
    });

    it('debe convertir las publicaciones usando el catalogo', () => {
      const publicacion = {
        id: 5001,
        uuid: 'uuid-alojamiento-1',
        title: 'Alojamiento de prueba'
      };

      get.mockReturnValue(of([publicacion]));

      service.cargar();

      expect(desdeBack).toHaveBeenCalledWith(publicacion);
      expect(service.reales()).toHaveLength(1);
    });

    it('debe marcar los UUID cargados como favoritos', () => {
      get.mockReturnValue(of([
        { id: 5001, uuid: 'uuid-alojamiento-1' },
        { id: 5002, uuid: 'uuid-alojamiento-2' }
      ]));

      service.cargar();

      expect(service.hasUuid('uuid-alojamiento-1')).toBe(true);
      expect(service.hasUuid('uuid-alojamiento-2')).toBe(true);
    });

    it('debe indicar que un UUID desconocido no es favorito', () => {
      expect(service.hasUuid('uuid-inexistente')).toBe(false);
    });

    it('debe finalizar la carga cuando el backend responde', () => {
      service.cargar();

      expect(service.cargando()).toBe(false);
      expect(service.errorCarga()).toBe('');
    });

    it('debe mantener cargando mientras la peticion esta pendiente', () => {
      const pendiente = new Subject<unknown[]>();
      get.mockReturnValue(pendiente.asObservable());

      service.cargar();

      expect(service.cargando()).toBe(true);

      pendiente.next([]);
      pendiente.complete();

      expect(service.cargando()).toBe(false);
    });

    it('debe limpiar los favoritos si falla la consulta', () => {
      service.reales.set([alojamiento]);
      get.mockReturnValue(throwError(() => errorHttp));

      service.cargar();

      expect(service.reales()).toEqual([]);
      expect(service.cargando()).toBe(false);
      expect(service.errorCarga()).toBe('Error del servidor');
    });

    it('debe mostrar un mensaje predeterminado si el error no tiene texto', () => {
      get.mockReturnValue(throwError(() =>
        new HttpErrorResponse({ status: 500 })
      ));

      service.cargar();

      expect(service.errorCarga()).toBe(
        'No se pudo completar la acción con favoritos.'
      );
    });
  });

  describe('Alternar favoritos reales', () => {
    it('debe enviar POST al agregar un favorito', () => {
      service.alternarUuid('uuid-nuevo', vi.fn());

      expect(post).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/uuid-nuevo/favoritos`,
        null,
        { responseType: 'text' }
      );
    });

    it('debe marcar inmediatamente el favorito agregado', () => {
      const pendiente = new Subject<string>();
      post.mockReturnValue(pendiente.asObservable());

      service.alternarUuid('uuid-nuevo', vi.fn());

      expect(service.hasUuid('uuid-nuevo')).toBe(true);

      pendiente.complete();
    });

    it('debe recargar favoritos despues de agregarlos', () => {
      service.alternarUuid('uuid-nuevo', vi.fn());

      expect(get).toHaveBeenCalledWith(
        `${API_URL}/api/favoritos`
      );
    });

    it('debe enviar DELETE al quitar un favorito', () => {
      service.reales.set([alojamiento]);

      const pendiente = new Subject<string>();
      post.mockReturnValue(pendiente.asObservable());

      service.alternarUuid('uuid-alojamiento-1', vi.fn());
      pendiente.complete();

      service.alternarUuid('uuid-alojamiento-1', vi.fn());

      expect(eliminar).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/uuid-alojamiento-1/favoritos`,
        { responseType: 'text' }
      );
    });

    it('debe quitar inmediatamente el favorito al desmarcarlo', () => {
      const pendiente = new Subject<string>();
      post.mockReturnValue(pendiente.asObservable());

      service.alternarUuid('uuid-alojamiento-1', vi.fn());

      expect(service.hasUuid('uuid-alojamiento-1')).toBe(true);

      service.alternarUuid('uuid-alojamiento-1', vi.fn());

      expect(service.hasUuid('uuid-alojamiento-1')).toBe(false);
    });

    it('debe eliminar el alojamiento de reales al desmarcarlo', () => {
      service.reales.set([alojamiento, alojamiento2]);

      const postPendiente = new Subject<string>();
      const deletePendiente = new Subject<string>();

      post.mockReturnValue(postPendiente.asObservable());
      eliminar.mockReturnValue(deletePendiente.asObservable());

      service.alternarUuid('uuid-alojamiento-1', vi.fn());

      expect(service.hasUuid('uuid-alojamiento-1')).toBe(true);

      service.alternarUuid('uuid-alojamiento-1', vi.fn());

      expect(eliminar).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/uuid-alojamiento-1/favoritos`,
        { responseType: 'text' }
      );

      expect(service.hasUuid('uuid-alojamiento-1')).toBe(false);
      expect(service.reales()).toEqual([alojamiento2]);
    });

    it('debe avisar cuando falla agregar un favorito', () => {
      const alFallar = vi.fn();
      post.mockReturnValue(throwError(() => errorHttp));

      service.alternarUuid('uuid-nuevo', alFallar);

      expect(alFallar).toHaveBeenCalledWith('Error del servidor');
      expect(get).toHaveBeenCalled();
    });

    it('debe avisar cuando falla eliminar un favorito', () => {
      const pendiente = new Subject<string>();
      post.mockReturnValue(pendiente.asObservable());

      service.alternarUuid('uuid-alojamiento-1', vi.fn());

      eliminar.mockReturnValue(throwError(() => errorHttp));
      const alFallar = vi.fn();

      service.alternarUuid('uuid-alojamiento-1', alFallar);

      expect(alFallar).toHaveBeenCalledWith('Error del servidor');
    });

    it('debe recuperar el estado real despues de un error', () => {
      const pendiente = new Subject<string>();
      post.mockReturnValue(pendiente.asObservable());

      service.alternarUuid('uuid-alojamiento-1', vi.fn());

      get.mockReturnValue(of([
        { id: 5001, uuid: 'uuid-alojamiento-1' }
      ]));

      post.mockReturnValue(throwError(() => errorHttp));

      service.alternarUuid('uuid-alojamiento-1', vi.fn());

      expect(service.hasUuid('uuid-alojamiento-1')).toBe(true);
    });
  });

  describe('Sesion del usuario', () => {
    it('debe cargar favoritos al iniciar sesion como huesped', () => {
      usuario.set(huesped);
      rol.set('guest');

      TestBed.flushEffects();

      expect(get).toHaveBeenCalled();
    });

    it('debe limpiar favoritos al cerrar sesion', () => {
      usuario.set(huesped);
      rol.set('guest');
      TestBed.flushEffects();

      service.reales.set([alojamiento]);

      usuario.set(null);
      TestBed.flushEffects();

      expect(service.reales()).toEqual([]);
      expect(service.hasUuid('uuid-alojamiento-1')).toBe(false);
    });

    it('debe limpiar favoritos si el usuario no es huesped', () => {
      usuario.set(huesped);
      rol.set('guest');
      TestBed.flushEffects();

      service.reales.set([alojamiento]);

      rol.set('host');
      TestBed.flushEffects();

      expect(service.reales()).toEqual([]);
    });
  });
});
