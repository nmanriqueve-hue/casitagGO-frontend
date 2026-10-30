
// @vitest-environment jsdom

import '@angular/compiler';

import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocationMapComponent } from './location-map.component';
import { MapsService } from '../../core/services/maps.service';
import type { GeoPoint } from '../../core/models/optional.models';

// Simulación de Leaflet para no necesitar un mapa real en las pruebas.
const leafletMock = vi.hoisted(() => {
  const map = {
    setView: vi.fn(),
    getContainer: vi.fn(),
    invalidateSize: vi.fn(),
    remove: vi.fn()
  };

  const marker = {
    addTo: vi.fn(),
    setLatLng: vi.fn()
  };

  const tile = {
    addTo: vi.fn()
  };

  map.setView.mockReturnValue(map);
  marker.addTo.mockReturnValue(marker);
  tile.addTo.mockReturnValue(tile);

  return {
    mapInstance: map,
    markerInstance: marker,
    tileInstance: tile,
    createMap: vi.fn(() => map),
    createMarker: vi.fn(() => marker),
    createTile: vi.fn(() => tile)
  };
});

vi.mock('leaflet', () => ({
  map: leafletMock.createMap,
  circleMarker: leafletMock.createMarker,
  tileLayer: leafletMock.createTile
}));

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

describe('LocationMapComponent', () => {
  let component: LocationMapComponent;

  let idInput: WritableSignal<number>;
  let cityInput: WritableSignal<string>;
  let uuidInput: WritableSignal<string | null>;
  let previewInput: WritableSignal<GeoPoint | null>;

  let consultarPunto: ReturnType<typeof vi.fn>;
  let consultarBack: ReturnType<typeof vi.fn>;

  const bogota = {
    latitude: 4.6097,
    longitude: -74.0817
  } as GeoPoint;

  const medellin = {
    latitude: 6.2442,
    longitude: -75.5812
  } as GeoPoint;

  const cali = {
    latitude: 3.4516,
    longitude: -76.532
  } as GeoPoint;

  function crearComponente(
    id = 1,
    ciudad = 'Bogotá',
    uuid: string | null = null,
    preview: GeoPoint | null = null
  ): LocationMapComponent {
    idInput = signal(id);
    cityInput = signal(ciudad);
    uuidInput = signal<string | null>(uuid);
    previewInput = signal<GeoPoint | null>(preview);

    const instancia = TestBed.runInInjectionContext(
      () => new LocationMapComponent()
    );

    Object.defineProperty(instancia, 'listingId', {
      value: idInput.asReadonly(),
      configurable: true
    });

    Object.defineProperty(instancia, 'city', {
      value: cityInput.asReadonly(),
      configurable: true
    });

    Object.defineProperty(instancia, 'listingUuid', {
      value: uuidInput.asReadonly(),
      configurable: true
    });

    Object.defineProperty(instancia, 'preview', {
      value: previewInput.asReadonly(),
      configurable: true
    });

    TestBed.tick();

    return instancia;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();

    consultarPunto = vi.fn().mockReturnValue(bogota);
    consultarBack = vi.fn().mockReturnValue(of(medellin));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: MapsService,
          useValue: {
            point: consultarPunto,
            ubicacionDeBack: consultarBack
          }
        }
      ]
    });

    component = crearComponente();
  });

  describe('Creación', () => {
    it('crea el componente', () => {
      expect(component).toBeTruthy();
    });

    it('recibe el ID del alojamiento', () => {
      expect(component.listingId()).toBe(1);
    });

    it('recibe la ciudad', () => {
      expect(component.city()).toBe('Bogotá');
    });

    it('inicia sin UUID', () => {
      expect(component.listingUuid()).toBeNull();
    });

    it('inicia sin vista previa', () => {
      expect(component.preview()).toBeNull();
    });

    it('inicia sin cargar', () => {
      expect(component.loading()).toBe(false);
    });
  });

  describe('Ubicación local', () => {
    it('consulta la ubicación por ID y ciudad', () => {
      component.point();

      expect(consultarPunto).toHaveBeenCalledWith(1, 'Bogotá');
    });

    it('obtiene la latitud', () => {
      expect(component.point()?.latitude).toBe(4.6097);
    });

    it('obtiene la longitud', () => {
      expect(component.point()?.longitude).toBe(-74.0817);
    });

    it('devuelve null cuando no existe ubicación', () => {
      consultarPunto.mockReturnValue(null);

      component = crearComponente(2, 'Sin ubicación');

      expect(component.point()).toBeNull();
    });

    it('consulta otra ciudad', () => {
      component = crearComponente(3, 'Cali');

      component.point();

      expect(consultarPunto).toHaveBeenCalledWith(3, 'Cali');
    });

    it('actualiza la ubicación cuando cambia el ID', () => {
      component.point();

      idInput.set(10);

      component.point();

      expect(consultarPunto).toHaveBeenCalledWith(10, 'Bogotá');
    });

    it('actualiza la ubicación cuando cambia la ciudad', () => {
      component.point();

      cityInput.set('Medellín');

      component.point();

      expect(consultarPunto).toHaveBeenCalledWith(1, 'Medellín');
    });
  });

  describe('Vista previa', () => {
    it('utiliza las coordenadas de vista previa', () => {
      component = crearComponente(1, 'Bogotá', null, cali);

      expect(component.point()?.latitude).toBe(3.4516);
    });

   it('prioriza la vista previa sobre la ubicación local', () => {
  consultarPunto.mockClear();

  component = crearComponente(1, 'Bogotá', null, cali);

  expect(component.point()?.longitude).toBe(-76.532);
  expect(consultarPunto).not.toHaveBeenCalled();
});

    it('actualiza la vista previa', () => {
      component.point();

      previewInput.set(cali);

      expect(component.point()?.latitude).toBe(3.4516);
    });

    it('vuelve a la ubicación local al quitar la vista previa', () => {
      component = crearComponente(1, 'Bogotá', null, cali);

      component.point();
      previewInput.set(null);

      expect(component.point()?.latitude).toBe(4.6097);
    });
  });

  describe('Validación de coordenadas', () => {
    it('acepta coordenadas válidas', () => {
      expect(component.validPoint()).toEqual(bogota);
    });

    it('rechaza latitudes superiores a 90', () => {
      previewInput.set({
        latitude: 91,
        longitude: -74
      } as GeoPoint);

      expect(component.validPoint()).toBeNull();
    });

    it('rechaza latitudes inferiores a -90', () => {
      previewInput.set({
        latitude: -91,
        longitude: -74
      } as GeoPoint);

      expect(component.validPoint()).toBeNull();
    });

    it('rechaza longitudes superiores a 180', () => {
      previewInput.set({
        latitude: 4,
        longitude: 181
      } as GeoPoint);

      expect(component.validPoint()).toBeNull();
    });

    it('rechaza longitudes inferiores a -180', () => {
      previewInput.set({
        latitude: 4,
        longitude: -181
      } as GeoPoint);

      expect(component.validPoint()).toBeNull();
    });

    it('rechaza NaN', () => {
      previewInput.set({
        latitude: NaN,
        longitude: -74
      } as GeoPoint);

      expect(component.validPoint()).toBeNull();
    });

    it('rechaza Infinity', () => {
      previewInput.set({
        latitude: 4,
        longitude: Infinity
      } as GeoPoint);

      expect(component.validPoint()).toBeNull();
    });

    it('acepta coordenadas límite', () => {
      previewInput.set({
        latitude: 90,
        longitude: 180
      } as GeoPoint);

      expect(component.validPoint()).not.toBeNull();
    });

    it('devuelve null si no hay coordenadas', () => {
      consultarPunto.mockReturnValue(null);

      component = crearComponente(2, 'Sin ubicación');

      expect(component.validPoint()).toBeNull();
    });
  });

  describe('Enlace externo', () => {
    it('genera un enlace HTTPS de OpenStreetMap', () => {
      expect(component.external()).toContain(
        'https://www.openstreetmap.org/'
      );
    });

    it('incluye la latitud', () => {
      expect(component.external()).toContain('mlat=4.6097');
    });

    it('incluye la longitud', () => {
      expect(component.external()).toContain('mlon=-74.0817');
    });

    it('incluye zoom 14', () => {
      expect(component.external()).toContain('#map=14/');
    });

    it('devuelve un enlace vacío sin coordenadas', () => {
      consultarPunto.mockReturnValue(null);

      component = crearComponente(2, 'Sin ubicación');

      expect(component.external()).toBe('');
    });

    it('no genera enlaces con coordenadas inválidas', () => {
      previewInput.set({
        latitude: 999,
        longitude: -74
      } as GeoPoint);

      expect(component.external()).toBe('');
    });

    it('actualiza el enlace con una vista previa', () => {
      component.external();

      previewInput.set(cali);

      expect(component.external()).toContain('mlat=3.4516');
    });
  });

  describe('Consulta al backend', () => {
    it('consulta el backend cuando existe UUID', () => {
      component = crearComponente(1, 'Bogotá', 'uuid-123');

      expect(consultarBack).toHaveBeenCalledWith('uuid-123');
    });

    it('utiliza la ubicación recibida del backend', () => {
      component = crearComponente(1, 'Bogotá', 'uuid-123');

      expect(component.point()?.latitude).toBe(6.2442);
    });

    it('no consulta la ubicación local cuando existe UUID', () => {
  consultarPunto.mockClear();

  component = crearComponente(1, 'Bogotá', 'uuid-123');

  component.point();

  expect(consultarPunto).not.toHaveBeenCalled();
});

    it('finaliza la carga al recibir datos', () => {
      component = crearComponente(1, 'Bogotá', 'uuid-123');

      expect(component.loading()).toBe(false);
    });

    it('mantiene loading mientras espera respuesta', () => {
      const respuesta = new Subject<GeoPoint | null>();

      consultarBack.mockReturnValue(respuesta.asObservable());

      component = crearComponente(1, 'Bogotá', 'uuid-123');

      expect(component.loading()).toBe(true);

      respuesta.next(medellin);

      expect(component.loading()).toBe(false);
    });

    it('actualiza el punto cuando llega la respuesta', () => {
      const respuesta = new Subject<GeoPoint | null>();

      consultarBack.mockReturnValue(respuesta.asObservable());

      component = crearComponente(1, 'Bogotá', 'uuid-123');

      expect(component.point()).toBeNull();

      respuesta.next(cali);

      expect(component.point()?.latitude).toBe(3.4516);
    });

    it('acepta una ubicación nula del backend', () => {
      consultarBack.mockReturnValue(of(null));

      component = crearComponente(1, 'Bogotá', 'uuid-123');

      expect(component.point()).toBeNull();
      expect(component.loading()).toBe(false);
    });

    it('controla los errores del backend', () => {
      consultarBack.mockReturnValue(
        throwError(() => new Error('Error de red'))
      );

      component = crearComponente(1, 'Bogotá', 'uuid-123');

      expect(component.point()).toBeNull();
      expect(component.loading()).toBe(false);
    });

    it('no consulta backend si no existe UUID', () => {
      expect(consultarBack).not.toHaveBeenCalled();
    });

    it('consulta nuevamente cuando cambia el UUID', () => {
      component = crearComponente(1, 'Bogotá', 'uuid-123');

      uuidInput.set('uuid-456');

      TestBed.tick();

      expect(consultarBack).toHaveBeenCalledWith('uuid-456');
    });

    it('prioriza la vista previa sobre el backend', () => {
      component = crearComponente(
        1,
        'Bogotá',
        'uuid-123',
        cali
      );

      expect(component.point()?.latitude).toBe(3.4516);
    });
  });

  describe('Leaflet', () => {
    it('tiene disponible la creación del mapa', () => {
      expect(leafletMock.createMap).toBeDefined();
    });

    it('tiene disponible la capa de OpenStreetMap', () => {
      expect(leafletMock.createTile).toBeDefined();
    });

    it('tiene disponible el marcador circular', () => {
      expect(leafletMock.createMarker).toBeDefined();
    });
  });
});
