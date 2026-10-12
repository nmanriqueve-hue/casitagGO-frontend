
// @vitest-environment jsdom
import '@angular/compiler';

import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MapsComponent } from './maps.component';
import { GeoPoint } from '../../core/models/optional.models';
import { Listing } from '../../core/models/marketplace.models';
import { CatalogService } from '../../core/services/catalog.service';
import { MapsService } from '../../core/services/maps.service';
import { SessionService } from '../../core/services/session.service';

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

describe('MapsComponent', () => {
  let component: MapsComponent;
  let listings: ReturnType<typeof signal<Listing[]>>;
  let currentUser: ReturnType<typeof signal<any>>;
  let role: ReturnType<typeof signal<string>>;
  let point: ReturnType<typeof vi.fn>;
  let searchAddress: ReturnType<typeof vi.fn>;
  let save: ReturnType<typeof vi.fn>;

  const crearAlojamiento = (
    id: number,
    status = 'ACTIVA',
    hostId = 10
  ): Listing => ({
    id,
    title: `Alojamiento ${id}`,
    city: 'Bogotá',
    address: `Calle ${id}`,
    status,
    hostId
  } as Listing);

  const crearPunto = (
    latitude = 4.6097,
    longitude = -74.0817,
    label = 'Bogotá'
  ): GeoPoint => ({
    latitude,
    longitude,
    label
  });

  const crearComponente = (alojamiento?: string): void => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CatalogService,
          useValue: { listings }
        },
        {
          provide: SessionService,
          useValue: { currentUser, role }
        },
        {
          provide: MapsService,
          useValue: { point, searchAddress, save }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(
                alojamiento === undefined
                  ? {}
                  : { alojamiento }
              )
            }
          }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new MapsComponent()
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    listings = signal<Listing[]>([
      crearAlojamiento(101, 'ACTIVA', 10),
      crearAlojamiento(102, 'PAUSADA', 10),
      crearAlojamiento(103, 'BLOQUEADA', 20),
      crearAlojamiento(104, 'ACTIVA', 20)
    ]);

    currentUser = signal<any>({
      id: 10,
      name: 'Anfitrión de prueba'
    });

    role = signal('host');

    point = vi.fn().mockReturnValue(null);
    searchAddress = vi.fn().mockResolvedValue([]);
    save = vi.fn();
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe iniciar sin estar ocupado', () => {
      crearComponente();

      expect(component.busy()).toBe(false);
    });

    it('debe iniciar sin resultados de búsqueda', () => {
      crearComponente();

      expect(component.results()).toEqual([]);
    });

    it('debe iniciar sin notificaciones', () => {
      crearComponente();

      expect(component.notice()).toBe('');
    });

    it('debe seleccionar el primer alojamiento disponible', () => {
      crearComponente();

      expect(component.selected).toBe(101);
    });

    it('debe seleccionar el alojamiento indicado en la URL', () => {
      crearComponente('102');

      expect(component.selected).toBe(102);
    });

    it('debe usar el primer alojamiento si el parámetro no existe', () => {
      crearComponente('999');

      expect(component.selected).toBe(101);
    });

    it('debe usar el primer alojamiento si el parámetro es inválido', () => {
      crearComponente('abc');

      expect(component.selected).toBe(101);
    });

    it('debe seleccionar cero cuando no existen alojamientos visibles', () => {
      listings.set([]);
      crearComponente();

      expect(component.selected).toBe(0);
    });

    it('debe cargar la ciudad del alojamiento seleccionado', () => {
      crearComponente();

      expect(component.query).toBe('Bogotá');
    });

    it('debe iniciar sin barrio ni dirección', () => {
      crearComponente();

      expect(component.zone).toBe('');
      expect(component.address).toBe('');
    });

    it('debe consultar las coordenadas al iniciar', () => {
      crearComponente();

      expect(point).toHaveBeenCalledWith(101, 'Bogotá');
    });

    it('debe cargar coordenadas existentes', () => {
      point.mockReturnValue(crearPunto());
      crearComponente();

      expect(component.latitude).toBe(4.6097);
      expect(component.longitude).toBe(-74.0817);
    });

    it('debe mantener coordenadas nulas si no hay punto', () => {
      crearComponente();

      expect(component.latitude).toBeNull();
      expect(component.longitude).toBeNull();
    });
  });

  describe('Visibilidad de alojamientos', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe mostrar alojamientos activos', () => {
      expect(component.items().map(item => item.id)).toContain(101);
      expect(component.items().map(item => item.id)).toContain(104);
    });

    it('debe mostrar alojamientos propios aunque estén pausados', () => {
      expect(component.items().map(item => item.id)).toContain(102);
    });

    it('no debe mostrar alojamientos bloqueados de otros anfitriones', () => {
      expect(component.items().map(item => item.id)).not.toContain(103);
    });

    it('debe devolver el alojamiento seleccionado', () => {
      expect(component.listing()?.id).toBe(101);
    });

    it('debe devolver undefined si no existe el alojamiento seleccionado', () => {
      component.selected = 999;

      expect(component.listing()).toBeUndefined();
    });

    it('debe mostrar todos los alojamientos al administrador', () => {
      role.set('admin');

      expect(component.items()).toHaveLength(4);
    });

    it('debe actualizar la lista cuando cambian los alojamientos', () => {
      listings.set([
        crearAlojamiento(200, 'ACTIVA')
      ]);

      expect(component.items().map(item => item.id)).toEqual([200]);
    });

    it('debe permitir consultar alojamientos públicos sin sesión', () => {
      currentUser.set(null);
      role.set('guest');

      expect(component.items().map(item => item.id)).toEqual([
        101, 104
      ]);
    });
  });

  describe('Permisos de edición', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe permitir editar al anfitrión propietario', () => {
      expect(component.editable()).toBe(true);
    });

    it('no debe permitir editar a un huésped', () => {
      role.set('guest');

      expect(component.editable()).toBe(false);
    });

    it('no debe permitir editar sin sesión', () => {
      currentUser.set(null);

      expect(component.editable()).toBe(false);
    });

    it('no debe permitir editar al administrador', () => {
      role.set('admin');

      expect(component.editable()).toBe(false);
    });

    it('no debe permitir editar un alojamiento ajeno', () => {
      component.selected = 104;

      expect(component.editable()).toBe(false);
    });

    it('debe permitir editar un alojamiento propio pausado', () => {
      component.selected = 102;

      expect(component.editable()).toBe(true);
    });
  });

  describe('Carga de ubicación', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe limpiar la búsqueda anterior al cargar', () => {
      component.zone = 'Centro';
      component.address = 'Calle 10';
      component.results.set([crearPunto()]);
      component.notice.set('Mensaje anterior');

      component.load();

      expect(component.zone).toBe('');
      expect(component.address).toBe('');
      expect(component.results()).toEqual([]);
      expect(component.notice()).toBe('');
    });

    it('debe limpiar la vista previa al cargar', () => {
      component.preview.set(crearPunto());

      component.load();

      expect(component.preview()).toBeNull();
    });

    it('debe actualizar las coordenadas al cambiar de alojamiento', () => {
      point.mockReturnValue(crearPunto(6.25, -75.56, 'Medellín'));
      component.selected = 102;

      component.load();

      expect(component.latitude).toBe(6.25);
      expect(component.longitude).toBe(-75.56);
    });

    it('debe limpiar las coordenadas si no hay punto guardado', () => {
      component.latitude = 4.6;
      component.longitude = -74.0;

      component.load();

      expect(component.latitude).toBeNull();
      expect(component.longitude).toBeNull();
    });

    it('debe limpiar la ciudad cuando no existe alojamiento', () => {
      component.selected = 999;

      component.load();

      expect(component.query).toBe('');
    });
  });

  describe('Búsqueda de direcciones', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('no debe buscar si el texto es demasiado corto', async () => {
      component.query = 'Bo';

      await component.search();

      expect(searchAddress).not.toHaveBeenCalled();
    });

    it('no debe buscar si la consulta contiene solo espacios', async () => {
      component.query = '   ';

      await component.search();

      expect(searchAddress).not.toHaveBeenCalled();
    });

    it('no debe buscar si ya existe una búsqueda en curso', async () => {
      component.query = 'Bogotá';
      component.busy.set(true);

      await component.search();

      expect(searchAddress).not.toHaveBeenCalled();
    });

    it('debe consultar la dirección con los datos ingresados', async () => {
      component.query = 'Bogotá';
      component.zone = 'Chapinero';
      component.address = 'Carrera 7';

      await component.search();

      expect(searchAddress).toHaveBeenCalledWith(
        'Bogotá',
        'Chapinero',
        'Carrera 7'
      );
    });

    it('debe almacenar los resultados encontrados', async () => {
      const punto = crearPunto();

      searchAddress.mockResolvedValue([punto]);
      component.query = 'Bogotá';

      await component.search();

      expect(component.results()).toEqual([punto]);
    });

    it('debe informar cuando no encuentra resultados', async () => {
      component.query = 'Bogotá';

      await component.search();

      expect(component.notice()).toContain(
        'No encontramos resultados'
      );
    });

    it('debe finalizar el estado ocupado después de buscar', async () => {
      component.query = 'Bogotá';

      await component.search();

      expect(component.busy()).toBe(false);
    });

    it('debe mostrar el mensaje de un error normal', async () => {
      searchAddress.mockRejectedValue(
        new Error('Error de búsqueda')
      );

      component.query = 'Bogotá';

      await component.search();

      expect(component.notice()).toBe('Error de búsqueda');
    });

    it('debe mostrar error general si la consulta falla', async () => {
      searchAddress.mockRejectedValue({
        status: 500,
        message: 'Error interno'
      });

      component.query = 'Bogotá';

      await component.search();

      expect(component.notice()).toContain(
        'No pudimos consultar la ubicación'
      );
    });

    it('debe liberar el estado ocupado aunque ocurra un error', async () => {
      searchAddress.mockRejectedValue(new Error('Error'));
      component.query = 'Bogotá';

      await component.search();

      expect(component.busy()).toBe(false);
    });

    it('debe limpiar una notificación anterior al buscar', async () => {
      searchAddress.mockResolvedValue([crearPunto()]);
      component.notice.set('Aviso anterior');
      component.query = 'Bogotá';

      await component.search();

      expect(component.notice()).toBe('');
    });
  });

  describe('Selección de coordenadas', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe actualizar la latitud al seleccionar un punto', () => {
      component.choose(crearPunto(4.7, -74.1));

      expect(component.latitude).toBe(4.7);
    });

    it('debe actualizar la longitud al seleccionar un punto', () => {
      component.choose(crearPunto(4.7, -74.1));

      expect(component.longitude).toBe(-74.1);
    });

    it('debe almacenar el punto seleccionado en la vista previa', () => {
      const punto = crearPunto();

      component.choose(punto);

      expect(component.preview()).toBe(punto);
    });

    it('debe indicar que se puede guardar la ubicación al propietario', () => {
      component.choose(crearPunto());

      expect(component.notice()).toContain(
        'Guardar ubicación'
      );
    });

    it('debe mostrar un aviso de ubicación encontrada al huésped', () => {
      role.set('guest');

      component.choose(crearPunto());

      expect(component.notice()).toContain(
        'Ubicación encontrada'
      );
    });
  });

  describe('Guardar ubicación', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('no debe guardar si el usuario no puede editar', () => {
      role.set('guest');
      component.latitude = 4.6;
      component.longitude = -74.1;

      component.save();

      expect(save).not.toHaveBeenCalled();
    });

    it('no debe guardar si falta la latitud', () => {
      component.latitude = null;
      component.longitude = -74.1;

      component.save();

      expect(save).not.toHaveBeenCalled();
    });

    it('no debe guardar si falta la longitud', () => {
      component.latitude = 4.6;
      component.longitude = null;

      component.save();

      expect(save).not.toHaveBeenCalled();
    });

    it('debe informar cuando faltan coordenadas', () => {
      component.latitude = null;
      component.longitude = null;

      component.save();

      expect(component.notice()).toBe(
        'Completa ambas coordenadas.'
      );
    });

    it('debe guardar coordenadas válidas', () => {
      component.latitude = 4.6097;
      component.longitude = -74.0817;

      component.save();

      expect(save).toHaveBeenCalledWith(
        101,
        {
          latitude: 4.6097,
          longitude: -74.0817,
          label: 'Calle 101'
        }
      );
    });

    it('debe usar la etiqueta de la vista previa', () => {
      component.choose(
        crearPunto(4.7, -74.1, 'Chapinero')
      );

      component.save();

      expect(save).toHaveBeenCalledWith(
        101,
        {
          latitude: 4.7,
          longitude: -74.1,
          label: 'Chapinero'
        }
      );
    });

    it('debe guardar el alojamiento seleccionado', () => {
      component.selected = 102;
      component.latitude = 4.6;
      component.longitude = -74.1;

      component.save();

      expect(save).toHaveBeenCalledWith(
        102,
        expect.any(Object)
      );
    });

    it('debe mostrar confirmación después de guardar', () => {
      component.latitude = 4.6;
      component.longitude = -74.1;

      component.save();

      expect(component.notice()).toContain(
        'Ubicación guardada'
      );
    });

    it('debe informar si las coordenadas son inválidas', () => {
      save.mockImplementation(() => {
        throw new Error('Coordenadas inválidas');
      });

      component.latitude = 100;
      component.longitude = 200;

      component.save();

      expect(component.notice()).toContain(
        'Latitud entre'
      );
    });

    it('no debe guardar si no hay usuario autenticado', () => {
      currentUser.set(null);
      component.latitude = 4.6;
      component.longitude = -74.1;

      component.save();

      expect(save).not.toHaveBeenCalled();
    });
  });
});
