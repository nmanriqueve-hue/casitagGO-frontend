
 // @vitest-environment jsdom

import '@angular/compiler';

import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocationMapComponent } from './location-map.component';
import { MapsService } from '../../core/services/maps.service';

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
  let previewInput: WritableSignal<any>;

  let consultarPunto: ReturnType<typeof vi.fn>;
  let consultarBack: ReturnType<typeof vi.fn>;
  let sanitizarUrl: ReturnType<typeof vi.fn>;

  const crearComponente = (
    id = 1,
    ciudad = 'Bogotá',
    uuid: string | null = null,
    preview: any = null
  ): LocationMapComponent => {
    idInput = signal(id);
    cityInput = signal(ciudad);
    uuidInput = signal<string | null>(uuid);
    previewInput = signal(preview);

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
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    consultarPunto = vi.fn().mockReturnValue({
      latitude: 4.6097,
      longitude: -74.0817
    });

    consultarBack = vi.fn().mockReturnValue(
      of({
        latitude: 6.2442,
        longitude: -75.5812
      })
    );

    sanitizarUrl = vi.fn().mockImplementation(
      (url: string) => url
    );

    TestBed.configureTestingModule({
      providers: [
        {
          provide: MapsService,
          useValue: {
            point: consultarPunto,
            ubicacionDeBack: consultarBack
          }
        },
        {
          provide: DomSanitizer,
          useValue: {
            bypassSecurityTrustResourceUrl: sanitizarUrl
          }
        }
      ]
    });

    component = crearComponente();
  });

  // CREACIÓN

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe recibir el ID de la publicación', () => {
    expect(component.listingId()).toBe(1);
  });

  it('debe recibir la ciudad', () => {
    expect(component.city()).toBe('Bogotá');
  });

  it('debe iniciar sin UUID', () => {
    expect(component.listingUuid()).toBeNull();
  });

  it('debe iniciar sin vista previa', () => {
    expect(component.preview()).toBeNull();
  });

  it('debe iniciar sin cargar', () => {
    expect(component.loading()).toBe(false);
  });

  // UBICACIÓN LOCAL

  it('debe consultar ubicación por ID y ciudad', () => {
    component.point();

    expect(consultarPunto).toHaveBeenCalledWith(
      1,
      'Bogotá'
    );
  });

  it('debe obtener la latitud correcta', () => {
    expect(component.point()?.latitude).toBe(4.6097);
  });

  it('debe obtener la longitud correcta', () => {
    expect(component.point()?.longitude).toBe(-74.0817);
  });

  it('debe devolver null cuando no hay ubicación', () => {
    consultarPunto.mockReturnValue(null);

    component = crearComponente(2, 'Sin ubicación');

    expect(component.point()).toBeNull();
  });

  it('debe consultar una ciudad diferente', () => {
    component = crearComponente(3, 'Cali');

    component.point();

    expect(consultarPunto).toHaveBeenCalledWith(
      3,
      'Cali'
    );
  });

  it('debe actualizar la consulta cuando cambia el ID', () => {
    component.point();

    idInput.set(10);

    component.point();

    expect(consultarPunto).toHaveBeenCalledWith(
      10,
      'Bogotá'
    );
  });

  it('debe actualizar la consulta cuando cambia la ciudad', () => {
    component.point();

    cityInput.set('Medellín');

    component.point();

    expect(consultarPunto).toHaveBeenCalledWith(
      1,
      'Medellín'
    );
  });

  // VISTA PREVIA

  it('debe utilizar las coordenadas de vista previa', () => {
    component = crearComponente(
      1,
      'Bogotá',
      null,
      { latitude: 3.4516, longitude: -76.532 }
    );

    expect(component.point()?.latitude).toBe(3.4516);
  });

  it('debe priorizar la vista previa', () => {
    component = crearComponente(
      1,
      'Bogotá',
      null,
      { latitude: 3.4516, longitude: -76.532 }
    );

    expect(component.point()?.longitude).toBe(-76.532);
    expect(consultarPunto).not.toHaveBeenCalled();
  });

  it('debe actualizar la vista previa', () => {
    component.point();

    previewInput.set({
      latitude: 3.4516,
      longitude: -76.532
    });

    expect(component.point()?.latitude).toBe(3.4516);
  });

  it('debe volver al mapa local al quitar la vista previa', () => {
    component = crearComponente(
      1,
      'Bogotá',
      null,
      { latitude: 3.4516, longitude: -76.532 }
    );

    component.point();

    previewInput.set(null);

    expect(component.point()?.latitude).toBe(4.6097);
  });

  // URL DEL MAPA

  it('debe generar la URL del mapa', () => {
    expect(component.url()).toBeTruthy();
  });

  it('debe usar OpenStreetMap', () => {
    component.url();

    expect(sanitizarUrl).toHaveBeenCalledWith(
      expect.stringContaining(
        'https://www.openstreetmap.org/export/embed.html'
      )
    );
  });

  it('debe incluir las coordenadas del marcador', () => {
    component.url();

    const url = sanitizarUrl.mock.calls[0][0] as string;

    expect(url).toContain(
      encodeURIComponent('4.6097,-74.0817')
    );
  });

  it('debe utilizar la capa mapnik', () => {
    component.url();

    const url = sanitizarUrl.mock.calls[0][0] as string;

    expect(url).toContain('layer=mapnik');
  });

  it('debe incluir bbox', () => {
    component.url();

    const url = sanitizarUrl.mock.calls[0][0] as string;

    expect(url).toContain('bbox=');
  });

  it('debe devolver URL nula sin coordenadas', () => {
    consultarPunto.mockReturnValue(null);

    component = crearComponente(2, 'Sin ubicación');

    expect(component.url()).toBeNull();
  });

  it('no debe sanitizar sin coordenadas', () => {
    consultarPunto.mockReturnValue(null);

    component = crearComponente(2, 'Sin ubicación');

    expect(component.url()).toBeNull();
    expect(sanitizarUrl).not.toHaveBeenCalled();
  });

  // ENLACE EXTERNO

  it('debe generar un enlace externo', () => {
    expect(component.external()).toContain(
      'https://www.openstreetmap.org/'
    );
  });

  it('debe incluir la latitud en el enlace', () => {
    expect(component.external()).toContain(
      'mlat=4.6097'
    );
  });

  it('debe incluir la longitud en el enlace', () => {
    expect(component.external()).toContain(
      'mlon=-74.0817'
    );
  });

  it('debe incluir zoom 14', () => {
    expect(component.external()).toContain(
      '#map=14/'
    );
  });

  it('debe devolver enlace vacío sin coordenadas', () => {
    consultarPunto.mockReturnValue(null);

    component = crearComponente(2, 'Sin ubicación');

    expect(component.external()).toBe('');
  });

  it('debe actualizar el enlace con una vista previa', () => {
    component.external();

    previewInput.set({
      latitude: 3.4516,
      longitude: -76.532
    });

    expect(component.external()).toContain(
      'mlat=3.4516'
    );
  });

  // CONSULTA POR UUID

  it('debe consultar el backend cuando hay UUID', () => {
    component = crearComponente(
      1,
      'Bogotá',
      'uuid-123'
    );

    expect(consultarBack).toHaveBeenCalledWith(
      'uuid-123'
    );
  });

  it('debe utilizar la ubicación del backend', () => {
    component = crearComponente(
      1,
      'Bogotá',
      'uuid-123'
    );

    expect(component.point()?.latitude).toBe(6.2442);
  });

  it('no debe consultar el mapa local si hay UUID', () => {
    component = crearComponente(
      1,
      'Bogotá',
      'uuid-123'
    );

    component.point();

    expect(consultarPunto).not.toHaveBeenCalled();
  });

  it('debe finalizar la carga al recibir datos', () => {
    component = crearComponente(
      1,
      'Bogotá',
      'uuid-123'
    );

    expect(component.loading()).toBe(false);
  });

  it('debe mantener loading mientras espera respuesta', () => {
    const respuesta = new Subject<any>();

    consultarBack.mockReturnValue(respuesta.asObservable());

    component = crearComponente(
      1,
      'Bogotá',
      'uuid-123'
    );

    expect(component.loading()).toBe(true);

    respuesta.next({
      latitude: 6.2442,
      longitude: -75.5812
    });

    expect(component.loading()).toBe(false);
  });

  it('debe actualizar el punto cuando llega respuesta', () => {
    const respuesta = new Subject<any>();

    consultarBack.mockReturnValue(respuesta.asObservable());

    component = crearComponente(
      1,
      'Bogotá',
      'uuid-123'
    );

    expect(component.point()).toBeNull();

    respuesta.next({
      latitude: 3.4516,
      longitude: -76.532
    });

    expect(component.point()?.latitude).toBe(3.4516);
  });

  it('debe aceptar ubicación nula del backend', () => {
    consultarBack.mockReturnValue(of(null));

    component = crearComponente(
      1,
      'Bogotá',
      'uuid-123'
    );

    expect(component.point()).toBeNull();
    expect(component.loading()).toBe(false);
  });

  it('no debe consultar backend sin UUID', () => {
    expect(consultarBack).not.toHaveBeenCalled();
  });

  it('debe consultar nuevamente cuando cambia UUID', () => {
    component = crearComponente(
      1,
      'Bogotá',
      'uuid-123'
    );

    uuidInput.set('uuid-456');

    TestBed.tick();

    expect(consultarBack).toHaveBeenCalledWith(
      'uuid-456'
    );
  });

  it('debe priorizar la vista previa sobre el UUID', () => {
    component = crearComponente(
      1,
      'Bogotá',
      'uuid-123',
      { latitude: 3.4516, longitude: -76.532 }
    );

    expect(component.point()?.latitude).toBe(3.4516);
  });
});
