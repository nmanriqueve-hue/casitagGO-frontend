import { Injectable, computed, signal } from '@angular/core';
import { User, UserRole } from '../models/marketplace.models';
import { USERS } from './mock-data';
@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly users = signal<User[]>(USERS.map(u => ({ ...u })));
  private readonly passwords = new Map(USERS.map(u => [u.id, 'demo1234']));
  private readonly currentUserState = signal<User | null>(null);
  private pending: User | null = null;
  readonly currentUser = computed(() => { const u = this.currentUserState(); return u ? this.users().find(x => x.id === u.id && x.active) ?? null : null; });
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly role = computed(() => this.currentUser()?.role ?? null);
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
  logout(): void { this.currentUserState.set(null); this.pending = null; }
  updateProfile(changes: Partial<User>): void {
    const u = this.currentUser(); if (!u) return;
    if (changes.email && this.users().some(x => x.id !== u.id && x.email.toLowerCase() === changes.email!.trim().toLowerCase())) throw new Error('Este correo ya está registrado.');
    this.users.update(a => a.map(x => x.id === u.id ? { ...x, name: changes.name?.trim() ?? x.name, email: changes.email?.trim().toLowerCase() ?? x.email, phone: changes.phone?.trim() ?? x.phone, active: changes.active ?? x.active } : x));
  }
  toggleUser(id: number): void { if (this.role() !== 'admin' || id === this.currentUser()?.id) return; this.users.update(a => a.map(u => u.id === id ? { ...u, active: !u.active } : u)); }
}
