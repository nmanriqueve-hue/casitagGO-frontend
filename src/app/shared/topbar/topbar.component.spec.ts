
import '@angular/compiler';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TopbarComponent } from './topbar.component';
import type { SessionService } from '../../core/services/session.service';
import type { Router } from '@angular/router';

describe('TopbarComponent', () => {
  let component: TopbarComponent;

  let rolActual: 'guest' | 'host' | 'admin' | null;

  let cerrarSesion: ReturnType<typeof vi.fn>;
  let navegar: ReturnType<typeof vi.fn>;

  let servicioSesion: {
    role: () => 'guest' | 'host' | 'admin' | null;
    logout: ReturnType<typeof vi.fn>;
  };

  let routerSimulado: {
    navigate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    rolActual = 'guest';

    cerrarSesion = vi.fn();
    navegar = vi.fn();

    servicioSesion = {
      role: () => rolActual,
      logout: cerrarSesion
    };

    routerSimulado = {
      navigate: navegar
    };

    component = new TopbarComponent(
      servicioSesion as unknown as SessionService,
      routerSimulado as unknown as Router
    );
  });

  // CREACIÓN DEL COMPONENTE

  it('debe crear el componente correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe ser una instancia de TopbarComponent', () => {
    expect(component).toBeInstanceOf(TopbarComponent);
  });

  it('debe recibir el servicio de sesión', () => {
    expect(component.session).toBeDefined();
  });

  it('debe conservar el servicio de sesión', () => {
    expect(component.session).toBe(servicioSesion);
  });

  it('debe tener disponible toggleMenu', () => {
    expect(typeof component.toggleMenu).toBe('function');
  });

  it('debe tener disponible closeMenu', () => {
    expect(typeof component.closeMenu).toBe('function');
  });

  it('debe tener disponible logout', () => {
    expect(typeof component.logout).toBe('function');
  });

  // FUNCIONAMIENTO DEL MENÚ

  it('debe iniciar con el menú cerrado', () => {
    expect(component.menuOpen()).toBe(false);
  });

  it('debe abrir el menú', () => {
    component.toggleMenu();

    expect(component.menuOpen()).toBe(true);
  });

  it('debe cerrar el menú al alternarlo nuevamente', () => {
    component.toggleMenu();
    component.toggleMenu();

    expect(component.menuOpen()).toBe(false);
  });

  it('debe permitir alternar el menú varias veces', () => {
    component.toggleMenu();
    component.toggleMenu();
    component.toggleMenu();

    expect(component.menuOpen()).toBe(true);
  });

  it('debe cerrar el menú mediante closeMenu', () => {
    component.toggleMenu();
    component.closeMenu();

    expect(component.menuOpen()).toBe(false);
  });

  it('debe mantener cerrado el menú si ya estaba cerrado', () => {
    component.closeMenu();

    expect(component.menuOpen()).toBe(false);
  });

  it('debe permitir abrir el menú después de cerrarlo', () => {
    component.toggleMenu();
    component.closeMenu();
    component.toggleMenu();

    expect(component.menuOpen()).toBe(true);
  });

  // RUTAS SEGÚN EL ROL

  it('debe enviar al huésped a mis reservas', () => {
    rolActual = 'guest';

    expect(component.dashboardRoute()).toBe('/mis-reservas');
  });

  it('debe enviar al anfitrión a su panel', () => {
    rolActual = 'host';

    expect(component.dashboardRoute()).toBe('/anfitrion');
  });

  it('debe enviar al administrador a administración', () => {
    rolActual = 'admin';

    expect(component.dashboardRoute()).toBe('/administracion');
  });

  it('debe utilizar mis reservas cuando no hay rol', () => {
    rolActual = null;

    expect(component.dashboardRoute()).toBe('/mis-reservas');
  });

  it('debe actualizar la ruta cuando cambia el rol', () => {
    rolActual = 'guest';
    expect(component.dashboardRoute()).toBe('/mis-reservas');

    rolActual = 'host';
    expect(component.dashboardRoute()).toBe('/anfitrion');

    rolActual = 'admin';
    expect(component.dashboardRoute()).toBe('/administracion');
  });

  // ETIQUETAS DE LOS ROLES

  it('debe mostrar la etiqueta de huésped', () => {
    rolActual = 'guest';

    expect(component.roleLabel()).toBe('Huésped');
  });

  it('debe mostrar la etiqueta de anfitrión', () => {
    rolActual = 'host';

    expect(component.roleLabel()).toBe('Anfitrión');
  });

  it('debe mostrar la etiqueta de administrador', () => {
    rolActual = 'admin';

    expect(component.roleLabel()).toBe('Administrador');
  });

  it('debe devolver una etiqueta vacía sin rol', () => {
    rolActual = null;

    expect(component.roleLabel()).toBe('');
  });

  it('debe actualizar la etiqueta cuando cambia el rol', () => {
    rolActual = 'guest';
    expect(component.roleLabel()).toBe('Huésped');

    rolActual = 'host';
    expect(component.roleLabel()).toBe('Anfitrión');

    rolActual = 'admin';
    expect(component.roleLabel()).toBe('Administrador');
  });

  // CIERRE DE SESIÓN

  it('debe ejecutar logout del servicio', () => {
    component.logout();

    expect(cerrarSesion).toHaveBeenCalledTimes(1);
  });

  it('debe cerrar el menú al cerrar sesión', () => {
    component.toggleMenu();

    expect(component.menuOpen()).toBe(true);

    component.logout();

    expect(component.menuOpen()).toBe(false);
  });

  it('debe navegar al inicio al cerrar sesión', () => {
    component.logout();

    expect(navegar).toHaveBeenCalledWith(['/']);
  });

  it('debe ejecutar el cierre de sesión y navegación una sola vez', () => {
    component.logout();

    expect(cerrarSesion).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledTimes(1);
  });
});
