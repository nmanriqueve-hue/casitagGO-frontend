
// @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
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

describe('ListingFormComponent', () => {
  let component: ListingFormComponent;

  let mias: ReturnType<typeof vi.fn>;
  let crear: ReturnType<typeof vi.fn>;
  let editar: ReturnType<typeof vi.fn>;
  let subirImagen: ReturnType<typeof vi.fn>;
  let activar: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let showToast: ReturnType<typeof vi.fn>;

  let editingId: string | null;
  let publicacion: any;

  const errorHttp = (status: number, error: unknown = null) =>
    new HttpErrorResponse({ status, error });

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(
                editingId ? { id: editingId } : {}
              )
            }
          }
        },
        {
          provide: Router,
          useValue: { navigate }
        },
        {
          provide: PublicacionesBackService,
          useValue: { mias, crear, editar, subirImagen, activar }
        },
        {
          provide: ToastService,
          useValue: { show: showToast }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new ListingFormComponent()
    );
  };

  const llenarFormulario = () => {
    component.form.patchValue({
      title: 'Apartamento moderno en Bogotá',
      description: 'Apartamento cómodo y amplio, cerca del transporte público.',
      city: 'Bogotá',
      address: 'Calle 100 número 15',
      type: 'APARTAMENTO',
      capacity: 4,
      price: 250000,
      rules: 'No fumar\nNo fiestas'
    });
  };

  const agregarFotoExistente = () => {
    component.existentes.set(['https://ejemplo.com/foto.jpg']);
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    editingId = null;

    publicacion = {
      id: 'publicacion-001',
      titulo: 'Apartamento moderno en Bogotá',
      descripcion: 'Apartamento cómodo y amplio, cerca del transporte público.',
      ciudad: 'Bogotá',
      ubicacionTextual: 'Calle 100 número 15',
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
    subirImagen = vi.fn().mockReturnValue(of({}));
    activar = vi.fn().mockReturnValue(of({}));
    navigate = vi.fn().mockResolvedValue(true);
    showToast = vi.fn();
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe iniciar en el paso uno', () => {
      crearComponente();

      expect(component.step()).toBe(1);
    });

    it('debe iniciar sin estar guardando', () => {
      crearComponente();

      expect(component.guardando()).toBe(false);
    });

    it('debe iniciar sin errores de imagen', () => {
      crearComponente();

      expect(component.imageError()).toBe('');
    });

    it('debe iniciar sin fotografías nuevas', () => {
      crearComponente();

      expect(component.nuevas()).toEqual([]);
    });

    it('debe iniciar con Wi-Fi y Cocina seleccionados', () => {
      crearComponente();

      expect(component.selectedAmenities()).toEqual(['Wi-Fi', 'Cocina']);
    });

    it('debe iniciar con el formulario inválido', () => {
      crearComponente();

      expect(component.form.invalid).toBe(true);
    });

    it('debe tener cinco tipos de alojamiento', () => {
      crearComponente();

      expect(component.tipos).toHaveLength(5);
    });
  });

  describe('Validación del formulario', () => {
    it('debe aceptar un formulario completo', () => {
      crearComponente();
      llenarFormulario();

      expect(component.form.valid).toBe(true);
    });

    it('debe rechazar un título vacío', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ title: '' });

      expect(component.form.get('title')?.invalid).toBe(true);
    });

    it('debe rechazar un título demasiado corto', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ title: 'Casa' });

      expect(component.form.get('title')?.invalid).toBe(true);
    });

    it('debe rechazar una descripción demasiado corta', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ description: 'Bonito lugar' });

      expect(component.form.get('description')?.invalid).toBe(true);
    });

    it('debe rechazar una ciudad con números', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ city: 'Bogota123' });

      expect(component.form.get('city')?.invalid).toBe(true);
    });

    it('debe rechazar capacidad cero', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ capacity: 0 });

      expect(component.form.get('capacity')?.invalid).toBe(true);
    });

    it('debe rechazar capacidad decimal', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ capacity: 2.5 });

      expect(component.form.get('capacity')?.invalid).toBe(true);
    });

    it('debe rechazar precio cero', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ price: 0 });

      expect(component.form.get('price')?.invalid).toBe(true);
    });

    it('debe rechazar reglas vacías', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ rules: '' });

      expect(component.form.get('rules')?.invalid).toBe(true);
    });
  });

  describe('Navegación entre pasos', () => {
    it('debe avanzar al segundo paso con datos válidos', () => {
      crearComponente();
      llenarFormulario();

      component.next();

      expect(component.step()).toBe(2);
    });

    it('no debe avanzar si el primer paso es inválido', () => {
      crearComponente();

      component.next();

      expect(component.step()).toBe(1);
    });

    it('debe avanzar hasta el tercer paso', () => {
      crearComponente();
      llenarFormulario();

      component.next();
      component.next();

      expect(component.step()).toBe(3);
    });

    it('no debe avanzar más allá del tercer paso', () => {
      crearComponente();
      llenarFormulario();
      component.goStep(3);

      component.next();

      expect(component.step()).toBe(3);
    });

    it('debe regresar al paso anterior', () => {
      crearComponente();
      llenarFormulario();
      component.goStep(3);

      component.previous();

      expect(component.step()).toBe(2);
    });

    it('no debe retroceder antes del primer paso', () => {
      crearComponente();

      component.previous();

      expect(component.step()).toBe(1);
    });

    it('debe permitir regresar directamente al primer paso', () => {
      crearComponente();
      llenarFormulario();
      component.goStep(3);

      component.goStep(1);

      expect(component.step()).toBe(1);
    });
  });

  describe('Servicios del alojamiento', () => {
    it('debe agregar un servicio nuevo', () => {
      crearComponente();

      component.toggleAmenity('Piscina');

      expect(component.selectedAmenities()).toContain('Piscina');
    });

    it('debe quitar un servicio seleccionado', () => {
      crearComponente();

      component.toggleAmenity('Wi-Fi');

      expect(component.selectedAmenities()).not.toContain('Wi-Fi');
    });

    it('no debe duplicar servicios', () => {
      crearComponente();

      component.toggleAmenity('Piscina');
      component.toggleAmenity('Piscina');

      expect(component.selectedAmenities()).not.toContain('Piscina');
    });
  });

  describe('Edición de alojamientos', () => {
    it('debe consultar las publicaciones al editar', () => {
      editingId = 'publicacion-001';
      crearComponente();

      expect(mias).toHaveBeenCalledTimes(1);
    });

    it('debe cargar los datos de la publicación existente', () => {
      editingId = 'publicacion-001';
      crearComponente();

      expect(component.form.get('title')?.value).toBe(publicacion.titulo);
      expect(component.form.get('capacity')?.value).toBe(4);
    });

    it('debe cargar los servicios existentes', () => {
      editingId = 'publicacion-001';
      crearComponente();

      expect(component.selectedAmenities()).toEqual(['Wi-Fi', 'Cocina']);
    });

    it('debe cargar las fotografías existentes', () => {
      editingId = 'publicacion-001';
      crearComponente();

      expect(component.existentes()).toHaveLength(1);
    });

    it('debe redirigir cuando no encuentra la publicación', () => {
      editingId = 'publicacion-inexistente';
      crearComponente();

      expect(navigate).toHaveBeenCalledWith([
        '/anfitrion/alojamientos'
      ]);
    });

    it('debe redirigir cuando falla la consulta de edición', () => {
      editingId = 'publicacion-001';
      mias.mockReturnValue(
        throwError(() => errorHttp(500))
      );

      crearComponente();

      expect(navigate).toHaveBeenCalledWith([
        '/anfitrion/alojamientos'
      ]);
    });
  });

  describe('Guardar y publicar', () => {
    it('no debe guardar un formulario inválido', () => {
      crearComponente();

      component.save(false);

      expect(crear).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith(
        expect.any(String),
        'warning'
      );
    });

    it('debe permitir guardar un borrador sin fotografías', () => {
      crearComponente();
      llenarFormulario();

      component.save(false);

      expect(crear).toHaveBeenCalledTimes(1);
      expect(activar).not.toHaveBeenCalled();
    });

    it('debe exigir una fotografía para publicar', () => {
      crearComponente();
      llenarFormulario();

      component.save(true);

      expect(crear).not.toHaveBeenCalled();
      expect(component.step()).toBe(2);
    });

    it('debe crear una publicación con los datos del formulario', () => {
      crearComponente();
      llenarFormulario();

      component.save(false);

      expect(crear).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: 'Apartamento moderno en Bogotá',
          capacidad: 4,
          precioNoche: 250000
        })
      );
    });

    it('debe activar la publicación cuando se solicita publicar', () => {
      crearComponente();
      llenarFormulario();
      agregarFotoExistente();

      component.save(true);

      expect(activar).toHaveBeenCalledWith('publicacion-nueva');
    });

    it('debe editar en lugar de crear una publicación existente', () => {
      editingId = 'publicacion-001';
      crearComponente();

      component.save(false);

      expect(editar).toHaveBeenCalledTimes(1);
      expect(crear).not.toHaveBeenCalled();
    });

    it('debe mostrar confirmación al guardar un borrador', () => {
      crearComponente();
      llenarFormulario();

      component.save(false);

      expect(showToast).toHaveBeenCalledWith(
        'El borrador fue guardado.'
      );
    });

    it('debe mostrar confirmación al publicar', () => {
      crearComponente();
      llenarFormulario();
      agregarFotoExistente();

      component.save(true);

      expect(showToast).toHaveBeenCalledWith(
        'La publicación está activa.'
      );
    });

    it('debe navegar al listado después de guardar', () => {
      crearComponente();
      llenarFormulario();

      component.save(false);

      expect(navigate).toHaveBeenCalledWith([
        '/anfitrion/alojamientos'
      ]);
    });

    it('debe manejar errores del backend al guardar', () => {
      crear.mockReturnValue(
        throwError(() => errorHttp(400, 'Datos inválidos'))
      );

      crearComponente();
      llenarFormulario();

      component.save(false);

      expect(showToast).toHaveBeenCalledWith(
        'Datos inválidos',
        'warning'
      );
      expect(component.guardando()).toBe(false);
    });

    it('debe impedir guardados duplicados mientras procesa', () => {
      const pendiente = new Subject<any>();
      crear.mockReturnValue(pendiente.asObservable());

      crearComponente();
      llenarFormulario();

      component.save(false);
      component.save(false);

      expect(crear).toHaveBeenCalledTimes(1);

      pendiente.next({ id: 'publicacion-nueva' });
      pendiente.complete();

      expect(component.guardando()).toBe(false);
    });
  });
});
