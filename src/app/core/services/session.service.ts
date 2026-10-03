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
  private readonly passwords = new Map(USERS.map(u => [u.id, 'demo1234']));
  private readonly currentUserState = signal<User | null>(this.leerSesionGuardada());
  private pending: User | null = null;
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

  credentials(email: string, role: UserRole, password: string): User | undefined {
    return this.users().find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.role === role && u.active && this.passwords.get(u.id) === password);
  }
  login(email: string, role: UserRole, password: string): User {
    const user = this.credentials(email, role, password);
    if (!user) throw new Error('Error de autenticación. Revisa el correo, la contraseña y el rol.');
    this.currentUserState.set(user); return user;
  }
  prepareMfa(email: string, role: UserRole, password: string): void { this.pending = this.credentials(email, role, password) ?? null; }
  completeMfa(): boolean { const u = this.pending; this.pending = null; if (!u || !this.users().some(x => x.id === u.id && x.active)) return false; this.currentUserState.set(u); return true; }
  register(name: string, email: string, role: UserRole, password: string, phone: string): User {
    if (!['guest', 'host'].includes(role) || !name.trim() || password.trim().length < 8 || this.users().some(u => u.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('El correo ya está registrado o los datos no son válidos.');
    const user: User = { id: Date.now(), name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), role, active: true, joinedAt: new Date().toISOString().slice(0, 10) };
    this.users.update(a => [...a, user]); this.passwords.set(user.id, password); this.currentUserState.set(user); return user;
  }
  logout(): void { this.borrarSesionGuardada(); this.currentUserState.set(null); this.pending = null; }
  updateProfile(changes: Partial<User>): void {
    const u = this.currentUser(); if (!u) return;
    if (changes.email && this.users().some(x => x.id !== u.id && x.email.toLowerCase() === changes.email!.trim().toLowerCase())) throw new Error('Este correo ya está registrado.');
    this.users.update(a => a.map(x => x.id === u.id ? { ...x, name: changes.name?.trim() ?? x.name, email: changes.email?.trim().toLowerCase() ?? x.email, phone: changes.phone?.trim() ?? x.phone, active: changes.active ?? x.active } : x));
  }
  toggleUser(id: number): void { if (this.role() !== 'admin' || id === this.currentUser()?.id) return; this.users.update(a => a.map(u => u.id === id ? { ...u, active: !u.active } : u)); }
}





