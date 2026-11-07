import '@angular/compiler';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TopbarComponent } from './topbar.component';
import type { SessionService } from '../../core/services/session.service';
import type { Router } from '@angular/router';

describe('TopbarComponent - cierre del menu Mas', () => {
  let component: TopbarComponent;
  let cerrarSesion: ReturnType<typeof vi.fn>;
  let navegar: ReturnType<typeof vi.fn>;

  const crearMenuMas = (abierto: boolean) => ({ open: abierto }) as HTMLDetailsElement;

  beforeEach(() => {
    cerrarSesion = vi.fn();
    navegar = vi.fn();
    component = new TopbarComponent(
      { role: () => 'guest', logout: cerrarSesion } as unknown as SessionService,
      { navigate: navegar } as unknown as Router
    );
  });

  it('cierra el menu Mas cuando se elige una de sus opciones', () => {
    const menuMas = crearMenuMas(true);

    component.closeMenu(menuMas);

    expect(menuMas.open).toBe(false);
  });

  it('cierra tambien el menu movil cuando se pasa el menu Mas', () => {
    const menuMas = crearMenuMas(true);
    component.toggleMenu();
    expect(component.menuOpen()).toBe(true);

    component.closeMenu(menuMas);

    expect(component.menuOpen()).toBe(false);
  });

  it('deja cerrado un menu Mas que ya estaba cerrado', () => {
    const menuMas = crearMenuMas(false);

    component.closeMenu(menuMas);

    expect(menuMas.open).toBe(false);
  });

  it('closeMenu sin argumento sigue cerrando el menu movil', () => {
    component.toggleMenu();
    expect(component.menuOpen()).toBe(true);

    component.closeMenu();

    expect(component.menuOpen()).toBe(false);
  });

  it('closeMenu sin argumento no toca un menu Mas abierto', () => {
    const menuMas = crearMenuMas(true);

    component.closeMenu();

    expect(menuMas.open).toBe(true);
  });

  it('logout cierra sesion, cierra el menu movil y vuelve al inicio', () => {
    component.toggleMenu();

    component.logout();

    expect(cerrarSesion).toHaveBeenCalledTimes(1);
    expect(component.menuOpen()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/']);
  });
});
