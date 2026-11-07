// @vitest-environment jsdom
import '@angular/compiler';

import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DetailComponent } from './detail.component';
import { CatalogService } from '../../core/services/catalog.service';
import { BookingService } from '../../core/services/booking.service';
import { DisponibilidadBackService } from '../../core/services/disponibilidad-back.service';
import { SessionService } from '../../core/services/session.service';
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

describe('DetailComponent - compartir publicacion', () => {
  let component: DetailComponent;
  let mostrarAviso: ReturnType<typeof vi.fn>;

  const UUID = '123e4567-e89b-42d3-a456-426614174000';

  const alojamiento = {
    id: 1,
    uuid: UUID,
    hostId: 10,
    hostUuid: 'anfitrion-uuid',
    status: 'ACTIVA',
    capacity: 4,
    price: 100000,
    title: 'Casa campestre'
  } as Listing;

  const definirNavegador = (propiedad: 'share' | 'clipboard', valor: unknown) => {
    Object.defineProperty(navigator, propiedad, { value: valor, configurable: true, writable: true });
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    mostrarAviso = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: UUID }) } }
        },
        {
          provide: CatalogService,
          useValue: {
            getById: vi.fn().mockImplementation(() => alojamiento),
            obtenerDetalle: vi.fn().mockImplementation(() => of(alojamiento)),
            obtenerResenas: vi.fn().mockReturnValue(of({ resenas: [], promedio: 0, total: 0 })),
            reviewsFor: vi.fn().mockReturnValue([])
          }
        },
        { provide: BookingService, useValue: { quote: vi.fn(), validation: vi.fn().mockReturnValue('') } },
        { provide: DisponibilidadBackService, useValue: { consultar: vi.fn().mockReturnValue(of({ disponible: true })) } },
        {
          provide: SessionService,
          useValue: {
            currentUser: vi.fn().mockReturnValue(null),
            role: vi.fn().mockReturnValue(null),
            isAuthenticated: vi.fn().mockReturnValue(false),
            users: vi.fn().mockReturnValue([])
          }
        },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
        { provide: ToastService, useValue: { show: mostrarAviso } }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new DetailComponent(
        TestBed.inject(ActivatedRoute),
        TestBed.inject(CatalogService),
        TestBed.inject(BookingService),
        TestBed.inject(SessionService),
        TestBed.inject(Router),
        TestBed.inject(ToastService)
      )
    );
    component.listing.set(alojamiento);
  });

  afterEach(() => {
    definirNavegador('share', undefined);
    definirNavegador('clipboard', undefined);
  });

  it('no hace nada si todavia no hay alojamiento cargado', async () => {
    const compartirNativo = vi.fn();
    definirNavegador('share', compartirNativo);
    component.listing.set(undefined);

    await component.compartir();

    expect(compartirNativo).not.toHaveBeenCalled();
    expect(mostrarAviso).not.toHaveBeenCalled();
  });

  it('usa el panel de compartir del navegador cuando existe', async () => {
    const compartirNativo = vi.fn().mockResolvedValue(undefined);
    definirNavegador('share', compartirNativo);

    await component.compartir();

    expect(compartirNativo).toHaveBeenCalledWith({ title: 'Casa campestre', url: window.location.href });
    expect(mostrarAviso).not.toHaveBeenCalled();
  });

  it('no muestra error si la persona cierra el panel de compartir', async () => {
    const compartirNativo = vi.fn().mockRejectedValue(new Error('AbortError'));
    definirNavegador('share', compartirNativo);

    await component.compartir();

    expect(compartirNativo).toHaveBeenCalledTimes(1);
    expect(mostrarAviso).not.toHaveBeenCalled();
  });

  it('copia el enlace cuando el navegador no tiene panel de compartir', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    definirNavegador('clipboard', { writeText: escribir });

    await component.compartir();

    expect(escribir).toHaveBeenCalledWith(window.location.href);
    expect(mostrarAviso).toHaveBeenCalledWith(expect.stringContaining('Enlace copiado'));
  });

  it('avisa con una advertencia si no se puede copiar el enlace', async () => {
    const escribir = vi.fn().mockRejectedValue(new Error('denegado'));
    definirNavegador('clipboard', { writeText: escribir });

    await component.compartir();

    expect(mostrarAviso).toHaveBeenCalledWith(expect.stringContaining('No se pudo copiar'), 'warning');
  });

  it('avisa con una advertencia si el navegador no tiene portapapeles', async () => {
    await component.compartir();

    expect(mostrarAviso).toHaveBeenCalledWith(expect.stringContaining('No se pudo copiar'), 'warning');
  });
});
