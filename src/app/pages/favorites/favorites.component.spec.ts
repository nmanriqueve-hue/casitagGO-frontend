
// @vitest-environment jsdom
import '@angular/compiler';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FavoritesComponent } from './favorites.component';
import { FavoritesService } from '../../core/services/favorites.service';
import { CatalogService } from '../../core/services/catalog.service';

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

describe('FavoritesComponent', () => {
  let component: FavoritesComponent;

  const reales = signal<any[]>([]);
  const listings = signal<any[]>([]);
  const favoritosIds = signal<number[]>([]);

  let has: ReturnType<typeof vi.fn>;

  const alojamiento = (id: number, title = `Alojamiento ${id}`) => ({
    id,
    title
  });

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FavoritesService,
          useValue: {
            reales,
            has
          }
        },
        {
          provide: CatalogService,
          useValue: {
            listings
          }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new FavoritesComponent()
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    reales.set([]);
    listings.set([]);
    favoritosIds.set([]);

    has = vi.fn().mockImplementation(
      (id: number) => favoritosIds().includes(id)
    );
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe tener acceso al servicio de favoritos', () => {
      crearComponente();

      expect(component.favorites).toBeTruthy();
    });

    it('debe tener acceso al servicio del catálogo', () => {
      crearComponente();

      expect(component.catalog).toBeTruthy();
    });

    it('debe iniciar con la lista vacía cuando no hay favoritos', () => {
      crearComponente();

      expect(component.items()).toEqual([]);
    });

    it('debe exponer items como una señal calculada', () => {
      crearComponente();

      expect(typeof component.items).toBe('function');
    });
  });

  describe('Favoritos reales', () => {
    it('debe mostrar un favorito real', () => {
      reales.set([alojamiento(1)]);
      crearComponente();

      expect(component.items()).toHaveLength(1);
    });

    it('debe mostrar varios favoritos reales', () => {
      reales.set([
        alojamiento(1),
        alojamiento(2),
        alojamiento(3)
      ]);

      crearComponente();

      expect(component.items()).toHaveLength(3);
    });

    it('debe conservar los datos de un favorito real', () => {
      reales.set([alojamiento(1, 'Casa campestre')]);
      crearComponente();

      expect(component.items()[0]).toEqual({
        id: 1,
        title: 'Casa campestre'
      });
    });

    it('debe conservar el orden de los favoritos reales', () => {
      reales.set([
        alojamiento(3),
        alojamiento(1),
        alojamiento(2)
      ]);

      crearComponente();

      expect(component.items().map(item => item.id)).toEqual([
        3, 1, 2
      ]);
    });

    it('debe actualizarse cuando se agrega un favorito real', () => {
      crearComponente();

      expect(component.items()).toHaveLength(0);

      reales.set([alojamiento(5)]);

      expect(component.items()).toHaveLength(1);
    });

    it('debe actualizarse cuando se elimina un favorito real', () => {
      reales.set([alojamiento(1), alojamiento(2)]);
      crearComponente();

      expect(component.items()).toHaveLength(2);

      reales.set([alojamiento(2)]);

      expect(component.items()).toHaveLength(1);
      expect(component.items()[0].id).toBe(2);
    });
  });

  describe('Favoritos del catálogo', () => {
    it('debe mostrar un alojamiento marcado como favorito', () => {
      listings.set([alojamiento(10)]);
      favoritosIds.set([10]);

      crearComponente();

      expect(component.items()).toHaveLength(1);
    });

    it('no debe mostrar alojamientos que no son favoritos', () => {
      listings.set([alojamiento(10)]);
      crearComponente();

      expect(component.items()).toEqual([]);
    });

    it('debe filtrar correctamente varios alojamientos', () => {
      listings.set([
        alojamiento(1),
        alojamiento(2),
        alojamiento(3),
        alojamiento(4)
      ]);
      favoritosIds.set([2, 4]);

      crearComponente();

      expect(component.items().map(item => item.id)).toEqual([
        2, 4
      ]);
    });

    it('debe conservar el orden del catálogo', () => {
      listings.set([
        alojamiento(8),
        alojamiento(3),
        alojamiento(5)
      ]);
      favoritosIds.set([3, 5, 8]);

      crearComponente();

      expect(component.items().map(item => item.id)).toEqual([
        8, 3, 5
      ]);
    });

    it('debe consultar si cada alojamiento es favorito', () => {
      listings.set([
        alojamiento(1),
        alojamiento(2),
        alojamiento(3)
      ]);

      crearComponente();
      component.items();

      expect(has).toHaveBeenCalledWith(1);
      expect(has).toHaveBeenCalledWith(2);
      expect(has).toHaveBeenCalledWith(3);
    });

    it('debe actualizarse cuando cambia el catálogo', () => {
      favoritosIds.set([7]);
      crearComponente();

      expect(component.items()).toHaveLength(0);

      listings.set([alojamiento(7)]);

      expect(component.items()).toHaveLength(1);
    });

    it('debe actualizarse cuando se marca un nuevo favorito', () => {
      listings.set([alojamiento(7)]);
      crearComponente();

      expect(component.items()).toHaveLength(0);

      favoritosIds.set([7]);

      expect(component.items()).toHaveLength(1);
    });
  });

  describe('Combinación de favoritos', () => {
    it('debe combinar favoritos reales y favoritos del catálogo', () => {
      reales.set([alojamiento(1)]);
      listings.set([alojamiento(2)]);
      favoritosIds.set([2]);

      crearComponente();

      expect(component.items()).toHaveLength(2);
    });

    it('debe colocar primero los favoritos reales', () => {
      reales.set([alojamiento(10)]);
      listings.set([alojamiento(20)]);
      favoritosIds.set([20]);

      crearComponente();

      expect(component.items().map(item => item.id)).toEqual([
        10, 20
      ]);
    });

    it('debe excluir del resultado los alojamientos no favoritos', () => {
      reales.set([alojamiento(1)]);
      listings.set([
        alojamiento(2),
        alojamiento(3)
      ]);
      favoritosIds.set([3]);

      crearComponente();

      expect(component.items().map(item => item.id)).toEqual([
        1, 3
      ]);
    });

    it('debe conservar los datos de ambas fuentes', () => {
      reales.set([alojamiento(1, 'Casa real')]);
      listings.set([alojamiento(2, 'Apartamento catálogo')]);
      favoritosIds.set([2]);

      crearComponente();

      expect(component.items()).toEqual([
        { id: 1, title: 'Casa real' },
        { id: 2, title: 'Apartamento catálogo' }
      ]);
    });
  });
});
