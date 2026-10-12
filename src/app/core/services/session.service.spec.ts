
 // @vitest-environment jsdom
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { SessionService, PerfilBack } from './session.service';
import { API_URL } from '../config/api.config';
import { User, UserRole } from '../models/marketplace.models';

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

describe('SessionService', () => {
  let service: SessionService;

  const post = vi.fn();
  const get = vi.fn();
  const put = vi.fn();
  const patch = vi.fn();

  const httpSimulado = { post, get, put, patch };

  const respuestaLogin = {
    token: 'token-de-prueba',
    expiraEnSegundos: 3600,
    usuarioId: 'uuid-usuario-1',
    nombre: 'Usuario de prueba',
    rol: 'HUESPED'
  };

  const perfil: PerfilBack = {
    id: 'uuid-usuario-1',
    nombre: 'Usuario de prueba',
    correo: 'usuario@test.com',
    rol: 'HUESPED',
    activo: true,
    creadoEn: '2026-01-01',
    mfaHabilitado: false
  };

  const registrarUsuario = (
    email: string,
    role: UserRole = 'guest',
    name = 'Usuario nuevo'
  ): User => {
    return service.register(
      name,
      email,
      role,
      'contrasena123',
      '3001234567'
    );
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    localStorage.clear();

    post.mockReturnValue(of('OK'));
    get.mockReturnValue(of(perfil));
    put.mockReturnValue(of('Actualizado'));
    patch.mockReturnValue(of('OK'));

    TestBed.configureTestingModule({
      providers: [
        SessionService,
        { provide: HttpClient, useValue: httpSimulado }
      ]
    });

    service = TestBed.inject(SessionService);
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  describe('Inicializacion', () => {
    it('debe crear el servicio', () => {
      expect(service).toBeTruthy();
    });

    it('debe iniciar sin usuario autenticado', () => {
      expect(service.currentUser()).toBeNull();
    });

    it('debe iniciar con autenticacion falsa', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('debe iniciar sin rol', () => {
      expect(service.role()).toBeNull();
    });

    it('debe disponer de una lista de usuarios', () => {
      expect(Array.isArray(service.users())).toBe(true);
    });
  });

  describe('Registro local', () => {
    it('debe registrar un huesped', () => {
      const usuario = registrarUsuario('nuevo1@test.com');

      expect(usuario.role).toBe('guest');
      expect(usuario.email).toBe('nuevo1@test.com');
    });

    it('debe registrar un anfitrion', () => {
      const usuario = registrarUsuario('nuevo2@test.com', 'host');

      expect(usuario.role).toBe('host');
    });

    it('debe guardar el usuario registrado', () => {
      const usuario = registrarUsuario('nuevo3@test.com');

      expect(
        service.users().some(item => item.id === usuario.id)
      ).toBe(true);
    });

    it('debe autenticar al usuario despues del registro', () => {
      const usuario = registrarUsuario('nuevo4@test.com');

      expect(service.currentUser()?.id).toBe(usuario.id);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('debe normalizar el correo electronico', () => {
      const usuario = registrarUsuario('  NUEVO5@TEST.COM  ');

      expect(usuario.email).toBe('nuevo5@test.com');
    });

    it('debe eliminar espacios del nombre', () => {
      const usuario = registrarUsuario(
        'nuevo6@test.com',
        'guest',
        '  Nombre de prueba  '
      );

      expect(usuario.name).toBe('Nombre de prueba');
    });

    it('debe rechazar nombres vacios', () => {
      expect(() => registrarUsuario(
        'nuevo7@test.com',
        'guest',
        '   '
      )).toThrow('El correo ya está registrado o los datos no son válidos.');
    });

    it('debe rechazar contrasenas cortas', () => {
      expect(() => service.register(
        'Usuario',
        'nuevo8@test.com',
        'guest',
        '1234567',
        '3001234567'
      )).toThrow('El correo ya está registrado o los datos no son válidos.');
    });

    it('debe rechazar correos duplicados', () => {
      registrarUsuario('duplicado@test.com');

      expect(() => registrarUsuario(
        'DUPLICADO@TEST.COM'
      )).toThrow('El correo ya está registrado o los datos no son válidos.');
    });

    it('debe rechazar el rol administrador en el registro', () => {
      expect(() => service.register(
        'Administrador',
        'adminnuevo@test.com',
        'admin',
        'contrasena123',
        ''
      )).toThrow('El correo ya está registrado o los datos no son válidos.');
    });

    it('debe guardar el telefono sin espacios adicionales', () => {
      const usuario = service.register(
        'Usuario',
        'telefono@test.com',
        'guest',
        'contrasena123',
        '  3001234567  '
      );

      expect(usuario.phone).toBe('3001234567');
    });

    it('debe registrar el usuario como activo', () => {
      const usuario = registrarUsuario('activo@test.com');

      expect(usuario.active).toBe(true);
    });
  });

  describe('Autenticacion local', () => {
    it('debe encontrar credenciales validas', () => {
      registrarUsuario('login1@test.com');

      const usuario = service.credentials(
        'login1@test.com',
        'guest',
        'contrasena123'
      );

      expect(usuario).toBeDefined();
    });

    it('debe aceptar correo sin distinguir mayusculas', () => {
      registrarUsuario('login2@test.com');

      expect(service.credentials(
        '  LOGIN2@TEST.COM  ',
        'guest',
        'contrasena123'
      )).toBeDefined();
    });

    it('debe rechazar una contrasena incorrecta', () => {
      registrarUsuario('login3@test.com');

      expect(service.credentials(
        'login3@test.com',
        'guest',
        'incorrecta'
      )).toBeUndefined();
    });

    it('debe rechazar un rol incorrecto', () => {
      registrarUsuario('login4@test.com');

      expect(service.credentials(
        'login4@test.com',
        'host',
        'contrasena123'
      )).toBeUndefined();
    });

    it('debe iniciar sesion con credenciales validas', () => {
      registrarUsuario('login5@test.com');
      service.logout();

      const usuario = service.login(
        'login5@test.com',
        'guest',
        'contrasena123'
      );

      expect(service.currentUser()?.id).toBe(usuario.id);
    });

    it('debe rechazar un inicio de sesion invalido', () => {
      expect(() => service.login(
        'inexistente@test.com',
        'guest',
        'incorrecta'
      )).toThrow(
        'Error de autenticación. Revisa el correo, la contraseña y el rol.'
      );
    });

    it('debe actualizar el rol despues del inicio de sesion', () => {
      registrarUsuario('anfitrion@test.com', 'host');

      expect(service.role()).toBe('host');
    });

    it('debe cerrar sesion correctamente', () => {
      registrarUsuario('salida@test.com');

      service.logout();

      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('debe limpiar los datos persistidos al cerrar sesion', () => {
      localStorage.setItem('casitago_token', 'token');
      localStorage.setItem('casitago_usuario', '{}');
      localStorage.setItem('casitago_expira', '9999999999999');

      service.logout();

      expect(localStorage.getItem('casitago_token')).toBeNull();
      expect(localStorage.getItem('casitago_usuario')).toBeNull();
      expect(localStorage.getItem('casitago_expira')).toBeNull();
    });
  });

  describe('Autenticacion multifactor local', () => {
    it('debe preparar MFA con credenciales validas', () => {
      registrarUsuario('mfa1@test.com');
      service.logout();

      service.prepareMfa(
        'mfa1@test.com',
        'guest',
        'contrasena123'
      );

      expect(service.completeMfa()).toBe(true);
    });

    it('debe autenticar al completar MFA', () => {
      const usuario = registrarUsuario('mfa2@test.com');
      service.logout();

      service.prepareMfa(
        'mfa2@test.com',
        'guest',
        'contrasena123'
      );

      service.completeMfa();

      expect(service.currentUser()?.id).toBe(usuario.id);
    });

    it('debe rechazar MFA sin preparacion', () => {
      expect(service.completeMfa()).toBe(false);
    });

    it('debe rechazar MFA con credenciales incorrectas', () => {
      service.prepareMfa(
        'inexistente@test.com',
        'guest',
        'incorrecta'
      );

      expect(service.completeMfa()).toBe(false);
    });

    it('no debe permitir completar MFA dos veces', () => {
      registrarUsuario('mfa3@test.com');
      service.logout();

      service.prepareMfa(
        'mfa3@test.com',
        'guest',
        'contrasena123'
      );

      expect(service.completeMfa()).toBe(true);
      expect(service.completeMfa()).toBe(false);
    });

    it('debe cancelar MFA pendiente al cerrar sesion', () => {
      registrarUsuario('mfa4@test.com');

      service.prepareMfa(
        'mfa4@test.com',
        'guest',
        'contrasena123'
      );

      service.logout();

      expect(service.completeMfa()).toBe(false);
    });
  });

  describe('Login real y almacenamiento', () => {
    beforeEach(() => {
      post.mockReturnValue(of(respuestaLogin));
    });

    it('debe llamar al endpoint de login', () => {
      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      expect(post).toHaveBeenCalledWith(
        `${API_URL}/api/auth/login`,
        {
          correo: 'usuario@test.com',
          contrasena: 'contrasena123'
        }
      );
    });

    it('debe incluir el codigo MFA cuando se proporciona', () => {
      service.loginReal(
        'usuario@test.com',
        'contrasena123',
        '123456'
      ).subscribe();

      expect(post).toHaveBeenCalledWith(
        `${API_URL}/api/auth/login`,
        {
          correo: 'usuario@test.com',
          contrasena: 'contrasena123',
          codigoMfa: '123456'
        }
      );
    });

    it('debe almacenar el token', () => {
      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      expect(localStorage.getItem('casitago_token')).toBe(
        'token-de-prueba'
      );
    });

    it('debe almacenar la fecha de expiracion', () => {
      const antes = Date.now();

      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      const expiracion = Number(
        localStorage.getItem('casitago_expira')
      );

      expect(expiracion).toBeGreaterThanOrEqual(antes + 3600000);
      expect(expiracion).toBeLessThanOrEqual(Date.now() + 3600000);
    });

    it('debe autenticar al usuario recibido del backend', () => {
      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()?.uuid).toBe('uuid-usuario-1');
    });

    it('debe convertir el rol HUESPED', () => {
      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      expect(service.role()).toBe('guest');
    });

    it('debe convertir el rol ANFITRION', () => {
      post.mockReturnValue(of({
        ...respuestaLogin,
        rol: 'ANFITRION'
      }));

      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      expect(service.role()).toBe('host');
    });

    it('debe convertir el rol ADMINISTRADOR', () => {
      post.mockReturnValue(of({
        ...respuestaLogin,
        rol: 'ADMINISTRADOR'
      }));

      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      expect(service.role()).toBe('admin');
    });

    it('debe normalizar el correo en el usuario autenticado', () => {
      service.loginReal(
        '  USUARIO@TEST.COM  ',
        'contrasena123'
      ).subscribe();

      expect(service.currentUser()?.email).toBe('usuario@test.com');
    });

    it('no debe autenticar si el backend devuelve un error', () => {
      post.mockReturnValue(
        throwError(() => new Error('Credenciales invalidas'))
      );

      service.loginReal(
        'usuario@test.com',
        'incorrecta'
      ).subscribe({
        error: () => {}
      });

      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('casitago_token')).toBeNull();
    });
  });

  describe('Registro real', () => {
    it('debe registrar un huesped en el backend', () => {
      post
        .mockReturnValueOnce(of('Registrado'))
        .mockReturnValueOnce(of(respuestaLogin));

      service.registroReal(
        'Usuario',
        'usuario@test.com',
        'contrasena123',
        'guest'
      ).subscribe();

      expect(post).toHaveBeenNthCalledWith(
        1,
        `${API_URL}/api/auth/registro`,
        {
          nombre: 'Usuario',
          correo: 'usuario@test.com',
          contrasena: 'contrasena123',
          rol: 'HUESPED'
        },
        { responseType: 'text' }
      );
    });

    it('debe registrar un anfitrion en el backend', () => {
      post
        .mockReturnValueOnce(of('Registrado'))
        .mockReturnValueOnce(of({
          ...respuestaLogin,
          rol: 'ANFITRION'
        }));

      service.registroReal(
        'Anfitrion',
        'host@test.com',
        'contrasena123',
        'host'
      ).subscribe();

      expect(post).toHaveBeenNthCalledWith(
        1,
        `${API_URL}/api/auth/registro`,
        {
          nombre: 'Anfitrion',
          correo: 'host@test.com',
          contrasena: 'contrasena123',
          rol: 'ANFITRION'
        },
        { responseType: 'text' }
      );
    });

    it('debe iniciar sesion despues del registro real', () => {
      post
        .mockReturnValueOnce(of('Registrado'))
        .mockReturnValueOnce(of(respuestaLogin));

      service.registroReal(
        'Usuario',
        'usuario@test.com',
        'contrasena123',
        'guest'
      ).subscribe();

      expect(service.isAuthenticated()).toBe(true);
      expect(post).toHaveBeenCalledTimes(2);
    });

    it('no debe iniciar sesion si el registro falla', () => {
      post.mockReturnValue(
        throwError(() => new Error('Registro rechazado'))
      );

      service.registroReal(
        'Usuario',
        'usuario@test.com',
        'contrasena123',
        'guest'
      ).subscribe({
        error: () => {}
      });

      expect(service.isAuthenticated()).toBe(false);
      expect(post).toHaveBeenCalledTimes(1);
    });
  });

  describe('Recuperacion de contrasena', () => {
    it('debe solicitar la recuperacion', () => {
      service.solicitarRecuperacion(
        'usuario@test.com'
      ).subscribe();

      expect(post).toHaveBeenCalledWith(
        `${API_URL}/api/auth/recuperacion/solicitar`,
        { correo: 'usuario@test.com' },
        { responseType: 'text' }
      );
    });

    it('debe confirmar la recuperacion', () => {
      service.confirmarRecuperacion(
        'usuario@test.com',
        '123456',
        'nuevaContrasena123'
      ).subscribe();

      expect(post).toHaveBeenCalledWith(
        `${API_URL}/api/auth/recuperacion/confirmar`,
        {
          correo: 'usuario@test.com',
          codigo: '123456',
          nuevaContrasena: 'nuevaContrasena123'
        },
        { responseType: 'text' }
      );
    });
  });

  describe('Perfil de usuario', () => {
    it('debe consultar el perfil del backend', () => {
      service.obtenerPerfil().subscribe();

      expect(get).toHaveBeenCalledWith(
        `${API_URL}/api/auth/perfil`
      );
    });

    it('debe devolver el perfil recibido', () => {
      let resultado: PerfilBack | undefined;

      service.obtenerPerfil().subscribe(
        valor => resultado = valor
      );

      expect(resultado).toEqual(perfil);
    });

    it('debe actualizar el perfil en el backend', () => {
      service.actualizarPerfilReal(
        'Nuevo nombre',
        'nuevo@test.com'
      ).subscribe();

      expect(put).toHaveBeenCalledWith(
        `${API_URL}/api/auth/perfil`,
        {
          nombre: 'Nuevo nombre',
          correo: 'nuevo@test.com'
        },
        { responseType: 'text' }
      );
    });

    it('debe actualizar el usuario local tras actualizar el perfil real', () => {
      post.mockReturnValue(of(respuestaLogin));

      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      service.actualizarPerfilReal(
        '  Nombre actualizado  ',
        '  NUEVO@TEST.COM  '
      ).subscribe();

      expect(service.currentUser()?.name).toBe('Nombre actualizado');
      expect(service.currentUser()?.email).toBe('nuevo@test.com');
    });

    it('debe guardar el perfil actualizado en localStorage', () => {
      post.mockReturnValue(of(respuestaLogin));

      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      service.actualizarPerfilReal(
        'Nombre actualizado',
        'nuevo@test.com'
      ).subscribe();

      const guardado = JSON.parse(
        localStorage.getItem('casitago_usuario')!
      ) as User;

      expect(guardado.name).toBe('Nombre actualizado');
      expect(guardado.email).toBe('nuevo@test.com');
    });

    it('debe cambiar el estado de la cuenta', () => {
      service.cambiarEstadoCuenta(false).subscribe();

      expect(patch).toHaveBeenCalledWith(
        `${API_URL}/api/auth/perfil/estado`,
        { activo: false },
        { responseType: 'text' }
      );
    });

    it('debe enviar la configuracion MFA al backend', () => {
      service.cambiarMfa(
        true,
        'contrasena123'
      ).subscribe();

      expect(patch).toHaveBeenCalledWith(
        `${API_URL}/api/auth/mfa`,
        {
          habilitado: true,
          contrasena: 'contrasena123'
        },
        { responseType: 'text' }
      );
    });

    it('debe actualizar los datos locales del perfil', () => {
      const usuario = registrarUsuario('perfil1@test.com');

      service.updateProfile({
        name: '  Nombre nuevo  ',
        phone: '  3112223344  '
      });

      const actualizado = service.users().find(
        item => item.id === usuario.id
      );

      expect(actualizado?.name).toBe('Nombre nuevo');
      expect(actualizado?.phone).toBe('3112223344');
    });

    it('debe rechazar un correo duplicado al actualizar', () => {
      const reloj = vi.spyOn(Date, 'now');

      try {
        reloj.mockReturnValue(100001);
        const primerUsuario = registrarUsuario('primero@test.com');

        reloj.mockReturnValue(100002);
        const segundoUsuario = registrarUsuario('segundo@test.com');

        expect(primerUsuario.id).not.toBe(segundoUsuario.id);
        expect(service.currentUser()?.id).toBe(segundoUsuario.id);

        expect(() => {
          service.updateProfile({
            email: 'PRIMERO@TEST.COM'
          });
        }).toThrow('Este correo ya está registrado.');

        expect(
          service.users().find(
            usuario => usuario.id === segundoUsuario.id
          )?.email
        ).toBe('segundo@test.com');
      } finally {
        reloj.mockRestore();
      }
    });

    it('no debe actualizar el perfil sin sesion', () => {
      registrarUsuario('perfil2@test.com');
      service.logout();

      expect(() => service.updateProfile({
        name: 'Cambio'
      })).not.toThrow();
    });
  });

  describe('Administracion de usuarios', () => {
    it('no debe permitir al huesped cambiar estados', () => {
      const usuario = registrarUsuario('estado1@test.com');

      service.toggleUser(usuario.id);

      expect(
        service.users().find(item => item.id === usuario.id)?.active
      ).toBe(true);
    });

    it('no debe permitir al anfitrion cambiar estados', () => {
      const usuario = registrarUsuario(
        'estado2@test.com',
        'host'
      );

      service.toggleUser(usuario.id);

      expect(
        service.users().find(item => item.id === usuario.id)?.active
      ).toBe(true);
    });

    it('debe impedir que el administrador se desactive a si mismo', () => {
      post.mockReturnValue(of({
        ...respuestaLogin,
        rol: 'ADMINISTRADOR'
      }));

      service.loginReal(
        'admin@test.com',
        'contrasena123'
      ).subscribe();

      const actual = service.currentUser();

      service.toggleUser(actual!.id);

      expect(service.isAuthenticated()).toBe(true);
    });

    it('debe permitir al administrador desactivar usuarios', () => {
      const usuario = registrarUsuario('estado3@test.com');

      post.mockReturnValue(of({
        ...respuestaLogin,
        rol: 'ADMINISTRADOR'
      }));

      service.loginReal(
        'admin@test.com',
        'contrasena123'
      ).subscribe();

      service.toggleUser(usuario.id);

      expect(
        service.users().find(item => item.id === usuario.id)?.active
      ).toBe(false);
    });

    it('debe permitir al administrador reactivar usuarios', () => {
      const usuario = registrarUsuario('estado4@test.com');

      post.mockReturnValue(of({
        ...respuestaLogin,
        rol: 'ADMINISTRADOR'
      }));

      service.loginReal(
        'admin@test.com',
        'contrasena123'
      ).subscribe();

      service.toggleUser(usuario.id);
      service.toggleUser(usuario.id);

      expect(
        service.users().find(item => item.id === usuario.id)?.active
      ).toBe(true);
    });
  });

  describe('Persistencia de sesion', () => {
    it('debe recuperar una sesion valida guardada', () => {
      const usuario: User = {
        id: 10,
        uuid: 'uuid-guardado',
        name: 'Usuario guardado',
        email: 'guardado@test.com',
        phone: '',
        role: 'guest',
        active: true,
        joinedAt: '2026-01-01'
      };

      localStorage.setItem('casitago_token', 'token-valido');
      localStorage.setItem('casitago_usuario', JSON.stringify(usuario));
      localStorage.setItem(
        'casitago_expira',
        String(Date.now() + 3600000)
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          SessionService,
          { provide: HttpClient, useValue: httpSimulado }
        ]
      });

      const nuevaSesion = TestBed.inject(SessionService);

      expect(nuevaSesion.currentUser()?.uuid).toBe('uuid-guardado');
      expect(nuevaSesion.isAuthenticated()).toBe(true);
    });

    it('debe rechazar una sesion vencida', () => {
      localStorage.setItem('casitago_token', 'token-vencido');
      localStorage.setItem(
        'casitago_usuario',
        JSON.stringify({ id: 10, role: 'guest' })
      );
      localStorage.setItem(
        'casitago_expira',
        String(Date.now() - 1000)
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          SessionService,
          { provide: HttpClient, useValue: httpSimulado }
        ]
      });

      const nuevaSesion = TestBed.inject(SessionService);

      expect(nuevaSesion.currentUser()).toBeNull();
      expect(localStorage.getItem('casitago_token')).toBeNull();
    });

    it('debe rechazar datos de sesion invalidos', () => {
      localStorage.setItem('casitago_token', 'token');
      localStorage.setItem('casitago_usuario', '{invalido');
      localStorage.setItem(
        'casitago_expira',
        String(Date.now() + 3600000)
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          SessionService,
          { provide: HttpClient, useValue: httpSimulado }
        ]
      });

      const nuevaSesion = TestBed.inject(SessionService);

      expect(nuevaSesion.currentUser()).toBeNull();
      expect(localStorage.getItem('casitago_usuario')).toBeNull();
    });

    it('debe rechazar una sesion sin token', () => {
      localStorage.setItem(
        'casitago_usuario',
        JSON.stringify({ id: 10, role: 'guest' })
      );
      localStorage.setItem(
        'casitago_expira',
        String(Date.now() + 3600000)
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          SessionService,
          { provide: HttpClient, useValue: httpSimulado }
        ]
      });

      const nuevaSesion = TestBed.inject(SessionService);

      expect(nuevaSesion.currentUser()).toBeNull();
    });
  });
});
