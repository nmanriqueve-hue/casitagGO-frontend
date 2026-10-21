// @vitest-environment jsdom
import '@angular/compiler';

import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ListingFormComponent } from './listing-form.component';
import { PublicacionesBackService } from '../../core/services/publicaciones-back.service';
import { ToastService } from '../../core/services/toast.service';

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

describe('ListingFormComponent - punto exacto', () => {
  let component: ListingFormComponent;
  let mias: ReturnType<typeof vi.fn>;
  let crear: ReturnType<typeof vi.fn>;
  let editar: ReturnType<typeof vi.fn>;
  let editingId: string | null;
  let publicacion: any;

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(editingId ? { id: editingId } : {})
            }
          }
        },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
        {
          provide: PublicacionesBackService,
          useValue: {
            mias,
            crear,
            editar,
            subirImagen: vi.fn().mockReturnValue(of({})),
            activar: vi.fn().mockReturnValue(of({}))
          }
        },
        { provide: ToastService, useValue: { show: vi.fn() } }
      ]
    });
    component = TestBed.runInInjectionContext(() => new ListingFormComponent());
  };

  const llenarFormulario = () => {
    component.form.patchValue({
      title: 'Apartamento moderno en Bogota',
      description: 'Apartamento comodo y amplio, cerca del transporte publico.',
      city: 'Bogota',
      address: 'Calle 100 numero 15',
      type: 'APARTAMENTO',
      capacity: 4,
      price: 250000,
      rules: 'No fumar\nNo fiestas'
    });
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    editingId = null;
    publicacion = {
      id: 'publicacion-001',
      titulo: 'Apartamento moderno en Bogota',
      descripcion: 'Apartamento comodo y amplio, cerca del transporte publico.',
      ciudad: 'Bogota',
      ubicacionTextual: 'Calle 100 numero 15',
      tipo: 'APARTAMENTO',
      capacidad: 4,
      precioNoche: 250000,
      reglas: ['No fumar', 'No fiestas'],
      servicios: ['Wi-Fi', 'Cocina'],
      imagenes: ['https://ejemplo.com/foto.jpg']
    };
    mias = vi.fn().mockReturnValue(of([publicacion]));
    crear = vi.fn().mockReturnValue(of({ id: 'publicacion-nueva' }));
    editar = vi.fn().mockReturnValue(of({ id: 'publicacion-001' }));
  });

  describe('al crear', () => {
    it('empieza sin punto y sin punto original', () => {
      crearComponente();

      expect(component.punto()).toBeNull();
      expect(component.hayPuntoOriginal()).toBe(false);
    });

    it('envia latitud y longitud del punto elegido', () => {
      crearComponente();
      llenarFormulario();
      component.punto.set({ latitude: 4.6812, longitude: -74.045, label: 'Punto' });

      component.save(false);

      expect(crear).toHaveBeenCalledTimes(1);
      const datos = crear.mock.calls[0][0];
      expect(datos.latitud).toBe(4.6812);
      expect(datos.longitud).toBe(-74.045);
    });

    it('envia latitud y longitud nulas si no hay punto', () => {
      crearComponente();
      llenarFormulario();

      component.save(false);

      const datos = crear.mock.calls[0][0];
      expect(datos.latitud).toBeNull();
      expect(datos.longitud).toBeNull();
    });
  });

  describe('al editar', () => {
    beforeEach(() => {
      editingId = 'publicacion-001';
    });

    it('carga el punto guardado y marca que ya existia', () => {
      publicacion.latitud = 4.6812;
      publicacion.longitud = -74.045;

      crearComponente();

      expect(component.punto()).toEqual({
        latitude: 4.6812,
        longitude: -74.045,
        label: 'Punto guardado'
      });
      expect(component.hayPuntoOriginal()).toBe(true);
    });

    it('no marca punto original si la publicacion no tiene coordenadas', () => {
      crearComponente();

      expect(component.punto()).toBeNull();
      expect(component.hayPuntoOriginal()).toBe(false);
    });

    it('no marca punto original si las coordenadas vienen nulas', () => {
      publicacion.latitud = null;
      publicacion.longitud = null;

      crearComponente();

      expect(component.punto()).toBeNull();
      expect(component.hayPuntoOriginal()).toBe(false);
    });

    it('reenvia el punto guardado al guardar sin tocarlo', () => {
      publicacion.latitud = 4.6812;
      publicacion.longitud = -74.045;
      crearComponente();

      component.save(false);

      expect(editar).toHaveBeenCalledTimes(1);
      const datos = editar.mock.calls[0][1];
      expect(datos.latitud).toBe(4.6812);
      expect(datos.longitud).toBe(-74.045);
    });

    it('envia el punto nuevo cuando se reemplaza el guardado', () => {
      publicacion.latitud = 4.6812;
      publicacion.longitud = -74.045;
      crearComponente();
      component.punto.set({ latitude: 4.7, longitude: -74.1, label: 'Nuevo' });

      component.save(false);

      const datos = editar.mock.calls[0][1];
      expect(datos.latitud).toBe(4.7);
      expect(datos.longitud).toBe(-74.1);
    });

    it('envia coordenadas nulas si no hay punto al editar', () => {
      crearComponente();

      component.save(false);

      const datos = editar.mock.calls[0][1];
      expect(datos.latitud).toBeNull();
      expect(datos.longitud).toBeNull();
    });
  });
});
