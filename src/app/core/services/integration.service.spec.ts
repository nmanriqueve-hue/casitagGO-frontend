
// @vitest-environment jsdom
import '@angular/compiler';

import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import {
  beforeEach,
  describe,
  expect,
  it
} from 'vitest';

import {
  IntegrationService,
  ExternalIntegrationConfig
} from './integration.service';

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

describe('IntegrationService', () => {
  let service: IntegrationService;

  beforeEach(() => {
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [IntegrationService]
    });

    service = TestBed.inject(IntegrationService);
  });

  describe('Inicialización del servicio', () => {
    it('debe crear el servicio correctamente', () => {
      expect(service).toBeTruthy();
    });

    it('debe obtener una instancia de IntegrationService', () => {
      expect(service).toBeInstanceOf(IntegrationService);
    });

    it('debe tener una configuración definida', () => {
      expect(service.config).toBeDefined();
    });

    it('debe contener las tres propiedades de configuración', () => {
      expect(Object.keys(service.config)).toEqual([
        'apiBaseUrl',
        'mapsProviderUrl',
        'stripePublicKey'
      ]);
    });

    it('debe permitir asignar una configuración compatible', () => {
      const configuracion: ExternalIntegrationConfig = {
        apiBaseUrl: 'http://localhost:8080/api',
        mapsProviderUrl: '',
        stripePublicKey: ''
      };

      expect(service.config).toEqual(configuracion);
    });
  });

  describe('Configuración de la API', () => {
    it('debe tener la URL predeterminada del backend', () => {
      expect(service.config.apiBaseUrl)
        .toBe('http://localhost:8080/api');
    });

    it('debe tener una URL de API de tipo string', () => {
      expect(typeof service.config.apiBaseUrl).toBe('string');
    });

    it('debe permitir modificar la URL de la API', () => {
      service.config.apiBaseUrl = 'https://api.ejemplo.com';

      expect(service.config.apiBaseUrl)
        .toBe('https://api.ejemplo.com');
    });
  });

  describe('Disponibilidad de mapas', () => {
    it('debe iniciar sin proveedor de mapas', () => {
      expect(service.config.mapsProviderUrl).toBe('');
    });

    it('debe indicar que los mapas no están disponibles inicialmente', () => {
      expect(service.mapAvailable()).toBe(false);
    });

    it('debe activar mapas cuando se configura un proveedor', () => {
      service.config.mapsProviderUrl =
        'https://maps.ejemplo.com';

      expect(service.mapAvailable()).toBe(true);
    });

    it('debe desactivar mapas cuando se elimina el proveedor', () => {
      service.config.mapsProviderUrl =
        'https://maps.ejemplo.com';

      expect(service.mapAvailable()).toBe(true);

      service.config.mapsProviderUrl = '';

      expect(service.mapAvailable()).toBe(false);
    });

    it('debe evaluar la disponibilidad de mapas como booleano', () => {
      expect(typeof service.mapAvailable()).toBe('boolean');
    });
  });

  describe('Disponibilidad de pagos', () => {
    it('debe iniciar sin clave pública de Stripe', () => {
      expect(service.config.stripePublicKey).toBe('');
    });

    it('debe indicar que los pagos no están disponibles inicialmente', () => {
      expect(service.paymentsAvailable()).toBe(false);
    });

    it('debe activar pagos cuando existe una clave pública', () => {
      service.config.stripePublicKey = 'pk_test_123456';

      expect(service.paymentsAvailable()).toBe(true);
    });

    it('debe desactivar pagos al eliminar la clave', () => {
      service.config.stripePublicKey = 'pk_test_123456';

      expect(service.paymentsAvailable()).toBe(true);

      service.config.stripePublicKey = '';

      expect(service.paymentsAvailable()).toBe(false);
    });

    it('debe evaluar la disponibilidad de pagos como booleano', () => {
      expect(typeof service.paymentsAvailable()).toBe('boolean');
    });
  });

  describe('Independencia de integraciones', () => {
    it('debe permitir mapas activos y pagos inactivos', () => {
      service.config.mapsProviderUrl =
        'https://maps.ejemplo.com';

      expect(service.mapAvailable()).toBe(true);
      expect(service.paymentsAvailable()).toBe(false);
    });

    it('debe permitir pagos activos y mapas inactivos', () => {
      service.config.stripePublicKey = 'pk_test_123456';

      expect(service.paymentsAvailable()).toBe(true);
      expect(service.mapAvailable()).toBe(false);
    });

    it('debe permitir ambas integraciones activas', () => {
      service.config.mapsProviderUrl =
        'https://maps.ejemplo.com';
      service.config.stripePublicKey = 'pk_test_123456';

      expect(service.mapAvailable()).toBe(true);
      expect(service.paymentsAvailable()).toBe(true);
    });
  });
});
