// @vitest-environment jsdom
import '@angular/compiler';

import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocationPickerComponent } from './location-picker.component';
import { MapsService } from '../../core/services/maps.service';
import { GeoPoint } from '../../core/models/optional.models';

const estado = vi.hoisted(() => ({
  mapa: null as any,
  marcador: null as any,
  alClicMapa: null as any,
  alArrastrar: null as any,
  posicionMarcador: { lat: 0, lng: 0 }
}));

vi.mock('leaflet', () => {
  const crearMarcador = () => {
    const m: any = {};
    m.addTo = vi.fn(() => m);
    m.on = vi.fn((nombre: string, fn: any) => {
      if (nombre === 'dragend') { estado.alArrastrar = fn; }
      return m;
    });
    m.setLatLng = vi.fn();
    m.remove = vi.fn();
    m.getLatLng = vi.fn(() => ({
      wrap: () => ({ lat: estado.posicionMarcador.lat, lng: estado.posicionMarcador.lng })
    }));
    estado.marcador = m;
    return m;
  };
  const crearMapa = () => {
    const m: any = {};
    m.setView = vi.fn(() => m);
    m.on = vi.fn((nombre: string, fn: any) => {
      if (nombre === 'click') { estado.alClicMapa = fn; }
      return m;
    });
    m.remove = vi.fn();
    estado.mapa = m;
    return m;
  };
  return {
    map: vi.fn(() => crearMapa()),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    divIcon: vi.fn(() => ({})),
    marker: vi.fn(() => crearMarcador())
  };
});

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

describe('LocationPickerComponent', () => {
  let component: LocationPickerComponent;
  let buscarDireccion: ReturnType<typeof vi.fn>;

  const puntoA: GeoPoint = { latitude: 4.6812, longitude: -74.045, label: 'Direccion A' };
  const puntoB: GeoPoint = { latitude: 4.69, longitude: -74.04, label: 'Direccion B' };

  function fijar(nombre: string, valor: unknown): void {
    Object.defineProperty(component, nombre, { value: () => valor, configurable: true });
  }

  function fijarContenedor(): void {
    Object.defineProperty(component, 'contenedor', {
      value: () => ({ nativeElement: document.createElement('div') }),
      configurable: true
    });
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    estado.mapa = null;
    estado.marcador = null;
    estado.alClicMapa = null;
    estado.alArrastrar = null;
    buscarDireccion = vi.fn().mockResolvedValue([puntoA, puntoB]);
    TestBed.configureTestingModule({
      providers: [{ provide: MapsService, useValue: { buscarDireccion } }]
    });
    component = TestBed.runInInjectionContext(() => new LocationPickerComponent());
    fijarContenedor();
  });

  describe('elegir', () => {
    it('guarda el punto redondeado a 6 decimales', () => {
      component.elegir(4.12345678, -74.98765432);

      expect(component.punto()).toEqual({
        latitude: 4.123457,
        longitude: -74.987654,
        label: 'Punto elegido en el mapa'
      });
    });

    it('limpia alternativas y error', () => {
      component.alternativas.set([puntoB]);
      component.error.set('algo');

      component.elegir(4.6, -74.0);

      expect(component.alternativas()).toEqual([]);
      expect(component.error()).toBe('');
    });
  });

  describe('usarResultado y elegirAlternativa', () => {
    it('usa el resultado con su etiqueta y limpia el error', () => {
      component.error.set('algo');

      component.usarResultado(puntoA);

      expect(component.punto()).toEqual(puntoA);
      expect(component.error()).toBe('');
    });

    it('centra el mapa cuando ya existe', () => {
      component.ngAfterViewInit();

      component.usarResultado(puntoA);

      expect(estado.mapa.setView).toHaveBeenLastCalledWith([4.6812, -74.045], 16);
    });

    it('elegirAlternativa usa el resultado y vacia las alternativas', () => {
      component.alternativas.set([puntoB]);

      component.elegirAlternativa(puntoB);

      expect(component.punto()).toEqual(puntoB);
      expect(component.alternativas()).toEqual([]);
    });
  });

  describe('quitar', () => {
    it('quita el punto si se permite', () => {
      fijar('permitirQuitar', true);
      component.punto.set(puntoA);
      component.alternativas.set([puntoB]);
      component.error.set('algo');

      component.quitar();

      expect(component.punto()).toBeNull();
      expect(component.alternativas()).toEqual([]);
      expect(component.error()).toBe('');
    });

    it('no quita el punto si no se permite', () => {
      fijar('permitirQuitar', false);
      component.punto.set(puntoA);

      component.quitar();

      expect(component.punto()).toEqual(puntoA);
    });
  });

  describe('buscar', () => {
    it('pide ciudad y direccion si son muy cortas', async () => {
      fijar('city', 'Bo');
      fijar('address', 'Calle 100');

      await component.buscar();

      expect(component.error()).toContain('Escribe la ciudad y la direccion'.replace('direccion', 'dirección'));
      expect(buscarDireccion).not.toHaveBeenCalled();
    });

    it('pide ciudad y direccion si la direccion esta vacia', async () => {
      fijar('city', 'Bogota');
      fijar('address', '  ');

      await component.buscar();

      expect(component.error()).not.toBe('');
      expect(buscarDireccion).not.toHaveBeenCalled();
    });

    it('usa el primer resultado y deja los demas como alternativas', async () => {
      fijar('city', ' Bogota ');
      fijar('address', ' Calle 100 ');

      await component.buscar();

      expect(buscarDireccion).toHaveBeenCalledWith('Bogota', 'Calle 100');
      expect(component.punto()).toEqual(puntoA);
      expect(component.alternativas()).toEqual([puntoB]);
      expect(component.error()).toBe('');
      expect(component.buscando()).toBe(false);
    });

    it('avisa si no hay resultados', async () => {
      fijar('city', 'Bogota');
      fijar('address', 'Calle 999');
      buscarDireccion.mockResolvedValue([]);

      await component.buscar();

      expect(component.error()).toContain('No se encontr');
      expect(component.punto()).toBeNull();
      expect(component.buscando()).toBe(false);
    });

    it('avisa si la busqueda falla', async () => {
      fijar('city', 'Bogota');
      fijar('address', 'Calle 100');
      buscarDireccion.mockRejectedValue(new Error('sin conexion'));

      await component.buscar();

      expect(component.error()).toContain('No se pudo buscar');
      expect(component.buscando()).toBe(false);
    });

    it('ignora una busqueda nueva mientras hay otra en curso', async () => {
      fijar('city', 'Bogota');
      fijar('address', 'Calle 100');
      let terminar: (valor: GeoPoint[]) => void = () => undefined;
      buscarDireccion.mockReturnValue(new Promise<GeoPoint[]>((resolver) => { terminar = resolver; }));

      const primera = component.buscar();
      await component.buscar();
      terminar([puntoA]);
      await primera;

      expect(buscarDireccion).toHaveBeenCalledTimes(1);
    });
  });

  describe('mapa de Leaflet', () => {
    it('sin punto inicial centra en Colombia con zoom 6 y no crea marcador', () => {
      component.ngAfterViewInit();

      expect(estado.mapa.setView).toHaveBeenCalledWith([4.57, -74.3], 6);
      expect(estado.marcador).toBeNull();
    });

    it('con punto inicial centra en el punto con zoom 16 y crea marcador', () => {
      component.punto.set(puntoA);

      component.ngAfterViewInit();

      expect(estado.mapa.setView).toHaveBeenCalledWith([4.6812, -74.045], 16);
      expect(estado.marcador).not.toBeNull();
    });

    it('un clic en el mapa elige ese punto', () => {
      component.ngAfterViewInit();

      estado.alClicMapa({ latlng: { wrap: () => ({ lat: 4.5555555, lng: -74.1111111 }) } });

      expect(component.punto()).toEqual({
        latitude: 4.555556,
        longitude: -74.111111,
        label: 'Punto elegido en el mapa'
      });
    });

    it('arrastrar el marcador elige el nuevo punto', () => {
      component.punto.set(puntoA);
      component.ngAfterViewInit();
      estado.posicionMarcador = { lat: 4.7, lng: -74.2 };

      estado.alArrastrar();

      expect(component.punto()).toEqual({
        latitude: 4.7,
        longitude: -74.2,
        label: 'Punto elegido en el mapa'
      });
    });

    it('mueve el marcador existente cuando cambia el punto', () => {
      component.punto.set(puntoA);
      component.ngAfterViewInit();

      (component as any).pintar(puntoB);

      expect(estado.marcador.setLatLng).toHaveBeenCalledWith([4.69, -74.04]);
    });

    it('quita el marcador cuando se borra el punto', () => {
      component.punto.set(puntoA);
      component.ngAfterViewInit();
      const marcador = estado.marcador;

      (component as any).pintar(null);

      expect(marcador.remove).toHaveBeenCalled();
    });

    it('no falla al pintar sin marcador y sin punto', () => {
      component.ngAfterViewInit();

      expect(() => (component as any).pintar(null)).not.toThrow();
    });

    it('pintar no hace nada si el mapa no existe', () => {
      (component as any).pintar(puntoA);

      expect(estado.marcador).toBeNull();
    });

    it('el efecto vuelve a pintar cuando cambia el punto', () => {
      component.ngAfterViewInit();
      TestBed.tick();

      component.punto.set(puntoA);
      TestBed.tick();

      expect(estado.marcador).not.toBeNull();
    });

    it('ngOnDestroy elimina el mapa', () => {
      component.ngAfterViewInit();
      const mapa = estado.mapa;

      component.ngOnDestroy();

      expect(mapa.remove).toHaveBeenCalled();
    });

    it('ngOnDestroy no falla si el mapa nunca se creo', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});
