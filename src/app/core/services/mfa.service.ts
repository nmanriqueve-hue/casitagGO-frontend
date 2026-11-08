import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

interface RetoMfa {
  email: string;
  password: string;
  returnUrl: string | null;
}

// Lo lanza SessionService cuando el back responde 200 con mfaRequerido: hay que pedir el código.
export class RetoMfaRequerido extends Error {
  constructor() {
    super('Se requiere el código de verificación.');
    this.name = 'RetoMfaRequerido';
  }
}

@Injectable({ providedIn: 'root' })
export class MfaService {
  // Login que el back respondió pidiendo el código. Solo vive en memoria.
  readonly challenge = signal<RetoMfa | null>(null);

  begin(email: string, password: string, returnUrl: string | null): void {
    this.challenge.set({ email, password, returnUrl });
  }

  clear(): void {
    this.challenge.set(null);
  }

  // El back avisa con un texto que empieza por "Se envió un código...". Se compara solo el inicio para no depender de las tildes.
  esPeticionDeCodigo(error: unknown): boolean {
    if (error instanceof RetoMfaRequerido) { return true; }
    if (!(error instanceof HttpErrorResponse)) { return false; }
    return error.status === 400 && typeof error.error === 'string' && error.error.startsWith('Se envi');
  }
}
