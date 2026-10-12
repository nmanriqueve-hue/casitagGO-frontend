
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

import {
  PublicacionesBackService,
  PublicacionDatos
} from './publicaciones-back.service';
import { PublicacionBack } from './catalog.service';
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

describe('PublicacionesBackService', () => {
  let service: PublicacionesBackService;
  let httpGet: ReturnType<typeof vi.fn>;
  let httpPost: ReturnType<typeof vi.fn>;
  let httpPut: ReturnType<typeof vi.fn>;
  let httpPatch: ReturnType<typeof vi.fn>;

  const datosPublicacion: PublicacionDatos = {
    titulo: 'Apartamento en Bogotá',
    descripcion: 'Apartamento cómodo y amoblado',
    ubicacionTextual: 'Chapinero, Bogotá',
    ciudad: 'Bogotá',
    tipo: 'APARTAMENTO',
    capacidad: 4,
    precioNoche: 180000,
    servicios: ['WiFi', 'Cocina', 'Parqueadero'],
    reglas: ['No fumar', 'No fiestas']
  };

  // Se utiliza un objeto simulado porque este servicio
  // únicamente transporta la respuesta del backend.
  const publicacionSimulada = {
    id: 'publicacion-101',
    ...datosPublicacion,
    estado: 'ACTIVA'
  } as unknown as PublicacionBack;

  const segundaPublicacion = {
    id: 'publicacion-202',
    ...datosPublicacion,
    titulo: 'Casa en Medellín',
    ciudad: 'Medellín',
    estado: 'PAUSADA'
  } as unknown as PublicacionBack;

  const crearArchivo = () =>
    new File(['contenido de imagen'], 'alojamiento.jpg', {
      type: 'image/jpeg'
    });

  beforeEach(() => {
    TestBed.resetTestingModule();

    httpGet = vi.fn();
    httpPost = vi.fn();
    httpPut = vi.fn();
    httpPatch = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        PublicacionesBackService,
        {
          provide: HttpClient,
          useValue: {
            get: httpGet,
            post: httpPost,
            put: httpPut,
            patch: httpPatch
          }
        }
      ]
    });

    service = TestBed.inject(PublicacionesBackService);
  });

  describe('Inicialización', () => {
    it('debe crear el servicio', () => {
      expect(service).toBeTruthy();
    });

    it('debe ser una instancia de PublicacionesBackService', () => {
      expect(service).toBeInstanceOf(PublicacionesBackService);
    });

    it('no debe hacer solicitudes HTTP al inicializarse', () => {
      expect(httpGet).not.toHaveBeenCalled();
      expect(httpPost).not.toHaveBeenCalled();
      expect(httpPut).not.toHaveBeenCalled();
      expect(httpPatch).not.toHaveBeenCalled();
    });
  });

  describe('Consultar publicaciones propias', () => {
    beforeEach(() => {
      httpGet.mockReturnValue(of([
        publicacionSimulada,
        segundaPublicacion
      ]));
    });

    it('debe consultar el endpoint de publicaciones propias', async () => {
      await firstValueFrom(service.mias());

      expect(httpGet).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/mias`
      );
    });

    it('debe realizar una solicitud GET', async () => {
      await firstValueFrom(service.mias());

      expect(httpGet).toHaveBeenCalledTimes(1);
    });

    it('debe devolver las publicaciones recibidas', async () => {
      const resultado = await firstValueFrom(service.mias());

      expect(resultado).toEqual([
        publicacionSimulada,
        segundaPublicacion
      ]);
    });

    it('debe devolver múltiples publicaciones', async () => {
      const resultado = await firstValueFrom(service.mias());

      expect(resultado).toHaveLength(2);
    });

    it('debe conservar el identificador de cada publicación', async () => {
      const resultado = await firstValueFrom(service.mias());

      expect(resultado[0].id).toBe('publicacion-101');
    });

    it('debe conservar los títulos de las publicaciones', async () => {
      const resultado = await firstValueFrom(service.mias());

      expect(resultado[1].titulo).toBe('Casa en Medellín');
    });

    it('debe aceptar una lista vacía', async () => {
      httpGet.mockReturnValue(of([]));

      const resultado = await firstValueFrom(service.mias());

      expect(resultado).toEqual([]);
    });

    it('debe propagar errores al consultar publicaciones', async () => {
      httpGet.mockReturnValue(
        throwError(() => new Error('Error al consultar publicaciones'))
      );

      await expect(firstValueFrom(service.mias()))
        .rejects.toThrow('Error al consultar publicaciones');
    });
  });

  describe('Crear publicación', () => {
    beforeEach(() => {
      httpPost.mockReturnValue(of(publicacionSimulada));
    });

    it('debe utilizar el endpoint de creación', async () => {
      await firstValueFrom(service.crear(datosPublicacion));

      expect(httpPost).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones`,
        datosPublicacion
      );
    });

    it('debe realizar una solicitud POST', async () => {
      await firstValueFrom(service.crear(datosPublicacion));

      expect(httpPost).toHaveBeenCalledTimes(1);
    });

    it('debe enviar el título de la publicación', async () => {
      await firstValueFrom(service.crear(datosPublicacion));

      expect(httpPost.mock.calls[0][1].titulo)
        .toBe('Apartamento en Bogotá');
    });

    it('debe enviar la descripción', async () => {
      await firstValueFrom(service.crear(datosPublicacion));

      expect(httpPost.mock.calls[0][1].descripcion)
        .toBe('Apartamento cómodo y amoblado');
    });

    it('debe enviar la ubicación textual', async () => {
      await firstValueFrom(service.crear(datosPublicacion));

      expect(httpPost.mock.calls[0][1].ubicacionTextual)
        .toBe('Chapinero, Bogotá');
    });

    it('debe enviar la ciudad y el tipo', async () => {
      await firstValueFrom(service.crear(datosPublicacion));

      expect(httpPost.mock.calls[0][1].ciudad).toBe('Bogotá');
      expect(httpPost.mock.calls[0][1].tipo).toBe('APARTAMENTO');
    });

    it('debe enviar la capacidad', async () => {
      await firstValueFrom(service.crear(datosPublicacion));

      expect(httpPost.mock.calls[0][1].capacidad).toBe(4);
    });

    it('debe enviar el precio por noche', async () => {
      await firstValueFrom(service.crear(datosPublicacion));

      expect(httpPost.mock.calls[0][1].precioNoche).toBe(180000);
    });

    it('debe enviar los servicios', async () => {
      await firstValueFrom(service.crear(datosPublicacion));

      expect(httpPost.mock.calls[0][1].servicios)
        .toEqual(['WiFi', 'Cocina', 'Parqueadero']);
    });

    it('debe enviar las reglas del alojamiento', async () => {
      await firstValueFrom(service.crear(datosPublicacion));

      expect(httpPost.mock.calls[0][1].reglas)
        .toEqual(['No fumar', 'No fiestas']);
    });

    it('debe devolver la publicación creada', async () => {
      const resultado = await firstValueFrom(
        service.crear(datosPublicacion)
      );

      expect(resultado).toEqual(publicacionSimulada);
    });

    it('debe aceptar listas vacías de servicios y reglas', async () => {
      const datos = {
        ...datosPublicacion,
        servicios: [],
        reglas: []
      };

      await firstValueFrom(service.crear(datos));

      expect(httpPost.mock.calls[0][1].servicios).toEqual([]);
      expect(httpPost.mock.calls[0][1].reglas).toEqual([]);
    });

    it('debe propagar errores al crear', async () => {
      httpPost.mockReturnValue(
        throwError(() => new Error('Error al crear'))
      );

      await expect(firstValueFrom(service.crear(datosPublicacion)))
        .rejects.toThrow('Error al crear');
    });
  });

  describe('Editar publicación', () => {
    beforeEach(() => {
      httpPut.mockReturnValue(of(publicacionSimulada));
    });

    it('debe utilizar el endpoint de edición', async () => {
      await firstValueFrom(
        service.editar('publicacion-101', datosPublicacion)
      );

      expect(httpPut).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/publicacion-101`,
        datosPublicacion
      );
    });

    it('debe realizar una solicitud PUT', async () => {
      await firstValueFrom(
        service.editar('publicacion-101', datosPublicacion)
      );

      expect(httpPut).toHaveBeenCalledTimes(1);
    });

    it('debe utilizar el identificador correcto', async () => {
      await firstValueFrom(
        service.editar('publicacion-202', datosPublicacion)
      );

      expect(httpPut.mock.calls[0][0]).toBe(
        `${API_URL}/api/publicaciones/publicacion-202`
      );
    });

    it('debe enviar todos los datos actualizados', async () => {
      const nuevosDatos = {
        ...datosPublicacion,
        titulo: 'Apartamento renovado',
        precioNoche: 220000
      };

      await firstValueFrom(
        service.editar('publicacion-101', nuevosDatos)
      );

      expect(httpPut.mock.calls[0][1]).toEqual(nuevosDatos);
    });

    it('debe permitir cambiar la capacidad', async () => {
      const nuevosDatos = {
        ...datosPublicacion,
        capacidad: 6
      };

      await firstValueFrom(
        service.editar('publicacion-101', nuevosDatos)
      );

      expect(httpPut.mock.calls[0][1].capacidad).toBe(6);
    });

    it('debe permitir actualizar servicios', async () => {
      const nuevosDatos = {
        ...datosPublicacion,
        servicios: ['WiFi', 'Piscina']
      };

      await firstValueFrom(
        service.editar('publicacion-101', nuevosDatos)
      );

      expect(httpPut.mock.calls[0][1].servicios)
        .toEqual(['WiFi', 'Piscina']);
    });

    it('debe devolver la publicación actualizada', async () => {
      const resultado = await firstValueFrom(
        service.editar('publicacion-101', datosPublicacion)
      );

      expect(resultado).toEqual(publicacionSimulada);
    });

    it('debe propagar errores al editar', async () => {
      httpPut.mockReturnValue(
        throwError(() => new Error('Error al editar'))
      );

      await expect(
        firstValueFrom(
          service.editar('publicacion-101', datosPublicacion)
        )
      ).rejects.toThrow('Error al editar');
    });
  });

  describe('Activar publicación', () => {
    beforeEach(() => {
      httpPatch.mockReturnValue(of(publicacionSimulada));
    });

    it('debe utilizar el endpoint de activación', async () => {
      await firstValueFrom(service.activar('publicacion-101'));

      expect(httpPatch).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/publicacion-101/activar`,
        null
      );
    });

    it('debe realizar una solicitud PATCH', async () => {
      await firstValueFrom(service.activar('publicacion-101'));

      expect(httpPatch).toHaveBeenCalledTimes(1);
    });

    it('debe enviar el cuerpo como null', async () => {
      await firstValueFrom(service.activar('publicacion-101'));

      expect(httpPatch.mock.calls[0][1]).toBeNull();
    });

    it('debe permitir activar diferentes publicaciones', async () => {
      await firstValueFrom(service.activar('publicacion-202'));

      expect(httpPatch.mock.calls[0][0]).toBe(
        `${API_URL}/api/publicaciones/publicacion-202/activar`
      );
    });

    it('debe devolver la publicación activada', async () => {
      const resultado = await firstValueFrom(
        service.activar('publicacion-101')
      );

      expect(resultado).toEqual(publicacionSimulada);
    });

    it('debe propagar errores al activar', async () => {
      httpPatch.mockReturnValue(
        throwError(() => new Error('Error al activar'))
      );

      await expect(
        firstValueFrom(service.activar('publicacion-101'))
      ).rejects.toThrow('Error al activar');
    });
  });

  describe('Pausar publicación', () => {
    beforeEach(() => {
      httpPatch.mockReturnValue(of(segundaPublicacion));
    });

    it('debe utilizar el endpoint de pausa', async () => {
      await firstValueFrom(service.pausar('publicacion-101'));

      expect(httpPatch).toHaveBeenCalledWith(
        `${API_URL}/api/publicaciones/publicacion-101/pausar`,
        null
      );
    });

    it('debe realizar una solicitud PATCH', async () => {
      await firstValueFrom(service.pausar('publicacion-101'));

      expect(httpPatch).toHaveBeenCalledTimes(1);
    });

    it('debe enviar el cuerpo como null', async () => {
      await firstValueFrom(service.pausar('publicacion-101'));

      expect(httpPatch.mock.calls[0][1]).toBeNull();
    });

    it('debe permitir pausar diferentes publicaciones', async () => {
      await firstValueFrom(service.pausar('publicacion-202'));

      expect(httpPatch.mock.calls[0][0]).toBe(
        `${API_URL}/api/publicaciones/publicacion-202/pausar`
      );
    });

    it('debe devolver la publicación pausada', async () => {
      const resultado = await firstValueFrom(
        service.pausar('publicacion-101')
      );

      expect(resultado).toEqual(segundaPublicacion);
    });

    it('debe propagar errores al pausar', async () => {
      httpPatch.mockReturnValue(
        throwError(() => new Error('Error al pausar'))
      );

      await expect(
        firstValueFrom(service.pausar('publicacion-101'))
      ).rejects.toThrow('Error al pausar');
    });
  });

  describe('Subir imágenes', () => {
    beforeEach(() => {
      httpPost.mockReturnValue(of(publicacionSimulada));
    });

    it('debe utilizar el endpoint de imágenes', async () => {
      await firstValueFrom(
        service.subirImagen('publicacion-101', crearArchivo())
      );

      expect(httpPost.mock.calls[0][0]).toBe(
        `${API_URL}/api/publicaciones/publicacion-101/imagenes`
      );
    });

    it('debe realizar una solicitud POST', async () => {
      await firstValueFrom(
        service.subirImagen('publicacion-101', crearArchivo())
      );

      expect(httpPost).toHaveBeenCalledTimes(1);
    });

    it('debe enviar los datos mediante FormData', async () => {
      await firstValueFrom(
        service.subirImagen('publicacion-101', crearArchivo())
      );

      expect(httpPost.mock.calls[0][1])
        .toBeInstanceOf(FormData);
    });

    it('debe utilizar la clave archivo en FormData', async () => {
      await firstValueFrom(
        service.subirImagen('publicacion-101', crearArchivo())
      );

      const formulario = httpPost.mock.calls[0][1] as FormData;

      expect(formulario.has('archivo')).toBe(true);
    });

    it('debe conservar el nombre del archivo', async () => {
      await firstValueFrom(
        service.subirImagen('publicacion-101', crearArchivo())
      );

      const formulario = httpPost.mock.calls[0][1] as FormData;
      const archivo = formulario.get('archivo') as File;

      expect(archivo.name).toBe('alojamiento.jpg');
    });

    it('debe conservar el tipo de archivo', async () => {
      await firstValueFrom(
        service.subirImagen('publicacion-101', crearArchivo())
      );

      const formulario = httpPost.mock.calls[0][1] as FormData;
      const archivo = formulario.get('archivo') as File;

      expect(archivo.type).toBe('image/jpeg');
    });

    it('debe permitir diferentes identificadores', async () => {
      await firstValueFrom(
        service.subirImagen('publicacion-202', crearArchivo())
      );

      expect(httpPost.mock.calls[0][0]).toBe(
        `${API_URL}/api/publicaciones/publicacion-202/imagenes`
      );
    });

    it('debe devolver la publicación actualizada', async () => {
      const resultado = await firstValueFrom(
        service.subirImagen('publicacion-101', crearArchivo())
      );

      expect(resultado).toEqual(publicacionSimulada);
    });

    it('debe permitir archivos PNG', async () => {
      const archivo = new File(
        ['imagen png'],
        'alojamiento.png',
        { type: 'image/png' }
      );

      await firstValueFrom(
        service.subirImagen('publicacion-101', archivo)
      );

      const formulario = httpPost.mock.calls[0][1] as FormData;
      const archivoEnviado = formulario.get('archivo') as File;

      expect(archivoEnviado.name).toBe('alojamiento.png');
      expect(archivoEnviado.type).toBe('image/png');
    });

    it('debe propagar errores al subir imágenes', async () => {
      httpPost.mockReturnValue(
        throwError(() => new Error('Error al subir imagen'))
      );

      await expect(
        firstValueFrom(
          service.subirImagen('publicacion-101', crearArchivo())
        )
      ).rejects.toThrow('Error al subir imagen');
    });
  });
});
