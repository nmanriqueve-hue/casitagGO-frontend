
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

import { RegisterComponent } from './register.component';
import { SessionService } from '../../core/services/session.service';

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

describe('RegisterComponent', () => {
  let component: RegisterComponent;

  let registroReal: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  const crearError = (status: number) =>
    new HttpErrorResponse({ status });

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SessionService,
          useValue: { registroReal }
        },
        {
          provide: Router,
          useValue: { navigateByUrl }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new RegisterComponent()
    );
  };

  const llenarFormulario = (
    role: 'guest' | 'host' = 'guest'
  ) => {
    component.form.patchValue({
      name: 'Nataly Manrique',
      email: 'nataly@correo.com',
      role,
      password: 'Clave12345',
      confirmPassword: 'Clave12345',
      terms: true
    });
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    registroReal = vi.fn().mockReturnValue(
      of({ id: 'usuario-001', role: 'guest' })
    );

    navigateByUrl = vi.fn().mockResolvedValue(true);
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe iniciar sin enviar el formulario', () => {
      crearComponente();

      expect(component.submitted).toBe(false);
    });

    it('debe iniciar sin procesar una solicitud', () => {
      crearComponente();

      expect(component.enviando()).toBe(false);
    });

    it('debe iniciar sin errores de autenticación', () => {
      crearComponente();

      expect(component.authError()).toBe('');
    });

    it('debe iniciar con el nombre vacío', () => {
      crearComponente();

      expect(component.form.get('name')?.value).toBe('');
    });

    it('debe iniciar con el correo vacío', () => {
      crearComponente();

      expect(component.form.get('email')?.value).toBe('');
    });

    it('debe seleccionar huésped por defecto', () => {
      crearComponente();

      expect(component.form.get('role')?.value).toBe('guest');
    });

    it('debe iniciar con los términos sin aceptar', () => {
      crearComponente();

      expect(component.form.get('terms')?.value).toBe(false);
    });

    it('debe iniciar con el formulario inválido', () => {
      crearComponente();

      expect(component.form.invalid).toBe(true);
    });
  });

  describe('Validación de datos', () => {
    it('debe aceptar un formulario completo', () => {
      crearComponente();
      llenarFormulario();

      expect(component.form.valid).toBe(true);
    });

    it('debe rechazar un nombre vacío', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ name: '' });

      expect(component.form.get('name')?.invalid).toBe(true);
    });

    it('debe rechazar nombres menores de tres caracteres', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ name: 'Al' });

      expect(component.form.get('name')?.invalid).toBe(true);
    });

    it('debe aceptar nombres de tres caracteres', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ name: 'Ana' });

      expect(component.form.get('name')?.valid).toBe(true);
    });

    it('debe rechazar nombres mayores de 150 caracteres', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ name: 'A'.repeat(151) });

      expect(component.form.get('name')?.invalid).toBe(true);
    });

    it('debe rechazar un correo vacío', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ email: '' });

      expect(component.form.get('email')?.invalid).toBe(true);
    });

    it('debe rechazar un correo sin arroba', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ email: 'natalycorreo.com' });

      expect(component.form.get('email')?.invalid).toBe(true);
    });

    it('debe rechazar correos mayores de 150 caracteres', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({
        email: `${'a'.repeat(145)}@correo.com`
      });

      expect(component.form.get('email')?.invalid).toBe(true);
    });

    it('debe rechazar una contraseña vacía', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ password: '' });

      expect(component.form.get('password')?.invalid).toBe(true);
    });

    it('debe rechazar contraseñas menores de ocho caracteres', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({
        password: '1234567',
        confirmPassword: '1234567'
      });

      expect(component.form.get('password')?.invalid).toBe(true);
    });

    it('debe aceptar contraseñas de ocho caracteres', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({
        password: '12345678',
        confirmPassword: '12345678'
      });

      expect(component.form.get('password')?.valid).toBe(true);
    });

    it('debe rechazar contraseñas mayores de 72 caracteres', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({
        password: 'A'.repeat(73),
        confirmPassword: 'A'.repeat(73)
      });

      expect(component.form.get('password')?.invalid).toBe(true);
    });

    it('debe rechazar la confirmación de contraseña vacía', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ confirmPassword: '' });

      expect(component.form.get('confirmPassword')?.invalid).toBe(true);
    });

    it('debe impedir el registro si las contraseñas no coinciden', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({
        confirmPassword: 'OtraClave123'
      });

      component.register();

      expect(registroReal).not.toHaveBeenCalled();
    });

    it('debe rechazar el formulario sin aceptar términos', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ terms: false });

      expect(component.form.invalid).toBe(true);
    });

    it('debe aceptar el formulario al marcar los términos', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ terms: false });

      component.form.patchValue({ terms: true });

      expect(component.form.valid).toBe(true);
    });
  });

  describe('Envío del formulario', () => {
    it('debe marcar el formulario como enviado', () => {
      crearComponente();

      component.register();

      expect(component.submitted).toBe(true);
    });

    it('debe marcar todos los campos como tocados', () => {
      crearComponente();

      component.register();

      expect(component.form.get('name')?.touched).toBe(true);
      expect(component.form.get('email')?.touched).toBe(true);
      expect(component.form.get('password')?.touched).toBe(true);
      expect(component.form.get('terms')?.touched).toBe(true);
    });

    it('no debe llamar al backend con datos inválidos', () => {
      crearComponente();

      component.register();

      expect(registroReal).not.toHaveBeenCalled();
    });

    it('debe enviar correctamente los datos del huésped', () => {
      crearComponente();
      llenarFormulario();

      component.register();

      expect(registroReal).toHaveBeenCalledWith(
        'Nataly Manrique',
        'nataly@correo.com',
        'Clave12345',
        'guest'
      );
    });

    it('debe enviar correctamente el rol de anfitrión', () => {
      crearComponente();
      llenarFormulario('host');

      component.register();

      expect(registroReal).toHaveBeenCalledWith(
        'Nataly Manrique',
        'nataly@correo.com',
        'Clave12345',
        'host'
      );
    });

    it('debe activar el estado de envío mientras espera respuesta', () => {
      const pendiente = new Subject<any>();
      registroReal.mockReturnValue(pendiente.asObservable());

      crearComponente();
      llenarFormulario();

      component.register();

      expect(component.enviando()).toBe(true);

      pendiente.next({ role: 'guest' });
      pendiente.complete();
    });

    it('debe finalizar el estado de envío tras registrarse', () => {
      crearComponente();
      llenarFormulario();

      component.register();

      expect(component.enviando()).toBe(false);
    });

    it('debe redirigir al huésped a sus reservas', () => {
      crearComponente();
      llenarFormulario();

      component.register();

      expect(navigateByUrl).toHaveBeenCalledWith('/mis-reservas');
    });

    it('debe redirigir al anfitrión a su panel', () => {
      registroReal.mockReturnValue(
        of({ id: 'usuario-002', role: 'host' })
      );

      crearComponente();
      llenarFormulario('host');

      component.register();

      expect(navigateByUrl).toHaveBeenCalledWith('/anfitrion');
    });

    it('debe limpiar un error anterior antes de registrarse', () => {
      crearComponente();
      llenarFormulario();
      component.authError.set('Error anterior');

      component.register();

      expect(component.authError()).toBe('');
    });
  });

  describe('Errores del servidor', () => {
    it('debe mostrar error de conexión', () => {
      registroReal.mockReturnValue(
        throwError(() => crearError(0))
      );

      crearComponente();
      llenarFormulario();
      component.register();

      expect(component.authError()).toContain(
        'No se pudo conectar con el servidor'
      );
    });

    it('debe informar cuando el correo ya está registrado', () => {
      registroReal.mockReturnValue(
        throwError(() => crearError(400))
      );

      crearComponente();
      llenarFormulario();
      component.register();

      expect(component.authError()).toBe(
        'Ya existe un usuario registrado con ese correo.'
      );
    });

    it('debe mostrar el mensaje de validación para error 403', () => {
      registroReal.mockReturnValue(
        throwError(() => crearError(403))
      );

      crearComponente();
      llenarFormulario();
      component.register();

      expect(component.authError()).toContain(
        'Los datos no son válidos'
      );
    });

    it('debe mostrar error general del servidor', () => {
      registroReal.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      llenarFormulario();
      component.register();

      expect(component.authError()).toBe(
        'No se pudo crear la cuenta. Intenta de nuevo.'
      );
    });

    it('debe finalizar el envío después de un error', () => {
      registroReal.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      llenarFormulario();
      component.register();

      expect(component.enviando()).toBe(false);
    });

    it('no debe navegar si el registro falla', () => {
      registroReal.mockReturnValue(
        throwError(() => crearError(400))
      );

      crearComponente();
      llenarFormulario();
      component.register();

      expect(navigateByUrl).not.toHaveBeenCalled();
    });
  });
});
