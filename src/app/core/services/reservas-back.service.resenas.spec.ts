// @vitest-environment jsdom
import '@angular/compiler';

import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReservasBackService } from './reservas-back.service';
import { API_URL } from '../config/api.config';

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

describe('ReservasBackService - resenas', () => {
  let service: ReservasBackService;
  let httpPost: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();

    httpPost = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        ReservasBackService,
        {
          provide: HttpClient,
          useValue: { post: httpPost }
        }
      ]
    });

    service = TestBed.inject(ReservasBackService);
  });

  it('debe enviar la calificacion y el comentario a la reserva indicada', async () => {
    const resena = { id: 'resena-1', calificacion: 4 };
    httpPost.mockReturnValue(of(resena));

    const resultado = await firstValueFrom(
      service.crearResena('reserva-1', 4, 'Buena estadia')
    );

    expect(httpPost).toHaveBeenCalledWith(
      `${API_URL}/api/reservas/reserva-1/resena`,
      { calificacion: 4, comentario: 'Buena estadia' }
    );
    expect(resultado).toBe(resena);
  });

  it('debe enviar el comentario vacio cuando el huesped no escribe nada', async () => {
    httpPost.mockReturnValue(of({ id: 'resena-1' }));

    await firstValueFrom(service.crearResena('reserva-1', 5, ''));

    expect(httpPost.mock.calls[0][1]).toEqual({ calificacion: 5, comentario: '' });
  });

  it('debe propagar los errores al crear la resena', async () => {
    httpPost.mockReturnValue(throwError(() => new Error('Error al crear')));

    await expect(firstValueFrom(service.crearResena('reserva-1', 3, 'x')))
      .rejects.toThrow('Error al crear');
  });
});
