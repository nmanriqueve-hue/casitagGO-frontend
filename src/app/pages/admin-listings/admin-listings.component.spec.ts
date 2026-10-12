
// @vitest-environment jsdom
import '@angular/compiler';

import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminListingsComponent } from './admin-listings.component';
import { CatalogService } from '../../core/services/catalog.service';
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

describe('AdminListingsComponent', () => {
  let component: AdminListingsComponent;
  let setStatus: ReturnType<typeof vi.fn>;
  let mostrarToast: ReturnType<typeof vi.fn>;

  const publicaciones = signal<Listing[]>([]);

  const crearPublicacion = (
    id: number,
    status = 'PENDIENTE'
  ): Listing => ({
    id,
    uuid: `uuid-${id}`,
    title: `Alojamiento ${id}`,
    city: 'Bogotá',
    status
  } as Listing);

  const crearComponente = (): void => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CatalogService,
          useValue: {
            listings: publicaciones,
            setStatus
          }
        },
        {
          provide: ToastService,
          useValue: {
            show: mostrarToast
          }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new AdminListingsComponent(
        TestBed.inject(CatalogService),
        TestBed.inject(ToastService)
      )
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    publicaciones.set([]);
    setStatus = vi.fn();
    mostrarToast = vi.fn();
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe iniciar con filtro TODAS', () => {
      crearComponente();

      expect(component.filter()).toBe('TODAS');
    });

    it('debe iniciar sin publicación seleccionada', () => {
      crearComponente();

      expect(component.target()).toBeNull();
    });

    it('debe iniciar sin motivo de bloqueo', () => {
      crearComponente();

      expect(component.reason).toBe('');
    });

    it('debe tener acceso al catálogo', () => {
      crearComponente();

      expect(component.catalog).toBeDefined();
    });

    it('debe iniciar sin publicaciones visibles cuando el catálogo está vacío', () => {
      crearComponente();

      expect(component.visible()).toEqual([]);
    });
  });

  describe('Carga y visualización de publicaciones', () => {
    it('debe mostrar una publicación', () => {
      publicaciones.set([crearPublicacion(1)]);
      crearComponente();

      expect(component.visible()).toHaveLength(1);
    });

    it('debe mostrar varias publicaciones', () => {
      publicaciones.set([
        crearPublicacion(1),
        crearPublicacion(2),
        crearPublicacion(3)
      ]);

      crearComponente();

      expect(component.visible()).toHaveLength(3);
    });

    it('debe conservar los identificadores', () => {
      publicaciones.set([
        crearPublicacion(1),
        crearPublicacion(2)
      ]);

      crearComponente();

      expect(component.visible().map(item => item.id)).toEqual([
        1, 2
      ]);
    });

    it('debe conservar el orden de las publicaciones', () => {
      publicaciones.set([
        crearPublicacion(3),
        crearPublicacion(1),
        crearPublicacion(2)
      ]);

      crearComponente();

      expect(component.visible().map(item => item.id)).toEqual([
        3, 1, 2
      ]);
    });

    it('debe actualizar la lista cuando cambia el catálogo', () => {
      crearComponente();

      publicaciones.set([
        crearPublicacion(1),
        crearPublicacion(2)
      ]);

      expect(component.visible()).toHaveLength(2);
    });

    it('debe actualizar la lista cuando se elimina una publicación', () => {
      publicaciones.set([
        crearPublicacion(1),
        crearPublicacion(2)
      ]);

      crearComponente();

      publicaciones.set([crearPublicacion(2)]);

      expect(component.visible().map(item => item.id)).toEqual([2]);
    });
  });

  describe('Filtros de publicaciones', () => {
    beforeEach(() => {
      publicaciones.set([
        crearPublicacion(1, 'PENDIENTE'),
        crearPublicacion(2, 'ACTIVA'),
        crearPublicacion(3, 'BLOQUEADA'),
        crearPublicacion(4, 'PAUSADA'),
        crearPublicacion(5, 'ACTIVA')
      ]);

      crearComponente();
    });

    it('debe mostrar todas las publicaciones con filtro TODAS', () => {
      expect(component.visible()).toHaveLength(5);
    });

    it('debe mostrar las publicaciones pendientes', () => {
      component.filter.set('PENDIENTE');

      expect(component.visible().map(item => item.id)).toEqual([1]);
    });

    it('debe mostrar las publicaciones activas', () => {
      component.filter.set('ACTIVA');

      expect(component.visible().map(item => item.id)).toEqual([2, 5]);
    });

    it('debe mostrar las publicaciones bloqueadas', () => {
      component.filter.set('BLOQUEADA');

      expect(component.visible().map(item => item.id)).toEqual([3]);
    });

    it('debe mostrar las publicaciones pausadas', () => {
      component.filter.set('PAUSADA');

      expect(component.visible().map(item => item.id)).toEqual([4]);
    });

    it('debe mostrar una lista vacía si no hay coincidencias', () => {
      component.filter.set('INEXISTENTE');

      expect(component.visible()).toEqual([]);
    });

    it('debe actualizar los resultados al cambiar el filtro', () => {
      component.filter.set('ACTIVA');

      expect(component.visible()).toHaveLength(2);

      component.filter.set('PENDIENTE');

      expect(component.visible()).toHaveLength(1);
    });

    it('debe volver a mostrar todas las publicaciones', () => {
      component.filter.set('BLOQUEADA');

      expect(component.visible()).toHaveLength(1);

      component.filter.set('TODAS');

      expect(component.visible()).toHaveLength(5);
    });

    it('debe respetar el estado exacto', () => {
      component.filter.set('activa');

      expect(component.visible()).toEqual([]);
    });

    it('debe actualizar las publicaciones visibles cuando cambian los estados', () => {
      component.filter.set('ACTIVA');

      publicaciones.set([
        crearPublicacion(1, 'ACTIVA'),
        crearPublicacion(2, 'PENDIENTE')
      ]);

      expect(component.visible().map(item => item.id)).toEqual([1]);
    });
  });

  describe('Aprobación de publicaciones', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe aprobar una publicación', () => {
      component.approve(1);

      expect(setStatus).toHaveBeenCalledWith(1, 'ACTIVA');
    });

    it('debe aprobar utilizando el identificador recibido', () => {
      component.approve(25);

      expect(setStatus).toHaveBeenCalledWith(25, 'ACTIVA');
    });

    it('debe llamar una vez al servicio al aprobar', () => {
      component.approve(1);

      expect(setStatus).toHaveBeenCalledTimes(1);
    });

    it('debe mostrar un mensaje después de aprobar', () => {
      component.approve(1);

      expect(mostrarToast).toHaveBeenCalledTimes(1);
    });

    it('debe informar que la publicación está activa', () => {
      component.approve(1);

      expect(mostrarToast.mock.calls[0][0]).toContain('activa');
    });

    it('no debe bloquear una publicación cuando se aprueba', () => {
      component.approve(1);

      expect(setStatus).not.toHaveBeenCalledWith(
        1, 'BLOQUEADA'
      );
    });

    it('debe permitir aprobar diferentes publicaciones', () => {
      component.approve(1);
      component.approve(2);

      expect(setStatus).toHaveBeenNthCalledWith(
        1, 1, 'ACTIVA'
      );

      expect(setStatus).toHaveBeenNthCalledWith(
        2, 2, 'ACTIVA'
      );
    });
  });

  describe('Bloqueo de publicaciones', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('no debe bloquear si no hay publicación seleccionada', () => {
      component.block();

      expect(setStatus).not.toHaveBeenCalled();
    });

    it('no debe bloquear si el motivo está vacío', () => {
      component.target.set(crearPublicacion(1));
      component.reason = '';

      component.block();

      expect(setStatus).not.toHaveBeenCalled();
    });

    it('no debe bloquear si el motivo contiene solamente espacios', () => {
      component.target.set(crearPublicacion(1));
      component.reason = '   ';

      component.block();

      expect(setStatus).not.toHaveBeenCalled();
    });

    it('debe bloquear una publicación con motivo válido', () => {
      component.target.set(crearPublicacion(1));
      component.reason = 'Contenido inapropiado';

      component.block();

      expect(setStatus).toHaveBeenCalledWith(
        1, 'BLOQUEADA'
      );
    });

    it('debe bloquear la publicación seleccionada', () => {
      component.target.set(crearPublicacion(8));
      component.reason = 'Incumplimiento de normas';

      component.block();

      expect(setStatus).toHaveBeenCalledWith(
        8, 'BLOQUEADA'
      );
    });

    it('debe limpiar la selección después de bloquear', () => {
      component.target.set(crearPublicacion(1));
      component.reason = 'Motivo válido';

      component.block();

      expect(component.target()).toBeNull();
    });

    it('debe limpiar el motivo después de bloquear', () => {
      component.target.set(crearPublicacion(1));
      component.reason = 'Motivo válido';

      component.block();

      expect(component.reason).toBe('');
    });

    it('debe mostrar un aviso de bloqueo', () => {
      component.target.set(crearPublicacion(1));
      component.reason = 'Motivo válido';

      component.block();

      expect(mostrarToast).toHaveBeenCalledTimes(1);
    });

    it('debe mostrar el aviso con categoría warning', () => {
      component.target.set(crearPublicacion(1));
      component.reason = 'Motivo válido';

      component.block();

      expect(mostrarToast.mock.calls[0][1]).toBe('warning');
    });

    it('debe informar que la publicación fue bloqueada', () => {
      component.target.set(crearPublicacion(1));
      component.reason = 'Motivo válido';

      component.block();

      expect(mostrarToast.mock.calls[0][0]).toContain(
        'bloqueada'
      );
    });

    it('no debe limpiar el motivo si el bloqueo es inválido', () => {
      component.reason = 'Motivo sin publicación';

      component.block();

      expect(component.reason).toBe(
        'Motivo sin publicación'
      );
    });

    it('no debe mostrar notificación cuando el bloqueo es inválido', () => {
      component.target.set(crearPublicacion(1));
      component.reason = ' ';

      component.block();

      expect(mostrarToast).not.toHaveBeenCalled();
    });

    it('debe permitir bloquear una publicación después de seleccionarla', () => {
      component.target.set(crearPublicacion(3));
      component.reason = 'Incumplimiento';

      component.block();

      expect(setStatus).toHaveBeenCalledTimes(1);
      expect(component.target()).toBeNull();
      expect(component.reason).toBe('');
    });
  });
});
