// @vitest-environment jsdom
import '@angular/compiler';

import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MapsService } from './maps.service';

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

describe('MapsService.buscarDireccion', () => {
  let service: MapsService;
  let httpGet: ReturnType<typeof vi.fn>;

  const respuestaNominatim = [
    { lat: '4.6812', lon: '-74.0450', display_name: 'Carrera 15 con Calle 100, Bogota' },
    { lat: '4.6900', lon: '-74.0400', display_name: 'Calle 100, Bogota' }
  ];

  const respuestaGeoapify = {
    results: [
      { lat: 4.6812, lon: -74.045, formatted: 'Calle 100, Bogota, Colombia' }
    ]
  };

  function fijarGeoapify(activo: boolean): void {
    Object.defineProperty(service, 'addressSearchEnabled', {
      value: activo,
      writable: true
    });
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    httpGet = vi.fn().mockReturnValue(of(respuestaNominatim));
    TestBed.configureTestingModule({
      providers: [
        MapsService,
        { provide: HttpClient, useValue: { get: httpGet } }
      ]
    });
    service = TestBed.inject(MapsService);
    fijarGeoapify(false);
  });

  describe('sin clave de Geoapify (Nominatim)', () => {
    it('devuelve lista vacia si el texto es muy corto', async () => {
      expect(await service.buscarDireccion('', 'ab')).toEqual([]);
      expect(httpGet).not.toHaveBeenCalled();
    });

    it('devuelve lista vacia si ciudad y direccion estan vacias', async () => {
      expect(await service.buscarDireccion('  ', '  ')).toEqual([]);
      expect(httpGet).not.toHaveBeenCalled();
    });

    it('consulta Nominatim con direccion y ciudad', async () => {
      await service.buscarDireccion('Bogota', 'Carrera 15 con Calle 100');

      expect(httpGet).toHaveBeenCalledTimes(1);
      const url = httpGet.mock.calls[0][0];
      const opciones = httpGet.mock.calls[0][1];
      expect(url).toBe('https://nominatim.openstreetmap.org/search');
      expect(opciones.params.q).toBe('Carrera 15 con Calle 100, Bogota');
      expect(opciones.params.countrycodes).toBe('co');
      expect(opciones.params.limit).toBe(5);
    });

    it('convierte las coordenadas de texto a numeros', async () => {
      const puntos = await service.buscarDireccion('Bogota', 'Calle 100');

      expect(puntos).toEqual([
        { latitude: 4.6812, longitude: -74.045, label: 'Carrera 15 con Calle 100, Bogota' },
        { latitude: 4.69, longitude: -74.04, label: 'Calle 100, Bogota' }
      ]);
    });

    it('busca solo por ciudad si la direccion esta vacia', async () => {
      await service.buscarDireccion('Bogota', '');

      expect(httpGet.mock.calls[0][1].params.q).toBe('Bogota');
    });

    it('descarta resultados con coordenadas invalidas', async () => {
      httpGet.mockReturnValue(of([
        { lat: 'abc', lon: '-74.0', display_name: 'Invalido' },
        { lat: '4.6', lon: 'xyz', display_name: 'Invalido 2' },
        { lat: '4.6', lon: '-74.0', display_name: 'Valido' }
      ]));

      const puntos = await service.buscarDireccion('Bogota', 'Calle 1');

      expect(puntos).toEqual([
        { latitude: 4.6, longitude: -74, label: 'Valido' }
      ]);
    });

    it('devuelve lista vacia si no hay coincidencias', async () => {
      httpGet.mockReturnValue(of([]));

      expect(await service.buscarDireccion('Bogota', 'Calle 999')).toEqual([]);
    });

    it('usa la cache en una segunda busqueda igual', async () => {
      const primera = await service.buscarDireccion('Bogota', 'Calle 100');
      const segunda = await service.buscarDireccion('BOGOTA', 'calle 100');

      expect(segunda).toEqual(primera);
      expect(httpGet).toHaveBeenCalledTimes(1);
    });

    it('tambien guarda en cache las busquedas sin resultados', async () => {
      httpGet.mockReturnValue(of([]));

      await service.buscarDireccion('Bogota', 'Calle 999');
      await service.buscarDireccion('Bogota', 'Calle 999');

      expect(httpGet).toHaveBeenCalledTimes(1);
    });

    it('propaga el error si Nominatim falla', async () => {
      httpGet.mockReturnValue(throwError(() => new Error('sin conexion')));

      const busqueda = service.buscarDireccion('Bogota', 'Calle 100');

      await expect(busqueda).rejects.toThrow('sin conexion');
    });
  });

  describe('con clave de Geoapify', () => {
    beforeEach(() => {
      fijarGeoapify(true);
      httpGet.mockReturnValue(of(respuestaGeoapify));
    });

    it('delega en Geoapify y no consulta Nominatim', async () => {
      const puntos = await service.buscarDireccion('Bogota', 'Calle 100');

      expect(httpGet).toHaveBeenCalledTimes(1);
      const url = httpGet.mock.calls[0][0];
      const opciones = httpGet.mock.calls[0][1];
      expect(url).toBe('https://api.geoapify.com/v1/geocode/search');
      expect(opciones.params.text).toBe('Calle 100, Bogota');
      expect(puntos).toEqual([
        { latitude: 4.6812, longitude: -74.045, label: 'Calle 100, Bogota, Colombia' }
      ]);
    });

    it('devuelve lista vacia si el texto es muy corto sin llamar a Geoapify', async () => {
      expect(await service.buscarDireccion('', 'ab')).toEqual([]);
      expect(httpGet).not.toHaveBeenCalled();
    });
  });
});
