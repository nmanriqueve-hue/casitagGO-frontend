
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

import { LoginComponent } from './login.component';
import { SessionService } from '../../core/services/session.service';
import { MfaService } from '../../core/services/mfa.service';

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

describe('LoginComponent', () => {
  let component: LoginComponent;

  let loginReal: ReturnType<typeof vi.fn>;
  let esPeticionDeCodigo: ReturnType<typeof vi.fn>;
  let begin: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  let returnUrl: string | null;
  let usuario: any;

  const crearError = (
    status: number,
    error: unknown = null
  ) => new HttpErrorResponse({ status, error });

  const crearComponente = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SessionService,
          useValue: { loginReal }
        },
        {
          provide: MfaService,
          useValue: { esPeticionDeCodigo, begin }
        },
        {
          provide: Router,
          useValue: { navigate, navigateByUrl }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(
                returnUrl ? { returnUrl } : {}
              )
            }
          }
        }
      ]
    });

    component = TestBed.runInInjectionContext(
      () => new LoginComponent()
    );
  };

  const llenarFormulario = () => {
    component.form.patchValue({
      email: 'usuario@correo.com',
      password: 'Clave12345'
    });
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    returnUrl = null;
    usuario = {
      uuid: 'usuario-001',
      role: 'guest',
      email: 'usuario@correo.com'
    };

    loginReal = vi.fn().mockReturnValue(of(usuario));
    esPeticionDeCodigo = vi.fn().mockReturnValue(false);
    begin = vi.fn();
    navigate = vi.fn().mockResolvedValue(true);
    navigateByUrl = vi.fn().mockResolvedValue(true);
  });

  describe('Inicialización', () => {
    it('debe crear el componente', () => {
      crearComponente();

      expect(component).toBeTruthy();
    });

    it('debe iniciar sin haber enviado el formulario', () => {
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

    it('debe iniciar con el correo vacío', () => {
      crearComponente();

      expect(component.form.get('email')?.value).toBe('');
    });

    it('debe iniciar con la contraseña vacía', () => {
      crearComponente();

      expect(component.form.get('password')?.value).toBe('');
    });

    it('debe iniciar con el formulario inválido', () => {
      crearComponente();

      expect(component.form.invalid).toBe(true);
    });
  });

  describe('Validación del formulario', () => {
    it('debe aceptar un formulario válido', () => {
      crearComponente();
      llenarFormulario();

      expect(component.form.valid).toBe(true);
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
      component.form.patchValue({ email: 'usuariocorreo.com' });

      expect(component.form.get('email')?.invalid).toBe(true);
    });

    it('debe rechazar un correo sin dominio válido', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ email: 'usuario@' });

      expect(component.form.get('email')?.invalid).toBe(true);
    });

    it('debe rechazar una contraseña vacía', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ password: '' });

      expect(component.form.get('password')?.invalid).toBe(true);
    });

    it('debe rechazar una contraseña menor de seis caracteres', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ password: '12345' });

      expect(component.form.get('password')?.invalid).toBe(true);
    });

    it('debe aceptar una contraseña de seis caracteres', () => {
      crearComponente();
      llenarFormulario();
      component.form.patchValue({ password: '123456' });

      expect(component.form.get('password')?.valid).toBe(true);
    });

    it('no debe llamar al backend con formulario inválido', () => {
      crearComponente();

      component.login();

      expect(loginReal).not.toHaveBeenCalled();
    });

    it('debe marcar el formulario como enviado', () => {
      crearComponente();

      component.login();

      expect(component.submitted).toBe(true);
    });

    it('debe marcar los campos inválidos como tocados', () => {
      crearComponente();

      component.login();

      expect(component.form.get('email')?.touched).toBe(true);
      expect(component.form.get('password')?.touched).toBe(true);
    });
  });

  describe('Inicio de sesión exitoso', () => {
    it('debe enviar las credenciales correctas', () => {
      crearComponente();
      llenarFormulario();

      component.login();

      expect(loginReal).toHaveBeenCalledWith(
        'usuario@correo.com',
        'Clave12345'
      );
    });

    it('debe iniciar la solicitud de autenticación', () => {
      const pendiente = new Subject<any>();
      loginReal.mockReturnValue(pendiente.asObservable());

      crearComponente();
      llenarFormulario();

      component.login();

      expect(component.enviando()).toBe(true);

      pendiente.next(usuario);
      pendiente.complete();
    });

    it('debe finalizar el procesamiento cuando el login es exitoso', () => {
      crearComponente();
      llenarFormulario();

      component.login();

      expect(component.enviando()).toBe(false);
    });

    it('debe enviar al huésped a mis reservas', () => {
      crearComponente();
      llenarFormulario();

      component.login();

      expect(navigateByUrl).toHaveBeenCalledWith('/mis-reservas');
    });

    it('debe enviar al anfitrión a su panel', () => {
      usuario.role = 'host';
      crearComponente();
      llenarFormulario();

      component.login();

      expect(navigateByUrl).toHaveBeenCalledWith('/anfitrion');
    });

    it('debe enviar al administrador a administración', () => {
      usuario.role = 'admin';
      crearComponente();
      llenarFormulario();

      component.login();

      expect(navigateByUrl).toHaveBeenCalledWith('/administracion');
    });

    it('debe respetar returnUrl para un huésped', () => {
      returnUrl = '/favoritos';
      crearComponente();
      llenarFormulario();

      component.login();

      expect(navigateByUrl).toHaveBeenCalledWith('/favoritos');
    });

    it('debe priorizar el panel del anfitrión sobre returnUrl', () => {
      returnUrl = '/favoritos';
      usuario.role = 'host';

      crearComponente();
      llenarFormulario();
      component.login();

      expect(navigateByUrl).toHaveBeenCalledWith('/anfitrion');
    });

    it('debe priorizar administración sobre returnUrl', () => {
      returnUrl = '/favoritos';
      usuario.role = 'admin';

      crearComponente();
      llenarFormulario();
      component.login();

      expect(navigateByUrl).toHaveBeenCalledWith('/administracion');
    });

    it('debe limpiar errores anteriores antes de autenticar', () => {
      crearComponente();
      llenarFormulario();
      component.authError.set('Error anterior');

      component.login();

      expect(component.authError()).toBe('');
    });

    it('no debe solicitar MFA cuando el login es exitoso', () => {
      crearComponente();
      llenarFormulario();

      component.login();

      expect(begin).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalledWith(['/verificar-acceso']);
    });
  });

  describe('Autenticación multifactor MFA', () => {
    it('debe detectar una solicitud de código MFA', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(401))
      );
      esPeticionDeCodigo.mockReturnValue(true);

      crearComponente();
      llenarFormulario();
      component.login();

      expect(esPeticionDeCodigo).toHaveBeenCalled();
    });

    it('debe iniciar el proceso MFA con las credenciales', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(401))
      );
      esPeticionDeCodigo.mockReturnValue(true);

      crearComponente();
      llenarFormulario();
      component.login();

      expect(begin).toHaveBeenCalledWith(
        'usuario@correo.com',
        'Clave12345',
        null
      );
    });

    it('debe conservar returnUrl durante MFA', () => {
      returnUrl = '/favoritos';
      loginReal.mockReturnValue(
        throwError(() => crearError(401))
      );
      esPeticionDeCodigo.mockReturnValue(true);

      crearComponente();
      llenarFormulario();
      component.login();

      expect(begin).toHaveBeenCalledWith(
        'usuario@correo.com',
        'Clave12345',
        '/favoritos'
      );
    });

    it('debe navegar a la verificación MFA', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(401))
      );
      esPeticionDeCodigo.mockReturnValue(true);

      crearComponente();
      llenarFormulario();
      component.login();

      expect(navigate).toHaveBeenCalledWith(['/verificar-acceso']);
    });

    it('no debe mostrar error de contraseña si requiere MFA', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(401))
      );
      esPeticionDeCodigo.mockReturnValue(true);

      crearComponente();
      llenarFormulario();
      component.login();

      expect(component.authError()).toBe('');
    });
  });

  describe('Errores de autenticación', () => {
    it('debe mostrar error de conexión', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(0))
      );

      crearComponente();
      llenarFormulario();
      component.login();

      expect(component.authError()).toContain(
        'No se pudo conectar con el servidor'
      );
    });

    it('debe mostrar el mensaje del backend para error 400', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(400, 'Correo no registrado'))
      );

      crearComponente();
      llenarFormulario();
      component.login();

      expect(component.authError()).toBe('Correo no registrado');
    });

    it('debe mostrar error general para credenciales incorrectas', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(401))
      );

      crearComponente();
      llenarFormulario();
      component.login();

      expect(component.authError()).toContain(
        'No se pudo iniciar sesión'
      );
    });

    it('debe mostrar error general del servidor', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      llenarFormulario();
      component.login();

      expect(component.authError()).toContain(
        'No se pudo iniciar sesión'
      );
    });

    it('debe finalizar el procesamiento después de un error', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(500))
      );

      crearComponente();
      llenarFormulario();
      component.login();

      expect(component.enviando()).toBe(false);
    });

    it('no debe navegar después de un error de autenticación', () => {
      loginReal.mockReturnValue(
        throwError(() => crearError(401))
      );

      crearComponente();
      llenarFormulario();
      component.login();

      expect(navigateByUrl).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('debe permitir reintentar después de un error', () => {
      loginReal
        .mockReturnValueOnce(
          throwError(() => crearError(401))
        )
        .mockReturnValueOnce(of(usuario));

      crearComponente();
      llenarFormulario();

      component.login();
      expect(component.authError()).not.toBe('');

      component.login();

      expect(loginReal).toHaveBeenCalledTimes(2);
      expect(component.authError()).toBe('');
      expect(navigateByUrl).toHaveBeenCalledWith('/mis-reservas');
    });
  });
});
