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

describe('DetailComponent - cotizacion estimada del back', () => {
  let component: DetailComponent;
  let quote: ReturnType<typeof vi.fn>;
  let item: Listing;
  let idRuta: string;

  const UUID = '123e4567-e89b-42d3-a456-426614174000';

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
          useValue: { snapshot: { paramMap: convertToParamMap({ id: idRuta }) } }
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
        { provide: BookingService, useValue: { quote, validation: vi.fn().mockReturnValue('') } },
        { provide: DisponibilidadBackService, useValue: { consultar: vi.fn().mockReturnValue(of({ disponible: true })) } },
        {
          provide: SessionService,
          useValue: {
            currentUser: vi.fn().mockReturnValue({ id: 20, uuid: 'usuario-uuid' }),
            role: vi.fn().mockReturnValue('guest'),
            isAuthenticated: vi.fn().mockReturnValue(true),
            users: vi.fn().mockReturnValue([{ id: 10, name: 'Anfitrion de prueba' }])
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
    quote = vi.fn().mockReturnValue({ total: 200000 });
  });

  describe('alojamiento del back (con uuid)', () => {
    beforeEach(() => {
      idRuta = UUID;
      item = alojamiento({ uuid: UUID });
    });

    it('usa la formula del back y no la del servicio de reservas simulado', () => {
      crearComponente();
      component.quoteForm.patchValue({ checkIn: '2099-03-01', checkOut: '2099-03-04' });

      const q = component.quote();

      expect(quote).not.toHaveBeenCalled();
      expect(q).toEqual({ nights: 3, base: 300000, cleaning: 25000, service: 15000, extras: 0, discount: 0, total: 340000 });
    });

    it('suma 45000 cuando se seleccionan extras', () => {
      crearComponente();
      component.quoteForm.patchValue({ checkIn: '2099-03-01', checkOut: '2099-03-04', extras: true });

      const q = component.quote();

      expect(q?.extras).toBe(45000);
      expect(q?.total).toBe(385000);
    });

    it('no aplica descuento por 7 noches o mas', () => {
      crearComponente();
      component.quoteForm.patchValue({ checkIn: '2099-03-10', checkOut: '2099-03-18' });

      const q = component.quote();

      expect(q?.discount).toBe(0);
      expect(q?.total).toBe(865000);
    });

    it('sigue rechazando una salida anterior a la entrada', () => {
      crearComponente();
      component.quoteForm.patchValue({ checkIn: '2099-03-04', checkOut: '2099-03-01' });

      expect(component.quote()).toBeNull();
    });
  });

  describe('alojamiento sin uuid', () => {
    beforeEach(() => {
      idRuta = '1';
      item = alojamiento();
    });

    it('sigue usando el servicio de reservas', () => {
      crearComponente();
      component.quoteForm.patchValue({ checkIn: '2099-03-01', checkOut: '2099-03-04' });

      const q = component.quote();

      expect(quote).toHaveBeenCalledTimes(1);
      expect(q).toEqual({ total: 200000 });
    });
  });
});
