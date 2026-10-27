import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { API_URL } from '../config/api.config';
import { User, UserRole } from '../models/marketplace.models';
import { USERS } from './mock-data';

interface RespuestaLogin {
  token: string;
  expiraEnSegundos: number;
  usuarioId: string;
  nombre: string;
  rol: string;
}

export interface PerfilBack {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  creadoEn: string;
  mfaHabilitado: boolean;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  readonly users = signal<User[]>(USERS.map(u => ({ ...u })));
  private readonly currentUserState = signal<User | null>(this.leerSesionGuardada());
  readonly currentUser = computed(() => this.currentUserState());
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly role = computed(() => this.currentUser()?.role ?? null);

  loginReal(correo: string, contrasena: string, codigoMfa?: string): Observable<User> {
    const cuerpo: { correo: string; contrasena: string; codigoMfa?: string } = { correo, contrasena };
    if (codigoMfa) { cuerpo.codigoMfa = codigoMfa; }
    return this.http.post<RespuestaLogin>(`${API_URL}/api/auth/login`, cuerpo).pipe(
      map(respuesta => {
        const usuario: User = {
          id: 0,
          uuid: respuesta.usuarioId,
          name: respuesta.nombre,
          email: correo.trim().toLowerCase(),
          phone: '',
          role: this.convertirRol(respuesta.rol),
          active: true,
          joinedAt: ''
        };
        localStorage.setItem('casitago_token', respuesta.token);
        localStorage.setItem('casitago_usuario', JSON.stringify(usuario));
        localStorage.setItem('casitago_expira', String(Date.now() + respuesta.expiraEnSegundos * 1000));
        this.currentUserState.set(usuario);
        return usuario;
      })
    );
  }

  registroReal(nombre: string, correo: string, contrasena: string, rol: UserRole): Observable<User> {
    const rolBack = rol === 'host' ? 'ANFITRION' : 'HUESPED';
    const cuerpo = { nombre, correo, contrasena, rol: rolBack };
    return this.http.post(`${API_URL}/api/auth/registro`, cuerpo, { responseType: 'text' }).pipe(
      switchMap(() => this.loginReal(correo, contrasena))
    );
  }

  solicitarRecuperacion(correo: string): Observable<string> {
    return this.http.post(`${API_URL}/api/auth/recuperacion/solicitar`, { correo }, { responseType: 'text' });
  }

  confirmarRecuperacion(correo: string, codigo: string, nuevaContrasena: string): Observable<string> {
    return this.http.post(`${API_URL}/api/auth/recuperacion/confirmar`, { correo, codigo, nuevaContrasena }, { responseType: 'text' });
  }

  obtenerPerfil(): Observable<PerfilBack> {
    return this.http.get<PerfilBack>(`${API_URL}/api/auth/perfil`);
  }

  actualizarPerfilReal(nombre: string, correo: string): Observable<string> {
    return this.http.put(`${API_URL}/api/auth/perfil`, { nombre, correo }, { responseType: 'text' }).pipe(
      map((respuesta) => {
        this.guardarDatosUsuario(nombre.trim(), correo.trim().toLowerCase());
        return respuesta;
      })
    );
  }

  cambiarEstadoCuenta(activo: boolean): Observable<string> {
    return this.http.patch(`${API_URL}/api/auth/perfil/estado`, { activo }, { responseType: 'text' });
  }

  private guardarDatosUsuario(nombre: string, correo: string): void {
    const actual = this.currentUserState();
    if (!actual) { return; }
    const actualizado: User = { ...actual, name: nombre, email: correo };
    localStorage.setItem('casitago_usuario', JSON.stringify(actualizado));
    this.currentUserState.set(actualizado);
  }

  cambiarMfa(habilitado: boolean, contrasena: string): Observable<string> {
    return this.http.patch(`${API_URL}/api/auth/mfa`, { habilitado, contrasena }, { responseType: 'text' });
  }

  private convertirRol(rol: string): UserRole {
    if (rol === 'ANFITRION') { return 'host'; }
    if (rol === 'ADMINISTRADOR') { return 'admin'; }
    return 'guest';
  }

  private leerSesionGuardada(): User | null {
    try {
      const texto = localStorage.getItem('casitago_usuario');
      const expira = Number(localStorage.getItem('casitago_expira'));
      if (!texto || !localStorage.getItem('casitago_token') || Date.now() > expira) {
        this.borrarSesionGuardada();
        return null;
      }
      return JSON.parse(texto) as User;
    } catch {
      this.borrarSesionGuardada();
      return null;
    }
  }

  private borrarSesionGuardada(): void {
    localStorage.removeItem('casitago_token');
    localStorage.removeItem('casitago_usuario');
    localStorage.removeItem('casitago_expira');
  }

  logout(): void { this.borrarSesionGuardada(); this.currentUserState.set(null); }
}





