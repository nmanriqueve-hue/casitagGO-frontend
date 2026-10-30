
// @vitest-environment jsdom
import '@angular/compiler';

import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeComponent } from './home.component';
import { CatalogService } from '../../core/services/catalog.service';
import { Listing } from '../../core/models/marketplace.models';
import { addDays } from '../../core/models/date-rules';

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

describe('HomeComponent', () => {
  let component: HomeComponent;
  let buscarEnBack: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  const alojamiento = (
    id: number,
    cambios: Record<string, unknown> = {}
  ): Listing => ({
    id,
    title: `Alojamiento ${id}`,
    city: 'Bogotá',
    status: 'ACTIVA',
    capacity: 4,
    ...cambios
  } as Listing);

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CatalogService,
          useValue: { buscarEnBack }
        },
        {
          provide: Router,
          useValue: { navigate }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new HomeComponent(TestBed.inject(Router))
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    buscarEnBack = vi.fn().mockReturnValue(of([]));
    navigate = vi.fn().mockResolvedValue(true);
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe iniciar sin errores de fecha', () => {
      crearComponente();

      expect(component.dateError).toBe('');
    });

    it('debe establecer mañana como el día siguiente', () => {
      crearComponente();

      expect(component.tomorrow).toBe(
        addDays(component.today, 1)
      );
    });

    it('debe iniciar con ciudad vacía', () => {
      crearComponente();

      expect(component.searchForm.get('city')?.value).toBe('');
    });

    it('debe iniciar sin fecha de llegada', () => {
      crearComponente();

      expect(component.searchForm.get('checkIn')?.value).toBe('');
    });

    it('debe iniciar sin fecha de salida', () => {
      crearComponente();

      expect(component.searchForm.get('checkOut')?.value).toBe('');
    });

    it('debe iniciar con dos huéspedes', () => {
      crearComponente();

      expect(component.searchForm.get('guests')?.value).toBe(2);
    });

    it('debe consultar alojamientos al inicializar', () => {
      crearComponente();

      expect(buscarEnBack).toHaveBeenCalledWith({});
    });

    it('debe consultar el catálogo una sola vez al crear el componente', () => {
      crearComponente();

      expect(buscarEnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Alojamientos destacados', () => {
    it('debe iniciar sin destacados cuando el catálogo está vacío', () => {
      crearComponente();

      expect(component.featured()).toEqual([]);
    });

    it('debe mostrar un alojamiento destacado', () => {
      buscarEnBack.mockReturnValue(
        of([alojamiento(1)])
      );

      crearComponente();

      expect(component.featured()).toHaveLength(1);
    });

    it('debe mostrar dos alojamientos destacados', () => {
      buscarEnBack.mockReturnValue(
        of([alojamiento(1), alojamiento(2)])
      );

      crearComponente();

      expect(component.featured()).toHaveLength(2);
    });

    it('debe mostrar máximo tres alojamientos destacados', () => {
      buscarEnBack.mockReturnValue(
        of([
          alojamiento(1),
          alojamiento(2),
          alojamiento(3),
          alojamiento(4),
          alojamiento(5)
        ])
      );

      crearComponente();

      expect(component.featured()).toHaveLength(3);
    });

    it('debe conservar los primeros tres alojamientos', () => {
      buscarEnBack.mockReturnValue(
        of([
          alojamiento(10),
          alojamiento(20),
          alojamiento(30),
          alojamiento(40)
        ])
      );

      crearComponente();

      expect(component.featured().map(item => item.id)).toEqual([
        10, 20, 30
      ]);
    });

    it('debe conservar los datos de los alojamientos', () => {
      buscarEnBack.mockReturnValue(
        of([alojamiento(1, { title: 'Casa campestre' })])
      );

      crearComponente();

      expect(component.featured()[0].title).toBe('Casa campestre');
    });

    it('debe limpiar los destacados cuando falla la consulta', () => {
      buscarEnBack.mockReturnValue(
        throwError(() => new Error('Error del servidor'))
      );

      crearComponente();

      expect(component.featured()).toEqual([]);
    });

    it('debe esperar la respuesta del backend', () => {
      const pendiente = new Subject<Listing[]>();
      buscarEnBack.mockReturnValue(pendiente.asObservable());

      crearComponente();

      expect(component.featured()).toEqual([]);

      pendiente.next([alojamiento(1)]);
      pendiente.complete();

      expect(component.featured()).toHaveLength(1);
    });
  });

  describe('Búsqueda de alojamientos', () => {
    it('debe navegar a la página de búsqueda', () => {
      crearComponente();

      component.search();

      expect(navigate).toHaveBeenCalledWith(
        ['/buscar'],
        {
          queryParams: component.searchForm.getRawValue()
        }
      );
    });

    it('debe enviar la ciudad seleccionada', () => {
      crearComponente();

      component.searchForm.patchValue({ city: 'Medellín' });
      component.search();

      expect(navigate).toHaveBeenCalledWith(
        ['/buscar'],
        {
          queryParams: expect.objectContaining({
            city: 'Medellín'
          })
        }
      );
    });

    it('debe enviar el número de huéspedes', () => {
      crearComponente();

      component.searchForm.patchValue({ guests: 4 });
      component.search();

      expect(navigate).toHaveBeenCalledWith(
        ['/buscar'],
        {
          queryParams: expect.objectContaining({
            guests: 4
          })
        }
      );
    });

    it('debe enviar las fechas seleccionadas', () => {
      crearComponente();

      component.searchForm.patchValue({
        checkIn: '2027-01-10',
        checkOut: '2027-01-15'
      });

      component.search();

      expect(navigate).toHaveBeenCalledWith(
        ['/buscar'],
        {
          queryParams: expect.objectContaining({
            checkIn: '2027-01-10',
            checkOut: '2027-01-15'
          })
        }
      );
    });

    it('debe permitir buscar sin fechas', () => {
      crearComponente();

      component.search();

      expect(component.dateError).toBe('');
      expect(navigate).toHaveBeenCalled();
    });

    it('debe marcar los campos como tocados al buscar', () => {
      crearComponente();

      component.search();

      expect(component.searchForm.get('city')?.touched).toBe(true);
      expect(component.searchForm.get('checkIn')?.touched).toBe(true);
      expect(component.searchForm.get('checkOut')?.touched).toBe(true);
      expect(component.searchForm.get('guests')?.touched).toBe(true);
    });
  });

  describe('Validación de huéspedes', () => {
    it('debe rechazar cero huéspedes', () => {
      crearComponente();

      component.searchForm.patchValue({ guests: 0 });
      component.search();

      expect(component.dateError).toBe(
        'Selecciona al menos un huésped.'
      );
      expect(navigate).not.toHaveBeenCalled();
    });

    it('debe rechazar huéspedes negativos', () => {
      crearComponente();

      component.searchForm.patchValue({ guests: -2 });
      component.search();

      expect(component.dateError).toBe(
        'Selecciona al menos un huésped.'
      );
      expect(navigate).not.toHaveBeenCalled();
    });

    it('debe rechazar huéspedes decimales', () => {
      crearComponente();

      component.searchForm.patchValue({ guests: 1.5 });
      component.search();

      expect(component.dateError).toBe(
        'Selecciona al menos un huésped.'
      );
      expect(navigate).not.toHaveBeenCalled();
    });

    it('debe permitir un huésped', () => {
      crearComponente();

      component.searchForm.patchValue({ guests: 1 });
      component.search();

      expect(component.dateError).toBe('');
      expect(navigate).toHaveBeenCalled();
    });
  });

  describe('Validación de fechas', () => {
    it('debe rechazar únicamente fecha de llegada', () => {
      crearComponente();

      component.searchForm.patchValue({
        checkIn: '2027-01-10',
        checkOut: ''
      });

      component.search();

      expect(component.dateError).not.toBe('');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('debe rechazar únicamente fecha de salida', () => {
      crearComponente();

      component.searchForm.patchValue({
        checkIn: '',
        checkOut: '2027-01-15'
      });

      component.search();

      expect(component.dateError).not.toBe('');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('debe rechazar salida anterior a llegada', () => {
      crearComponente();

      component.searchForm.patchValue({
        checkIn: '2027-01-15',
        checkOut: '2027-01-10'
      });

      component.search();

      expect(component.dateError).not.toBe('');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('debe rechazar fechas iguales', () => {
      crearComponente();

      component.searchForm.patchValue({
        checkIn: '2027-01-10',
        checkOut: '2027-01-10'
      });

      component.search();

      expect(component.dateError).not.toBe('');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('debe permitir un rango de fechas válido', () => {
      crearComponente();

      component.searchForm.patchValue({
        checkIn: '2027-01-10',
        checkOut: '2027-01-15'
      });

      component.search();

      expect(component.dateError).toBe('');
      expect(navigate).toHaveBeenCalled();
    });
  });
});
