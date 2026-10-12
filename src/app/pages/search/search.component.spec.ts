
 // @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchComponent } from './search.component';
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

describe('SearchComponent', () => {
  let component: SearchComponent;
  let buscarEnBack: ReturnType<typeof vi.fn>;

  let parametros: Record<string, string>;

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

  const crearError = (
    status: number,
    error: unknown = null
  ) => new HttpErrorResponse({ status, error });

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CatalogService,
          useValue: { buscarEnBack }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(parametros)
            }
          }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new SearchComponent()
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();

    parametros = {};
    buscarEnBack = vi.fn().mockReturnValue(of([]));
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();
      expect(component).toBeTruthy();
    });

    it('debe iniciar sin errores de fecha', () => {
      crearComponente();
      expect(component.dateError()).toBe('');
    });

    it('debe iniciar sin errores de búsqueda', () => {
      crearComponente();
      expect(component.searchError()).toBe('');
    });

    it('debe iniciar sin carga pendiente', () => {
      crearComponente();
      expect(component.cargando()).toBe(false);
    });

    it('debe iniciar sin resultados', () => {
      crearComponente();
      expect(component.results()).toEqual([]);
    });

    it('debe establecer mañana como el día siguiente', () => {
      crearComponente();
      expect(component.tomorrow).toBe(
        addDays(component.today, 1)
      );
    });

    it('debe iniciar con un huésped', () => {
      crearComponente();
      expect(component.form.get('guests')?.value).toBe(1);
    });

    it('debe iniciar con precio mínimo cero', () => {
      crearComponente();
      expect(component.form.get('minPrice')?.value).toBe(0);
    });

    it('debe iniciar con precio máximo de 800000', () => {
      crearComponente();
      expect(component.form.get('maxPrice')?.value).toBe(800000);
    });

    it('debe iniciar sin servicios seleccionados', () => {
      crearComponente();
      expect(component.selectedAmenities()).toEqual([]);
    });

    it('debe iniciar con filtros móviles cerrados', () => {
      crearComponente();
      expect(component.mobileFilters()).toBe(false);
    });

    it('debe ejecutar una búsqueda al inicializar', () => {
      crearComponente();
      expect(buscarEnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Parámetros de la URL', () => {
    it('debe recuperar la ciudad de la URL', () => {
      parametros = { city: 'Medellín' };
      crearComponente();
      expect(component.form.get('city')?.value).toBe('Medellín');
    });

    it('debe recuperar la fecha de llegada', () => {
      parametros = { checkIn: '2027-01-10' };
      crearComponente();
      expect(component.form.get('checkIn')?.value).toBe('2027-01-10');
    });

    it('debe recuperar la fecha de salida', () => {
      parametros = { checkOut: '2027-01-15' };
      crearComponente();
      expect(component.form.get('checkOut')?.value).toBe('2027-01-15');
    });

    it('debe recuperar el número de huéspedes', () => {
      parametros = { guests: '4' };
      crearComponente();
      expect(component.form.get('guests')?.value).toBe(4);
    });

    it('debe usar un huésped cuando el parámetro es cero', () => {
      parametros = { guests: '0' };
      crearComponente();
      expect(component.form.get('guests')?.value).toBe(1);
    });

    it('debe usar un huésped cuando el parámetro no es numérico', () => {
      parametros = { guests: 'abc' };
      crearComponente();
      expect(component.form.get('guests')?.value).toBe(1);
    });

    it('debe enviar los parámetros iniciales al backend', () => {
      parametros = {
        city: 'Cali',
        guests: '3'
      };

      crearComponente();

      expect(buscarEnBack).toHaveBeenCalledWith(
        expect.objectContaining({
          city: 'Cali',
          guests: 3
        })
      );
    });
  });

  describe('Búsqueda de alojamientos', () => {
    it('debe guardar los resultados recibidos', () => {
      buscarEnBack.mockReturnValue(
        of([alojamiento(1), alojamiento(2)])
      );

      crearComponente();
      expect(component.results()).toHaveLength(2);
    });

    it('debe conservar los datos de los alojamientos', () => {
      buscarEnBack.mockReturnValue(
        of([alojamiento(1, { title: 'Casa familiar' })])
      );

      crearComponente();
      expect(component.results()[0].title).toBe('Casa familiar');
    });

    it('debe permitir resultados vacíos', () => {
      buscarEnBack.mockReturnValue(of([]));
      crearComponente();
      expect(component.results()).toEqual([]);
    });

    it('debe enviar la ciudad al backend', () => {
      crearComponente();

      component.form.patchValue(
        { city: 'Cartagena' },
        { emitEvent: false }
      );
      component.apply();

      expect(buscarEnBack).toHaveBeenLastCalledWith(
        expect.objectContaining({
          city: 'Cartagena'
        })
      );
    });

    it('debe enviar el tipo de alojamiento', () => {
      crearComponente();

      component.form.patchValue(
        { type: 'CASA' },
        { emitEvent: false }
      );
      component.apply();

      expect(buscarEnBack).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: 'CASA'
        })
      );
    });

    it('debe enviar el número de huéspedes', () => {
      crearComponente();

      component.form.patchValue(
        { guests: 5 },
        { emitEvent: false }
      );
      component.apply();

      expect(buscarEnBack).toHaveBeenLastCalledWith(
        expect.objectContaining({
          guests: 5
        })
      );
    });

    it('debe enviar el rango de precios', () => {
      crearComponente();

      component.form.patchValue(
        {
          minPrice: 100000,
          maxPrice: 500000
        },
        { emitEvent: false }
      );
      component.apply();

      expect(buscarEnBack).toHaveBeenLastCalledWith(
        expect.objectContaining({
          minPrice: 100000,
          maxPrice: 500000
        })
      );
    });

    it('debe limpiar el error al iniciar otra búsqueda válida', () => {
      crearComponente();

      component.searchError.set('Error anterior');
      component.apply();

      expect(component.searchError()).toBe('');
    });

    it('debe activar el indicador de carga durante la consulta', () => {
      const pendiente = new Subject<Listing[]>();
      buscarEnBack.mockReturnValue(pendiente.asObservable());

      crearComponente();

      expect(component.cargando()).toBe(true);

      pendiente.next([]);
      pendiente.complete();

      expect(component.cargando()).toBe(false);
    });

    it('debe actualizar los resultados al recibir la respuesta', () => {
      const pendiente = new Subject<Listing[]>();
      buscarEnBack.mockReturnValue(pendiente.asObservable());

      crearComponente();

      pendiente.next([alojamiento(8)]);
      pendiente.complete();

      expect(component.results()[0].id).toBe(8);
    });
  });

  describe('Validación de huéspedes', () => {
    it('debe rechazar cero huéspedes', () => {
      crearComponente();

      component.form.patchValue(
        { guests: 0 },
        { emitEvent: false }
      );
      component.apply();

      expect(component.dateError()).toBe(
        'Selecciona al menos un huésped.'
      );
    });

    it('debe rechazar huéspedes negativos', () => {
      crearComponente();

      component.form.patchValue(
        { guests: -2 },
        { emitEvent: false }
      );
      component.apply();

      expect(component.dateError()).toBe(
        'Selecciona al menos un huésped.'
      );
    });

    it('debe rechazar huéspedes decimales', () => {
      crearComponente();

      component.form.patchValue(
        { guests: 1.5 },
        { emitEvent: false }
      );
      component.apply();

      expect(component.dateError()).toBe(
        'Selecciona al menos un huésped.'
      );
    });

    it('no debe consultar el backend con huéspedes inválidos', () => {
      crearComponente();
      buscarEnBack.mockClear();

      component.form.patchValue(
        { guests: 0 },
        { emitEvent: false }
      );
      component.apply();

      expect(buscarEnBack).not.toHaveBeenCalled();
    });

    it('debe permitir un huésped', () => {
      crearComponente();

      component.form.patchValue(
        { guests: 1 },
        { emitEvent: false }
      );
      component.apply();

      expect(component.dateError()).toBe('');
    });
  });

  describe('Validación de precios', () => {
    it('debe rechazar precios mínimos negativos', () => {
      crearComponente();

      component.form.patchValue(
        { minPrice: -100 },
        { emitEvent: false }
      );
      component.apply();

      expect(component.dateError()).toBe(
        'Revisa el rango de precios.'
      );
    });

    it('debe rechazar máximo menor que mínimo', () => {
      crearComponente();

      component.form.patchValue(
        {
          minPrice: 500000,
          maxPrice: 100000
        },
        { emitEvent: false }
      );
      component.apply();

      expect(component.dateError()).toBe(
        'Revisa el rango de precios.'
      );
    });

    it('debe permitir precios iguales', () => {
      crearComponente();

      component.form.patchValue(
        {
          minPrice: 200000,
          maxPrice: 200000
        },
        { emitEvent: false }
      );
      component.apply();

      expect(component.dateError()).toBe('');
    });

    it('no debe buscar con precios inválidos', () => {
      crearComponente();
      buscarEnBack.mockClear();

      component.form.patchValue(
        {
          minPrice: 900000,
          maxPrice: 100000
        },
        { emitEvent: false }
      );
      component.apply();

      expect(buscarEnBack).not.toHaveBeenCalled();
    });
  });

  describe('Validación de fechas', () => {
    it('debe permitir ambas fechas vacías', () => {
      crearComponente();
      component.apply();

      expect(component.dateError()).toBe('');
    });

    it('debe rechazar únicamente fecha de llegada', () => {
      crearComponente();

      component.form.patchValue(
        {
          checkIn: '2027-01-10',
          checkOut: ''
        },
        { emitEvent: false }
      );
      component.apply();

      expect(component.dateError()).toBe(
        'Selecciona la fecha de llegada y la fecha de salida.'
      );
    });

    it('debe rechazar únicamente fecha de salida', () => {
      crearComponente();

      component.form.patchValue(
        {
          checkIn: '',
          checkOut: '2027-01-15'
        },
        { emitEvent: false }
      );
      component.apply();

      expect(component.dateError()).toBe(
        'Selecciona la fecha de llegada y la fecha de salida.'
      );
    });

    it('debe rechazar salida anterior a llegada', () => {
      crearComponente();

      component.form.patchValue(
        {
          checkIn: '2027-01-15',
          checkOut: '2027-01-10'
        },
        { emitEvent: false }
      );
      component.apply();

      expect(component.dateError()).not.toBe('');
    });

    it('no debe buscar cuando falta una fecha', () => {
      crearComponente();
      buscarEnBack.mockClear();

      component.form.patchValue(
        {
          checkIn: '2027-01-10',
          checkOut: ''
        },
        { emitEvent: false }
      );
      component.apply();

      expect(buscarEnBack).not.toHaveBeenCalled();
    });

    it('debe enviar fechas válidas al backend', () => {
      crearComponente();

      component.form.patchValue(
        {
          checkIn: '2027-01-10',
          checkOut: '2027-01-15'
        },
        { emitEvent: false }
      );
      component.apply();

      expect(buscarEnBack).toHaveBeenLastCalledWith(
        expect.objectContaining({
          checkIn: '2027-01-10',
          checkOut: '2027-01-15'
        })
      );
    });
  });

  describe('Servicios adicionales', () => {
    it('debe seleccionar Wi-Fi', () => {
      crearComponente();

      component.toggleAmenity('Wi-Fi');

      expect(component.selectedAmenities()).toContain('Wi-Fi');
    });

    it('debe seleccionar varios servicios', () => {
      crearComponente();

      component.toggleAmenity('Wi-Fi');
      component.toggleAmenity('Piscina');

      expect(component.selectedAmenities()).toEqual([
        'Wi-Fi',
        'Piscina'
      ]);
    });

    it('debe quitar un servicio seleccionado', () => {
      crearComponente();

      component.toggleAmenity('Wi-Fi');
      component.toggleAmenity('Wi-Fi');

      expect(component.selectedAmenities()).toEqual([]);
    });

    it('no debe duplicar servicios seleccionados', () => {
      crearComponente();

      component.toggleAmenity('Cocina');
      component.toggleAmenity('Cocina');
      component.toggleAmenity('Cocina');

      expect(component.selectedAmenities()).toEqual(['Cocina']);
    });

    it('debe enviar los servicios al backend', () => {
      crearComponente();

      component.toggleAmenity('Parqueadero');

      expect(buscarEnBack).toHaveBeenLastCalledWith(
        expect.objectContaining({
          amenities: ['Parqueadero']
        })
      );
    });

    it('debe tener cinco opciones de servicios', () => {
      crearComponente();
      expect(component.amenityOptions).toHaveLength(5);
    });

    it('debe tener cinco opciones de alojamiento', () => {
      crearComponente();
      expect(component.tipoOptions).toHaveLength(5);
    });
  });

  describe('Limpiar filtros', () => {
    it('debe limpiar la ciudad', () => {
      crearComponente();

      component.form.patchValue(
        { city: 'Bogotá' },
        { emitEvent: false }
      );
      component.clearFilters();

      expect(component.form.get('city')?.value).toBe('');
    });

    it('debe restablecer un huésped', () => {
      crearComponente();

      component.form.patchValue(
        { guests: 5 },
        { emitEvent: false }
      );
      component.clearFilters();

      expect(component.form.get('guests')?.value).toBe(1);
    });

    it('debe restablecer el rango de precios', () => {
      crearComponente();

      component.form.patchValue(
        {
          minPrice: 200000,
          maxPrice: 400000
        },
        { emitEvent: false }
      );
      component.clearFilters();

      expect(component.form.get('minPrice')?.value).toBe(0);
      expect(component.form.get('maxPrice')?.value).toBe(800000);
    });

    it('debe limpiar los servicios seleccionados', () => {
      crearComponente();

      component.toggleAmenity('Wi-Fi');
      component.toggleAmenity('Piscina');
      component.clearFilters();

      expect(component.selectedAmenities()).toEqual([]);
    });

    it('debe limpiar las fechas', () => {
      crearComponente();

      component.form.patchValue(
        {
          checkIn: '2027-01-10',
          checkOut: '2027-01-15'
        },
        { emitEvent: false }
      );
      component.clearFilters();

      expect(component.form.get('checkIn')?.value).toBe('');
      expect(component.form.get('checkOut')?.value).toBe('');
    });
  });

  describe('Errores del backend', () => {
    it('debe mostrar error de conexión', () => {
      buscarEnBack.mockReturnValue(
        throwError(() => crearError(0))
      );
      crearComponente();

      expect(component.searchError()).toContain(
        'No se pudo conectar con el servidor'
      );
    });

    it('debe mostrar el mensaje del backend para error 400', () => {
      buscarEnBack.mockReturnValue(
        throwError(() => crearError(400, 'Filtros incorrectos'))
      );
      crearComponente();

      expect(component.searchError()).toBe('Filtros incorrectos');
    });

    it('debe mostrar error de sesión para estado 401', () => {
      buscarEnBack.mockReturnValue(
        throwError(() => crearError(401))
      );
      crearComponente();

      expect(component.searchError()).toContain('Tu sesión venció');
    });

    it('debe mostrar error de sesión para estado 403', () => {
      buscarEnBack.mockReturnValue(
        throwError(() => crearError(403))
      );
      crearComponente();

      expect(component.searchError()).toContain('Tu sesión venció');
    });

    it('debe mostrar error general para estado 500', () => {
      buscarEnBack.mockReturnValue(
        throwError(() => crearError(500))
      );
      crearComponente();

      expect(component.searchError()).toContain(
        'No se pudo cargar la búsqueda'
      );
    });

    it('debe limpiar los resultados cuando falla una búsqueda', () => {
      crearComponente();
      component.results.set([alojamiento(1)]);

      buscarEnBack.mockReturnValue(
        throwError(() => crearError(500))
      );
      component.apply();

      expect(component.results()).toEqual([]);
    });

    it('debe detener la carga cuando ocurre un error', () => {
      buscarEnBack.mockReturnValue(
        throwError(() => crearError(500))
      );
      crearComponente();

      expect(component.cargando()).toBe(false);
    });
  });

  describe('Respuestas de búsquedas anteriores', () => {
    it('debe ignorar resultados de una búsqueda anterior', () => {
      const primera = new Subject<Listing[]>();
      const segunda = new Subject<Listing[]>();

      buscarEnBack
        .mockReturnValueOnce(primera.asObservable())
        .mockReturnValueOnce(segunda.asObservable());

      crearComponente();
      component.apply();

      segunda.next([alojamiento(2)]);
      primera.next([alojamiento(1)]);

      expect(component.results().map(item => item.id)).toEqual([2]);

      primera.complete();
      segunda.complete();
    });

    it('debe ignorar errores de una búsqueda anterior', () => {
      const primera = new Subject<Listing[]>();
      const segunda = new Subject<Listing[]>();

      buscarEnBack
        .mockReturnValueOnce(primera.asObservable())
        .mockReturnValueOnce(segunda.asObservable());

      crearComponente();
      component.apply();

      segunda.next([alojamiento(2)]);
      primera.error(crearError(500));

      expect(component.results().map(item => item.id)).toEqual([2]);
      expect(component.searchError()).toBe('');

      segunda.complete();
    });
  });
});
