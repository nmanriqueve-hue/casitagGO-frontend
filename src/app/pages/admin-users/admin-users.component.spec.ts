
// @vitest-environment jsdom
import '@angular/compiler';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminUsersComponent } from './admin-users.component';
import { User } from '../../core/models/marketplace.models';
import { AdminService } from '../../core/services/admin.service';
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

describe('AdminUsersComponent', () => {
  let component: AdminUsersComponent;
  let usuarios: ReturnType<typeof signal<User[]>>;
  let toggleUser: ReturnType<typeof vi.fn>;
  let mostrarToast: ReturnType<typeof vi.fn>;

  const crearUsuario = (
    id: number,
    name: string,
    email: string,
    active = true
  ): User => ({
    id,
    name,
    email,
    active
  } as User);

  const crearComponente = (): void => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AdminService,
          useValue: {
            users: usuarios,
            toggleUser
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
      () => new AdminUsersComponent(
        TestBed.inject(AdminService),
        TestBed.inject(ToastService)
      )
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    usuarios = signal<User[]>([]);
    toggleUser = vi.fn();
    mostrarToast = vi.fn();
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe iniciar con búsqueda vacía', () => {
      crearComponente();

      expect(component.search()).toBe('');
    });

    it('debe iniciar sin usuario seleccionado', () => {
      crearComponente();

      expect(component.target()).toBeNull();
    });

    it('debe iniciar sin motivo', () => {
      crearComponente();

      expect(component.reason).toBe('');
    });

    it('debe tener acceso al servicio de administración', () => {
      crearComponente();

      expect(component.admin).toBeDefined();
    });

    it('debe iniciar sin usuarios visibles si la lista está vacía', () => {
      crearComponente();

      expect(component.visible()).toEqual([]);
    });
  });

  describe('Visualización de usuarios', () => {
    it('debe mostrar un usuario', () => {
      usuarios.set([
        crearUsuario(1, 'Ana López', 'ana@correo.com')
      ]);

      crearComponente();

      expect(component.visible()).toHaveLength(1);
    });

    it('debe mostrar varios usuarios', () => {
      usuarios.set([
        crearUsuario(1, 'Ana López', 'ana@correo.com'),
        crearUsuario(2, 'Carlos Ruiz', 'carlos@correo.com'),
        crearUsuario(3, 'Laura Díaz', 'laura@correo.com')
      ]);

      crearComponente();

      expect(component.visible()).toHaveLength(3);
    });

    it('debe conservar el orden de los usuarios', () => {
      usuarios.set([
        crearUsuario(3, 'Laura Díaz', 'laura@correo.com'),
        crearUsuario(1, 'Ana López', 'ana@correo.com'),
        crearUsuario(2, 'Carlos Ruiz', 'carlos@correo.com')
      ]);

      crearComponente();

      expect(component.visible().map(user => user.id)).toEqual([
        3, 1, 2
      ]);
    });

    it('debe conservar los nombres de los usuarios', () => {
      usuarios.set([
        crearUsuario(1, 'Ana López', 'ana@correo.com')
      ]);

      crearComponente();

      expect(component.visible()[0].name).toBe('Ana López');
    });

    it('debe conservar los correos electrónicos', () => {
      usuarios.set([
        crearUsuario(1, 'Ana López', 'ana@correo.com')
      ]);

      crearComponente();

      expect(component.visible()[0].email).toBe('ana@correo.com');
    });

    it('debe conservar el estado activo del usuario', () => {
      usuarios.set([
        crearUsuario(1, 'Ana López', 'ana@correo.com', false)
      ]);

      crearComponente();

      expect(component.visible()[0].active).toBe(false);
    });

    it('debe actualizar la lista cuando se agregan usuarios', () => {
      crearComponente();

      usuarios.set([
        crearUsuario(1, 'Ana López', 'ana@correo.com')
      ]);

      expect(component.visible()).toHaveLength(1);
    });

    it('debe actualizar la lista cuando se eliminan usuarios', () => {
      usuarios.set([
        crearUsuario(1, 'Ana López', 'ana@correo.com'),
        crearUsuario(2, 'Carlos Ruiz', 'carlos@correo.com')
      ]);

      crearComponente();

      usuarios.set([
        crearUsuario(2, 'Carlos Ruiz', 'carlos@correo.com')
      ]);

      expect(component.visible().map(user => user.id)).toEqual([2]);
    });
  });

  describe('Búsqueda de usuarios', () => {
    beforeEach(() => {
      usuarios.set([
        crearUsuario(1, 'Ana López', 'ana@correo.com'),
        crearUsuario(2, 'Carlos Ruiz', 'carlos@correo.com'),
        crearUsuario(3, 'Laura Díaz', 'laura@gmail.com'),
        crearUsuario(4, 'Pedro Gómez', 'pedro@gmail.com')
      ]);

      crearComponente();
    });

    it('debe mostrar todos los usuarios con búsqueda vacía', () => {
      expect(component.visible()).toHaveLength(4);
    });

    it('debe buscar por nombre completo', () => {
      component.search.set('Ana López');

      expect(component.visible().map(user => user.id)).toEqual([1]);
    });

    it('debe buscar por nombre parcial', () => {
      component.search.set('Carlos');

      expect(component.visible().map(user => user.id)).toEqual([2]);
    });

    it('debe buscar por apellido', () => {
      component.search.set('Díaz');

      expect(component.visible().map(user => user.id)).toEqual([3]);
    });

    it('debe buscar por correo electrónico completo', () => {
      component.search.set('pedro@gmail.com');

      expect(component.visible().map(user => user.id)).toEqual([4]);
    });

    it('debe buscar por dominio del correo', () => {
      component.search.set('gmail.com');

      expect(component.visible().map(user => user.id)).toEqual([3, 4]);
    });

    it('debe ignorar mayúsculas y minúsculas', () => {
      component.search.set('ANA');

      expect(component.visible().map(user => user.id)).toEqual([1]);
    });

    it('debe buscar utilizando letras minúsculas', () => {
      component.search.set('laura');

      expect(component.visible().map(user => user.id)).toEqual([3]);
    });

    it('debe devolver una lista vacía si no encuentra usuarios', () => {
      component.search.set('Usuario inexistente');

      expect(component.visible()).toEqual([]);
    });

    it('debe actualizar los resultados al cambiar la búsqueda', () => {
      component.search.set('Ana');
      expect(component.visible()).toHaveLength(1);

      component.search.set('Pedro');
      expect(component.visible()).toHaveLength(1);
      expect(component.visible()[0].id).toBe(4);
    });

    it('debe volver a mostrar todos los usuarios al limpiar la búsqueda', () => {
      component.search.set('Carlos');
      expect(component.visible()).toHaveLength(1);

      component.search.set('');
      expect(component.visible()).toHaveLength(4);
    });

    it('debe encontrar coincidencias en el nombre y el correo', () => {
      component.search.set('correo.com');

      expect(component.visible().map(user => user.id)).toEqual([1, 2]);
    });
  });

  describe('Restricción de usuarios', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('no debe modificar usuarios si no hay selección', () => {
      component.toggle();

      expect(toggleUser).not.toHaveBeenCalled();
    });

    it('debe restringir un usuario activo', () => {
      component.target.set(
        crearUsuario(1, 'Ana López', 'ana@correo.com', true)
      );

      component.toggle();

      expect(toggleUser).toHaveBeenCalledWith(1);
    });

    it('debe utilizar el identificador seleccionado', () => {
      component.target.set(
        crearUsuario(25, 'Carlos Ruiz', 'carlos@correo.com')
      );

      component.toggle();

      expect(toggleUser).toHaveBeenCalledWith(25);
    });

    it('debe llamar una vez al servicio de administración', () => {
      component.target.set(
        crearUsuario(1, 'Ana López', 'ana@correo.com')
      );

      component.toggle();

      expect(toggleUser).toHaveBeenCalledTimes(1);
    });

    it('debe limpiar la selección después de restringir', () => {
      component.target.set(
        crearUsuario(1, 'Ana López', 'ana@correo.com')
      );

      component.toggle();

      expect(component.target()).toBeNull();
    });

    it('debe limpiar el motivo después de restringir', () => {
      component.target.set(
        crearUsuario(1, 'Ana López', 'ana@correo.com')
      );
      component.reason = 'Incumplimiento de normas';

      component.toggle();

      expect(component.reason).toBe('');
    });

    it('debe mostrar una notificación de restricción', () => {
      component.target.set(
        crearUsuario(1, 'Ana López', 'ana@correo.com', true)
      );

      component.toggle();

      expect(mostrarToast).toHaveBeenCalledTimes(1);
      expect(mostrarToast.mock.calls[0][0]).toContain('restringida');
    });

    it('debe permitir restringir aunque el motivo esté vacío', () => {
      component.target.set(
        crearUsuario(1, 'Ana López', 'ana@correo.com', true)
      );
      component.reason = '';

      component.toggle();

      expect(toggleUser).toHaveBeenCalledWith(1);
    });
  });

  describe('Reactivación de usuarios', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe reactivar un usuario inactivo', () => {
      component.target.set(
        crearUsuario(2, 'Carlos Ruiz', 'carlos@correo.com', false)
      );

      component.toggle();

      expect(toggleUser).toHaveBeenCalledWith(2);
    });

    it('debe mostrar una notificación de reactivación', () => {
      component.target.set(
        crearUsuario(2, 'Carlos Ruiz', 'carlos@correo.com', false)
      );

      component.toggle();

      expect(mostrarToast).toHaveBeenCalledWith(
        'La cuenta fue reactivada.'
      );
    });

    it('debe limpiar la selección después de reactivar', () => {
      component.target.set(
        crearUsuario(2, 'Carlos Ruiz', 'carlos@correo.com', false)
      );

      component.toggle();

      expect(component.target()).toBeNull();
    });

    it('debe limpiar el motivo después de reactivar', () => {
      component.target.set(
        crearUsuario(2, 'Carlos Ruiz', 'carlos@correo.com', false)
      );
      component.reason = 'Revisión completada';

      component.toggle();

      expect(component.reason).toBe('');
    });

    it('debe permitir reactivar sin escribir un motivo', () => {
      component.target.set(
        crearUsuario(2, 'Carlos Ruiz', 'carlos@correo.com', false)
      );
      component.reason = '';

      component.toggle();

      expect(toggleUser).toHaveBeenCalledWith(2);
    });

    it('no debe mostrar notificaciones si no hay usuario seleccionado', () => {
      component.toggle();

      expect(mostrarToast).not.toHaveBeenCalled();
    });
  });
});
