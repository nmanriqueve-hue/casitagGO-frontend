
// @vitest-environment jsdom
import '@angular/compiler';

import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { MapsService } from './maps.service';
import { API_URL } from '../config/api.config';
import { MAPS_CONFIG } from '../config/maps.config';
import { GeoPoint } from '../models/optional.models';

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

describe('MapsService', () => {
  let service: MapsService;
  let httpGet: ReturnType<typeof vi.fn>;

  const puntoBogota: GeoPoint = {
    latitude: 4.65,
    longitude: -74.06,
    label: 'Bogotá · ubicación aproximada'
  };

  const puntoPersonalizado: GeoPoint = {
    latitude: 4.711,
    longitude: -74.0721,
    label: 'Alojamiento de prueba'
  };

  const respuestaCiudades = {
    results: [
      {
        latitude: 4.711,
        longitude: -74.0721,
        name: 'Bogotá',
        admin1: 'Bogotá D.C.',
        country: 'Colombia'
      },
      {
        latitude: 6.2442,
        longitude: -75.5812,
        name: 'Medellín',
        admin1: 'Antioquia',
        country: 'Colombia'
      }
    ]
  };

  const respuestaDirecciones = {
    results: [
      {
        lat: 4.6097,
        lon: -74.0817,
        formatted: 'La Candelaria, Bogotá, Colombia'
      },
      {
        lat: 4.6533,
        lon: -74.0837,
        formatted: 'Chapinero, Bogotá, Colombia'
      }
    ]
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    httpGet = vi.fn().mockReturnValue(of(respuestaCiudades));

    TestBed.configureTestingModule({
      providers: [
        MapsService,
        {
          provide: HttpClient,
          useValue: { get: httpGet }
        }
      ]
    });

    service = TestBed.inject(MapsService);
  });

  describe('Inicialización', () => {
    it('debe crear el servicio', () => {
      expect(service).toBeTruthy();
    });

    it('debe indicar si Geoapify está configurado', () => {
      expect(service.addressSearchEnabled)
        .toBe(Boolean(MAPS_CONFIG.geoapifyApiKey));
    });

    it('debe iniciar sin posiciones personalizadas', () => {
      expect(service.point(999, 'Ciudad inexistente')).toBeNull();
    });
  });

  describe('Ciudades predeterminadas', () => {
    it('debe devolver Bogotá', () => {
      expect(service.point(1, 'Bogotá')).toEqual(puntoBogota);
    });

    it('debe devolver Cartagena', () => {
      expect(service.point(1, 'Cartagena')).toEqual({
        latitude: 10.42,
        longitude: -75.55,
        label: 'Cartagena · ubicación aproximada'
      });
    });

    it('debe devolver Medellín', () => {
      expect(service.point(1, 'Medellín')).toEqual({
        latitude: 6.24,
        longitude: -75.58,
        label: 'Medellín · ubicación aproximada'
      });
    });

    it('debe devolver Cali', () => {
      expect(service.point(1, 'Cali')).toEqual({
        latitude: 3.45,
        longitude: -76.53,
        label: 'Cali · ubicación aproximada'
      });
    });

    it('debe devolver Villa de Leyva', () => {
      expect(service.point(1, 'Villa de Leyva')).toEqual({
        latitude: 5.64,
        longitude: -73.52,
        label: 'Villa de Leyva · ubicación aproximada'
      });
    });

    it('debe devolver null para ciudades desconocidas', () => {
      expect(service.point(1, 'Ciudad desconocida')).toBeNull();
    });

    it('debe distinguir mayúsculas y minúsculas', () => {
      expect(service.point(1, 'bogotá')).toBeNull();
    });

    it('debe devolver coordenadas numéricas', () => {
      const punto = service.point(1, 'Bogotá');

      expect(typeof punto?.latitude).toBe('number');
      expect(typeof punto?.longitude).toBe('number');
    });
  });

  describe('Guardar coordenadas', () => {
    it('debe guardar coordenadas válidas', () => {
      service.save(101, puntoPersonalizado);

      expect(service.point(101, 'Bogotá'))
        .toEqual(puntoPersonalizado);
    });

    it('debe priorizar las coordenadas guardadas', () => {
      service.save(101, puntoPersonalizado);

      expect(service.point(101, 'Bogotá')?.latitude).toBe(4.711);
    });

    it('debe actualizar coordenadas existentes', () => {
      service.save(101, puntoPersonalizado);

      const nuevoPunto: GeoPoint = {
        latitude: 10.42,
        longitude: -75.55,
        label: 'Nueva ubicación'
      };

      service.save(101, nuevoPunto);

      expect(service.point(101, 'Bogotá')).toEqual(nuevoPunto);
    });

    it('debe guardar diferentes alojamientos', () => {
      service.save(101, puntoPersonalizado);

      service.save(102, {
        latitude: 6.24,
        longitude: -75.58,
        label: 'Segundo alojamiento'
      });

      expect(service.point(101, 'Bogotá')?.latitude).toBe(4.711);
      expect(service.point(102, 'Bogotá')?.latitude).toBe(6.24);
    });

    it('debe permitir latitud cero', () => {
      service.save(101, {
        latitude: 0,
        longitude: -74,
        label: 'Ecuador'
      });

      expect(service.point(101, 'Bogotá')?.latitude).toBe(0);
    });

    it('debe permitir longitud cero', () => {
      service.save(101, {
        latitude: 4,
        longitude: 0,
        label: 'Meridiano'
      });

      expect(service.point(101, 'Bogotá')?.longitude).toBe(0);
    });

    it('debe permitir latitud 90', () => {
      service.save(101, {
        latitude: 90,
        longitude: 0,
        label: 'Polo norte'
      });

      expect(service.point(101, 'Bogotá')?.latitude).toBe(90);
    });

    it('debe permitir latitud -90', () => {
      service.save(101, {
        latitude: -90,
        longitude: 0,
        label: 'Polo sur'
      });

      expect(service.point(101, 'Bogotá')?.latitude).toBe(-90);
    });

    it('debe permitir longitud 180', () => {
      service.save(101, {
        latitude: 0,
        longitude: 180,
        label: 'Límite oriental'
      });

      expect(service.point(101, 'Bogotá')?.longitude).toBe(180);
    });

    it('debe permitir longitud -180', () => {
      service.save(101, {
        latitude: 0,
        longitude: -180,
        label: 'Límite occidental'
      });

      expect(service.point(101, 'Bogotá')?.longitude).toBe(-180);
    });

    it('debe rechazar latitud mayor a 90', () => {
      expect(() => service.save(101, {
        latitude: 90.01,
        longitude: 0,
        label: 'Inválido'
      })).toThrow('Coordenadas inválidas.');
    });

    it('debe rechazar latitud menor a -90', () => {
      expect(() => service.save(101, {
        latitude: -90.01,
        longitude: 0,
        label: 'Inválido'
      })).toThrow('Coordenadas inválidas.');
    });

    it('debe rechazar longitud mayor a 180', () => {
      expect(() => service.save(101, {
        latitude: 0,
        longitude: 180.01,
        label: 'Inválido'
      })).toThrow('Coordenadas inválidas.');
    });

    it('debe rechazar longitud menor a -180', () => {
      expect(() => service.save(101, {
        latitude: 0,
        longitude: -180.01,
        label: 'Inválido'
      })).toThrow('Coordenadas inválidas.');
    });

    it('debe rechazar latitud NaN', () => {
      expect(() => service.save(101, {
        latitude: NaN,
        longitude: -74,
        label: 'Inválido'
      })).toThrow('Coordenadas inválidas.');
    });

    it('debe rechazar longitud NaN', () => {
      expect(() => service.save(101, {
        latitude: 4,
        longitude: NaN,
        label: 'Inválido'
      })).toThrow('Coordenadas inválidas.');
    });

    it('debe rechazar latitud infinita', () => {
      expect(() => service.save(101, {
        latitude: Infinity,
        longitude: -74,
        label: 'Inválido'
      })).toThrow('Coordenadas inválidas.');
    });

    it('debe rechazar longitud infinita', () => {
      expect(() => service.save(101, {
        latitude: 4,
        longitude: -Infinity,
        label: 'Inválido'
      })).toThrow('Coordenadas inválidas.');
    });

    it('no debe guardar coordenadas inválidas', () => {
      expect(() => service.save(101, {
        latitude: 200,
        longitude: 0,
        label: 'Inválido'
      })).toThrow();

      expect(service.point(101, 'Bogotá')).toEqual(puntoBogota);
    });

    it('debe conservar las coordenadas anteriores si falla', () => {
      service.save(101, puntoPersonalizado);

      expect(() => service.save(101, {
        latitude: 999,
        longitude: 0,
        label: 'Inválido'
      })).toThrow();

      expect(service.point(101, 'Bogotá'))
        .toEqual(puntoPersonalizado);
    });

    it('debe guardar una copia de las coordenadas', () => {
      const punto = { ...puntoPersonalizado };

      service.save(101, punto);
      punto.latitude = 20;

      expect(service.point(101, 'Bogotá')?.latitude).toBe(4.711);
    });
  });

  describe('Búsqueda de ciudades con Open-Meteo', () => {
    it('debe rechazar una búsqueda vacía', async () => {
      expect(await service.search('')).toEqual([]);
      expect(httpGet).not.toHaveBeenCalled();
    });

    it('debe rechazar nombres menores a tres caracteres', async () => {
      expect(await service.search('Bo')).toEqual([]);
      expect(httpGet).not.toHaveBeenCalled();
    });

    it('debe eliminar espacios del nombre', async () => {
      await service.search('  Bogotá  ');

      expect(httpGet).toHaveBeenCalledWith(
        'https://geocoding-api.open-meteo.com/v1/search',
        {
          params: {
            name: 'Bogotá',
            count: 5,
            language: 'es',
            format: 'json'
          }
        }
      );
    });

    it('debe consultar Open-Meteo', async () => {
      await service.search('Bogotá');

      expect(httpGet).toHaveBeenCalledWith(
        'https://geocoding-api.open-meteo.com/v1/search',
        {
          params: {
            name: 'Bogotá',
            count: 5,
            language: 'es',
            format: 'json'
          }
        }
      );
    });

    it('debe transformar los resultados en coordenadas', async () => {
      const puntos = await service.search('Bogotá');

      expect(puntos[0]).toEqual({
        latitude: 4.711,
        longitude: -74.0721,
        label: 'Bogotá, Bogotá D.C., Colombia'
      });
    });

    it('debe devolver varios resultados', async () => {
      const puntos = await service.search('Bogotá');

      expect(puntos).toHaveLength(2);
    });

    it('debe manejar resultados vacíos', async () => {
      httpGet.mockReturnValue(of({ results: [] }));

      expect(await service.search('Bogotá')).toEqual([]);
    });

    it('debe manejar respuestas sin results', async () => {
      httpGet.mockReturnValue(of({}));

      expect(await service.search('Bogotá')).toEqual([]);
    });

    it('debe construir etiquetas sin campos opcionales', async () => {
      httpGet.mockReturnValue(of({
        results: [
          {
            latitude: 4.7,
            longitude: -74,
            name: 'Bogotá'
          }
        ]
      }));

      const puntos = await service.search('Bogotá');

      expect(puntos[0].label).toBe('Bogotá');
    });

    it('debe utilizar caché para búsquedas repetidas', async () => {
      await service.search('Bogotá');
      await service.search('Bogotá');

      expect(httpGet).toHaveBeenCalledTimes(1);
    });

    it('debe separar el caché por ciudad', async () => {
      await service.search('Bogotá');
      await service.search('Medellín');

      expect(httpGet).toHaveBeenCalledTimes(2);
    });

    it('debe devolver resultados guardados en caché', async () => {
      const primero = await service.search('Bogotá');
      const segundo = await service.search('Bogotá');

      expect(segundo).toEqual(primero);
    });

    it('debe propagar errores de búsqueda', async () => {
      httpGet.mockReturnValue(
        throwError(() => new Error('Error de conexión'))
      );

      await expect(service.search('Bogotá'))
        .rejects.toThrow('Error de conexión');
    });
  });

  describe('Ubicaciones del backend', () => {
    it('debe consultar la ubicación de una publicación', async () => {
      httpGet.mockReturnValue(of({
        publicacionId: 'uuid-101',
        latitud: 4.711,
        longitud: -74.0721,
        aproximada: false
      }));

      await firstValueFrom(service.ubicacionDeBack('uuid-101'));

      expect(httpGet).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/uuid-101/ubicacion`
      );
    });

    it('debe transformar coordenadas del backend', async () => {
      httpGet.mockReturnValue(of({
        publicacionId: 'uuid-101',
        latitud: 4.711,
        longitud: -74.0721,
        aproximada: false
      }));

      const punto = await firstValueFrom(
        service.ubicacionDeBack('uuid-101')
      );

      expect(punto).toEqual({
        latitude: 4.711,
        longitude: -74.0721,
        label: 'Ubicación del alojamiento'
      });
    });

    it('debe identificar ubicaciones aproximadas', async () => {
      httpGet.mockReturnValue(of({
        publicacionId: 'uuid-101',
        latitud: 4.65,
        longitud: -74.06,
        aproximada: true
      }));

      const punto = await firstValueFrom(
        service.ubicacionDeBack('uuid-101')
      );

      expect(punto?.label)
        .toBe('Ubicación aproximada (centro de la ciudad)');
    });

    it('debe rechazar latitud nula', async () => {
      httpGet.mockReturnValue(of({
        publicacionId: 'uuid-101',
        latitud: null,
        longitud: -74.06
      }));

      const punto = await firstValueFrom(
        service.ubicacionDeBack('uuid-101')
      );

      expect(punto).toBeNull();
    });

    it('debe rechazar longitud nula', async () => {
      httpGet.mockReturnValue(of({
        publicacionId: 'uuid-101',
        latitud: 4.65,
        longitud: null
      }));

      const punto = await firstValueFrom(
        service.ubicacionDeBack('uuid-101')
      );

      expect(punto).toBeNull();
    });

    it('debe rechazar coordenadas NaN', async () => {
      httpGet.mockReturnValue(of({
        publicacionId: 'uuid-101',
        latitud: NaN,
        longitud: -74
      }));

      const punto = await firstValueFrom(
        service.ubicacionDeBack('uuid-101')
      );

      expect(punto).toBeNull();
    });

    it('debe devolver null cuando falla el backend', async () => {
      httpGet.mockReturnValue(
        throwError(() => new Error('Error del servidor'))
      );

      const punto = await firstValueFrom(
        service.ubicacionDeBack('uuid-101')
      );

      expect(punto).toBeNull();
    });
  });

  describe('Búsqueda de direcciones', () => {
    it('debe rechazar búsquedas demasiado cortas', async () => {
      expect(await service.searchAddress('Bo')).toEqual([]);
      expect(httpGet).not.toHaveBeenCalled();
    });

    it('debe rechazar búsquedas vacías', async () => {
      expect(await service.searchAddress('')).toEqual([]);
      expect(httpGet).not.toHaveBeenCalled();
    });

    it('debe permitir buscar solamente por ciudad', async () => {
      httpGet.mockReturnValue(of(
        service.addressSearchEnabled
          ? respuestaDirecciones
          : respuestaCiudades
      ));

      const puntos = await service.searchAddress('Bogotá');

      expect(puntos.length).toBeGreaterThan(0);
    });

    it('debe requerir Geoapify para buscar por barrio', async () => {
      if (service.addressSearchEnabled) {
        httpGet.mockReturnValue(of(respuestaDirecciones));

        const puntos = await service.searchAddress(
          'Bogotá',
          'Chapinero'
        );

        expect(puntos.length).toBeGreaterThan(0);
      } else {
        await expect(
          service.searchAddress('Bogotá', 'Chapinero')
        ).rejects.toThrow(
          'La búsqueda por dirección y barrio requiere configurar'
        );
      }
    });

    it('debe requerir Geoapify para buscar por dirección', async () => {
      if (service.addressSearchEnabled) {
        httpGet.mockReturnValue(of(respuestaDirecciones));

        const puntos = await service.searchAddress(
          'Bogotá',
          '',
          'Calle 10'
        );

        expect(puntos.length).toBeGreaterThan(0);
      } else {
        await expect(
          service.searchAddress('Bogotá', '', 'Calle 10')
        ).rejects.toThrow(
          'La búsqueda por dirección y barrio requiere configurar'
        );
      }
    });

    it('debe consultar el proveedor configurado', async () => {
      httpGet.mockReturnValue(of(
        service.addressSearchEnabled
          ? respuestaDirecciones
          : respuestaCiudades
      ));

      await service.searchAddress('Bogotá');

      expect(httpGet).toHaveBeenCalledWith(
        service.addressSearchEnabled
          ? 'https://api.geoapify.com/v1/geocode/search'
          : 'https://geocoding-api.open-meteo.com/v1/search',
        expect.any(Object)
      );
    });

    it('debe utilizar caché en búsquedas repetidas', async () => {
      httpGet.mockReturnValue(of(
        service.addressSearchEnabled
          ? respuestaDirecciones
          : respuestaCiudades
      ));

      await service.searchAddress('Bogotá');
      await service.searchAddress('Bogotá');

      expect(httpGet).toHaveBeenCalledTimes(1);
    });

    it('debe construir correctamente el texto de búsqueda', async () => {
      if (!service.addressSearchEnabled) {
        await expect(
          service.searchAddress(
            'Bogotá',
            'Chapinero',
            'Calle 10'
          )
        ).rejects.toThrow();

        return;
      }

      httpGet.mockReturnValue(of(respuestaDirecciones));

      await service.searchAddress(
        'Bogotá',
        'Chapinero',
        'Calle 10'
      );

      expect(httpGet).toHaveBeenCalledWith(
        'https://api.geoapify.com/v1/geocode/search',
        {
          params: {
            text: 'Calle 10, Chapinero, Bogotá',
            lang: 'es',
            limit: 5,
            format: 'json',
            bias: 'countrycode:co',
            apiKey: MAPS_CONFIG.geoapifyApiKey
          }
        }
      );
    });

    it('debe filtrar coordenadas inválidas de Geoapify', async () => {
      if (!service.addressSearchEnabled) {
        expect(service.addressSearchEnabled).toBe(false);
        return;
      }

      httpGet.mockReturnValue(of({
        results: [
          {
            lat: 4.7,
            lon: -74,
            formatted: 'Ubicación válida'
          },
          {
            lat: NaN,
            lon: -74,
            formatted: 'Ubicación inválida'
          }
        ]
      }));

      const puntos = await service.searchAddress(
        'Bogotá',
        'Chapinero'
      );

      expect(puntos).toHaveLength(1);
      expect(puntos[0].label).toBe('Ubicación válida');
    });

    it('debe manejar respuestas vacías de Geoapify', async () => {
      if (!service.addressSearchEnabled) {
        expect(service.addressSearchEnabled).toBe(false);
        return;
      }

      httpGet.mockReturnValue(of({}));

      const puntos = await service.searchAddress(
        'Bogotá',
        'Chapinero'
      );

      expect(puntos).toEqual([]);
    });

    it('debe propagar errores de Geoapify', async () => {
      if (!service.addressSearchEnabled) {
        expect(service.addressSearchEnabled).toBe(false);
        return;
      }

      httpGet.mockReturnValue(
        throwError(() => new Error('Error Geoapify'))
      );

      await expect(
        service.searchAddress('Bogotá', 'Chapinero')
      ).rejects.toThrow('Error Geoapify');
    });
  });
});
