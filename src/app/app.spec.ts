
import '@angular/compiler';

import { describe, expect, it } from 'vitest';
import { Component, reflectComponentType } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { App } from './app';
import { FooterComponent } from './shared/footer/footer.component';
import { ToastComponent } from './shared/toast/toast.component';
import { TopbarComponent } from './shared/topbar/topbar.component';

describe('App', () => {
  const obtenerMetadata = () => {
    const annotations = (App as any).__annotations__ as
      | Array<{
          selector?: string;
          imports?: unknown[];
          templateUrl?: string;
          styleUrl?: string;
        }>
      | undefined;

    return annotations?.find(annotation => annotation instanceof Component);
  };

  it('01 - debe existir el componente principal', () => {
    expect(App).toBeDefined();
  });

  it('02 - debe ser una clase', () => {
    expect(typeof App).toBe('function');
  });

  it('03 - debe crear una instancia de App', () => {
    const app = new App();

    expect(app).toBeTruthy();
  });

  it('04 - debe ser una instancia de App', () => {
    const app = new App();

    expect(app).toBeInstanceOf(App);
  });

  it('05 - debe permitir crear dos instancias diferentes', () => {
    const app1 = new App();
    const app2 = new App();

    expect(app1).not.toBe(app2);
  });

  it('06 - debe conservar el constructor App', () => {
    const app = new App();

    expect(app.constructor).toBe(App);
  });

  it('07 - debe tener el decorador Component', () => {
    const metadata = obtenerMetadata();

    expect(metadata).toBeDefined();
  });

  it('08 - debe tener el selector app-root', () => {
    const metadata = obtenerMetadata();

    expect(metadata?.selector).toBe('app-root');
  });

  it('09 - debe utilizar el archivo app.html', () => {
    const metadata = obtenerMetadata();

    expect(metadata?.templateUrl).toBe('./app.html');
  });

  it('10 - debe utilizar el archivo app.css', () => {
    const metadata = obtenerMetadata();

    expect(metadata?.styleUrl).toBe('./app.css');
  });

  it('11 - debe declarar las dependencias del componente', () => {
    const metadata = obtenerMetadata();

    expect(Array.isArray(metadata?.imports)).toBe(true);
  });

  it('12 - debe importar RouterOutlet', () => {
    const metadata = obtenerMetadata();

    expect(metadata?.imports).toContain(RouterOutlet);
  });

  it('13 - debe importar TopbarComponent', () => {
    const metadata = obtenerMetadata();

    expect(metadata?.imports).toContain(TopbarComponent);
  });

  it('14 - debe importar FooterComponent', () => {
    const metadata = obtenerMetadata();

    expect(metadata?.imports).toContain(FooterComponent);
  });

  it('15 - debe importar ToastComponent', () => {
    const metadata = obtenerMetadata();

    expect(metadata?.imports).toContain(ToastComponent);
  });
});
