// @vitest-environment jsdom
import '@angular/compiler';

import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('DetailComponent - nombre del anfitrion', () => {
  let component: DetailComponent;
  let item: Listing;
  let usuarios: Array<{ id: number; name: string }>;

  const alojamiento = (cambios: Record<string, unknown> = {}): Listing => ({
    id: 1,
    uuid: undefined,
    hostId: 10,
    hostUuid: undefined,
    status: 'ACTIVA',
    capacity: 4,
    price: 100000,
    title: 'Casa campestre',
    ...cambios
  } as Listing);

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } }
        },
        {
          provide: CatalogService,
          useValue: {
            getById: vi.fn().mockImplementation(() => item),
            obtenerDetalle: vi.fn().mockImplementation(() => of(item)),
            obtenerResenas: vi.fn().mockReturnValue(of({ resenas: [], promedio: 0, total: 0 })),
            reviewsFor: vi.fn().mockReturnValue([])
          }
        },
        { provide: BookingService, useValue: { quote: vi.fn(), validation: vi.fn().mockReturnValue('') } },
        { provide: DisponibilidadBackService, useValue: { consultar: vi.fn().mockReturnValue(of({ disponible: true })) } },
        {
          provide: SessionService,
          useValue: {
            currentUser: vi.fn().mockReturnValue({ id: 20, uuid: 'usuario-uuid' }),
            role: vi.fn().mockReturnValue('guest'),
            isAuthenticated: vi.fn().mockReturnValue(true),
            users: vi.fn().mockImplementation(() => usuarios)
          }
        },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
        { provide: ToastService, useValue: { show: vi.fn() } }
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
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    usuarios = [{ id: 10, name: 'Anfitrion local' }];
  });

  it('usa el nombre que viene del back cuando existe', () => {
    item = alojamiento({ hostName: 'Ana Anfitriona' });
    crearComponente();

    expect(component.hostName()).toBe('Ana Anfitriona');
  });

  it('el nombre del back tiene prioridad sobre los usuarios locales', () => {
    item = alojamiento({ hostName: 'Ana Anfitriona', hostId: 10 });
    crearComponente();

    expect(component.hostName()).not.toBe('Anfitrion local');
  });

  it('sin nombre del back, busca el anfitrion entre los usuarios locales', () => {
    item = alojamiento();
    crearComponente();

    expect(component.hostName()).toBe('Anfitrion local');
  });

  it('sin nombre del back ni usuario local, muestra Anfitrión', () => {
    item = alojamiento({ hostId: 999 });
    crearComponente();

    expect(component.hostName()).toBe('Anfitrión');
  });
});
