
// @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfileComponent } from './profile.component';
import { SessionService } from '../../core/services/session.service';
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

describe('ProfileComponent', () => {
  let component: ProfileComponent;

  let obtenerPerfil: ReturnType<typeof vi.fn>;
  let actualizarPerfilReal: ReturnType<typeof vi.fn>;
  let cambiarEstadoCuenta: ReturnType<typeof vi.fn>;
  let currentUser: ReturnType<typeof vi.fn>;
  let role: ReturnType<typeof vi.fn>;
  let logout: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.fn>;
  let show: ReturnType<typeof vi.fn>;

  const perfil = {
    nombre: 'Nataly Manrique',
    correo: 'nataly@correo.com',
    activo: true,
    creadoEn: '2026-01-15T12:00:00'
  };

  const crearError = (status: number, error: unknown = null) =>
    new HttpErrorResponse({ status, error });

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SessionService,
          useValue: {
            obtenerPerfil,
            actualizarPerfilReal,
            cambiarEstadoCuenta,
            currentUser,
            role,
            logout
          }
        },
        {
          provide: Router,
          useValue: { navigateByUrl }
        },
        {
          provide: ToastService,
          useValue: { show }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new ProfileComponent()
    );
  };

  const llenarFormulario = (
    name = 'Nataly Manrique',
    email = 'nataly@correo.com'
  ) => {
    component.form.patchValue({ name, email });
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    obtenerPerfil = vi.fn().mockReturnValue(of({ ...perfil }));
    actualizarPerfilReal = vi.fn().mockReturnValue(of(null));
    cambiarEstadoCuenta = vi.fn().mockReturnValue(of(null));
    currentUser = vi.fn().mockReturnValue({
      email: 'nataly@correo.com'
    });
    role = vi.fn().mockReturnValue('guest');
    logout = vi.fn();
    navigateByUrl = vi.fn().mockResolvedValue(true);
    show = vi.fn();
  });

  describe('Inicialización y consulta del perfil', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe consultar el perfil al iniciar', () => {
      crearComponente();

      expect(obtenerPerfil).toHaveBeenCalledTimes(1);
    });

    it('debe cargar el nombre del usuario', () => {
      crearComponente();

      expect(component.form.get('name')?.value).toBe('Nataly Manrique');
    });

    it('debe cargar el correo del usuario', () => {
      crearComponente();

      expect(component.form.get('email')?.value).toBe('nataly@correo.com');
    });

    it('debe reconocer una cuenta activa', () => {
      crearComponente();

      expect(component.cuentaActiva()).toBe(true);
    });

    it('debe reconocer una cuenta inactiva', () => {
      obtenerPerfil.mockReturnValue(
        of({ ...perfil, activo: false })
      );

      crearComponente();

      expect(component.cuentaActiva()).toBe(false);
    });

    it('debe mostrar la fecha de creación del perfil', () => {
      crearComponente();

      expect(component.miembroDesde()).toContain('2026');
    });

    it('debe mostrar la fecha en español', () => {
      crearComponente();

      expect(component.miembroDesde()).toContain('enero');
    });

    it('debe dejar vacía una fecha inválida', () => {
      obtenerPerfil.mockReturnValue(
        of({ ...perfil, creadoEn: 'fecha-invalida' })
      );

      crearComponente();

      expect(component.miembroDesde()).toBe('');
    });

    it('debe iniciar sin confirmación de desactivación', () => {
      crearComponente();

      expect(component.confirmDeactivate()).toBe(false);
    });

    it('debe iniciar sin guardar cambios', () => {
      crearComponente();

      expect(component.guardando()).toBe(false);
    });

    it('debe exponer el servicio de sesión', () => {
      crearComponente();

      expect(component.session).toBeTruthy();
    });
  });

  describe('Roles del usuario', () => {
    it('debe mostrar Huésped para el rol guest', () => {
      crearComponente();

      expect(component.rolTexto()).toBe('Huésped');
    });

    it('debe mostrar Anfitrión para el rol host', () => {
      role.mockReturnValue('host');
      crearComponente();

      expect(component.rolTexto()).toBe('Anfitrión');
    });

    it('debe mostrar Administrador para el rol admin', () => {
      role.mockReturnValue('admin');
      crearComponente();

      expect(component.rolTexto()).toBe('Administrador');
    });

    it('debe usar Huésped cuando no hay rol', () => {
      role.mockReturnValue(null);
      crearComponente();

      expect(component.rolTexto()).toBe('Huésped');
    });
  });

  describe('Validaciones del formulario', () => {
    it('debe aceptar un formulario válido', () => {
      crearComponente();

      expect(component.form.valid).toBe(true);
    });

    it('debe rechazar un nombre vacío', () => {
      crearComponente();
      llenarFormulario('', 'nataly@correo.com');

      expect(component.form.invalid).toBe(true);
    });

    it('debe rechazar un nombre mayor de 150 caracteres', () => {
      crearComponente();
      llenarFormulario('A'.repeat(151));

      expect(component.form.invalid).toBe(true);
    });

    it('debe aceptar un nombre de 150 caracteres', () => {
      crearComponente();
      llenarFormulario('A'.repeat(150));

      expect(component.form.valid).toBe(true);
    });

    it('debe rechazar un correo vacío', () => {
      crearComponente();
      llenarFormulario('Nataly', '');

      expect(component.form.invalid).toBe(true);
    });

    it('debe rechazar un correo sin arroba', () => {
      crearComponente();
      llenarFormulario('Nataly', 'natalycorreo.com');

      expect(component.form.invalid).toBe(true);
    });

    it('debe rechazar un correo sin dominio', () => {
      crearComponente();
      llenarFormulario('Nataly', 'nataly@');

      expect(component.form.invalid).toBe(true);
    });

    it('debe rechazar un correo mayor de 150 caracteres', () => {
      crearComponente();
      llenarFormulario('Nataly', `${'a'.repeat(145)}@b.com`);

      expect(component.form.invalid).toBe(true);
    });

    it('debe aceptar un correo válido', () => {
      crearComponente();
      llenarFormulario('Nataly', 'nuevo@correo.com');

      expect(component.form.valid).toBe(true);
    });

    it('no debe guardar un formulario inválido', () => {
      crearComponente();
      llenarFormulario('', '');

      component.save();

      expect(actualizarPerfilReal).not.toHaveBeenCalled();
    });

    it('debe marcar los campos como tocados si son inválidos', () => {
      crearComponente();
      llenarFormulario('', '');

      component.save();

      expect(component.form.get('name')?.touched).toBe(true);
      expect(component.form.get('email')?.touched).toBe(true);
    });
  });

  describe('Actualización del perfil', () => {
    it('debe enviar nombre y correo al backend', () => {
      crearComponente();
      llenarFormulario('Nuevo Nombre', 'nataly@correo.com');

      component.save();

      expect(actualizarPerfilReal).toHaveBeenCalledWith(
        'Nuevo Nombre',
        'nataly@correo.com'
      );
    });

    it('debe mostrar confirmación después de actualizar', () => {
      crearComponente();

      component.save();

      expect(show).toHaveBeenCalledWith('Tu perfil fue actualizado.');
    });

    it('no debe cerrar sesión si el correo no cambia', () => {
      crearComponente();

      component.save();

      expect(logout).not.toHaveBeenCalled();
    });

    it('debe cerrar sesión cuando cambia el correo', () => {
      crearComponente();
      llenarFormulario('Nataly', 'nuevo@correo.com');

      component.save();

      expect(logout).toHaveBeenCalledTimes(1);
    });

    it('debe redirigir al inicio de sesión si cambia el correo', () => {
      crearComponente();
      llenarFormulario('Nataly', 'nuevo@correo.com');

      component.save();

      expect(navigateByUrl).toHaveBeenCalledWith('/iniciar-sesion');
    });

    it('debe mostrar aviso al cambiar el correo', () => {
      crearComponente();
      llenarFormulario('Nataly', 'nuevo@correo.com');

      component.save();

      expect(show).toHaveBeenCalledWith(
        'Cambiaste tu correo. Inicia sesión de nuevo con el correo nuevo.',
        'warning'
      );
    });

    it('no debe considerar cambio si solo varían las mayúsculas', () => {
      crearComponente();
      llenarFormulario('Nataly', 'NATALY@CORREO.COM');

      component.save();

      expect(logout).not.toHaveBeenCalled();
    });

    it('debe activar el estado guardando mientras espera', () => {
      const pendiente = new Subject<null>();
      actualizarPerfilReal.mockReturnValue(pendiente.asObservable());

      crearComponente();
      component.save();

      expect(component.guardando()).toBe(true);

      pendiente.next(null);
      pendiente.complete();

      expect(component.guardando()).toBe(false);
    });

    it('debe finalizar el estado guardando después del éxito', () => {
      crearComponente();

      component.save();

      expect(component.guardando()).toBe(false);
    });

    it('debe finalizar el estado guardando después de un error', () => {
      actualizarPerfilReal.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      component.save();

      expect(component.guardando()).toBe(false);
    });
  });

  describe('Desactivación de la cuenta', () => {
    it('debe enviar false al desactivar la cuenta', () => {
      crearComponente();

      component.deactivate();

      expect(cambiarEstadoCuenta).toHaveBeenCalledWith(false);
    });

    it('debe cerrar sesión después de desactivar', () => {
      crearComponente();

      component.deactivate();

      expect(logout).toHaveBeenCalledTimes(1);
    });

    it('debe redirigir al inicio de sesión después de desactivar', () => {
      crearComponente();

      component.deactivate();

      expect(navigateByUrl).toHaveBeenCalledWith('/iniciar-sesion');
    });

    it('debe mostrar confirmación de desactivación', () => {
      crearComponente();

      component.deactivate();

      expect(show).toHaveBeenCalledWith(
        'Tu cuenta fue desactivada.',
        'warning'
      );
    });

    it('debe cerrar el diálogo de confirmación', () => {
      crearComponente();
      component.confirmDeactivate.set(true);

      component.deactivate();

      expect(component.confirmDeactivate()).toBe(false);
    });

    it('no debe cerrar sesión si falla la desactivación', () => {
      cambiarEstadoCuenta.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      component.deactivate();

      expect(logout).not.toHaveBeenCalled();
    });

    it('debe cerrar el diálogo si falla la desactivación', () => {
      cambiarEstadoCuenta.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      component.confirmDeactivate.set(true);

      component.deactivate();

      expect(component.confirmDeactivate()).toBe(false);
    });
  });

  describe('Errores del servidor', () => {
    it('debe mostrar error de conexión al cargar el perfil', () => {
      obtenerPerfil.mockReturnValue(
        throwError(() => crearError(0))
      );

      crearComponente();

      expect(show).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo conectar con el servidor'),
        'warning'
      );
    });

    it('debe mostrar el mensaje del backend para error 400', () => {
      actualizarPerfilReal.mockReturnValue(
        throwError(() => crearError(400, 'Correo ya registrado'))
      );

      crearComponente();
      component.save();

      expect(show).toHaveBeenCalledWith(
        'Correo ya registrado',
        'warning'
      );
    });

    it('debe mostrar error general para estado 403', () => {
      actualizarPerfilReal.mockReturnValue(
        throwError(() => crearError(403))
      );

      crearComponente();
      component.save();

      expect(show).toHaveBeenCalledWith(
        'No se pudo completar la operación. Revisa los datos o vuelve a iniciar sesión.',
        'warning'
      );
    });

    it('debe mostrar error general para estado 500', () => {
      actualizarPerfilReal.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      component.save();

      expect(show).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo completar la operación'),
        'warning'
      );
    });

    it('debe mostrar error si falla la desactivación', () => {
      cambiarEstadoCuenta.mockReturnValue(
        throwError(() => crearError(400, 'Operación no permitida'))
      );

      crearComponente();
      component.deactivate();

      expect(show).toHaveBeenCalledWith(
        'Operación no permitida',
        'warning'
      );
    });

    it('no debe navegar cuando falla la actualización', () => {
      actualizarPerfilReal.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      component.save();

      expect(navigateByUrl).not.toHaveBeenCalled();
    });

    it('debe permitir reintentar una actualización fallida', () => {
      actualizarPerfilReal
        .mockReturnValueOnce(
          throwError(() => crearError(500))
        )
        .mockReturnValueOnce(of(null));

      crearComponente();

      component.save();
      component.save();

      expect(actualizarPerfilReal).toHaveBeenCalledTimes(2);
      expect(show).toHaveBeenCalledWith('Tu perfil fue actualizado.');
    });
  });
});
