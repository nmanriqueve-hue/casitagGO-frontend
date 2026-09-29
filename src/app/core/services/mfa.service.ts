import { Injectable, signal } from '@angular/core';
import { UserRole } from '../models/marketplace.models';
@Injectable({ providedIn: 'root' })
export class MfaService {
  private readonly accounts = signal<string[]>([]);
  readonly challenge = signal<{ email: string; role: UserRole; target: string; code: string; expires: number; attempts: number } | null>(null);
  private key(email: string, role: UserRole): string { return role + ':' + email.trim().toLowerCase(); }
  enabled(email: string, role: UserRole): boolean { return this.accounts().includes(this.key(email, role)); }
  enable(email: string, role: UserRole): void { const key = this.key(email, role); this.accounts.update((a) => [...new Set([...a, key])]); }
  disable(email: string, role: UserRole): void { this.accounts.update((a) => a.filter((key) => key !== this.key(email, role))); }
  begin(email: string, role: UserRole, target: string): void { this.challenge.set({ email, role, target, code: '123456', expires: Date.now() + 300000, attempts: 0 }); }
  verify(code: string): boolean {
    const c = this.challenge();
    if (!c || c.expires <= Date.now() || c.attempts >= 5) return false;
    this.challenge.set({ ...c, attempts: c.attempts + 1 });
    return code.trim() === c.code;
  }
  clear(): void { this.challenge.set(null); }
}
