import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

interface RetoMfa {
  email: string;
  password: string;
  returnUrl: string | null;
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
  esPeticionDeCodigo(error: HttpErrorResponse): boolean {
    return error.status === 400 && typeof error.error === 'string' && error.error.startsWith('Se envi');
  }
}
