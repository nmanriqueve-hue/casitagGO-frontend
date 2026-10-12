
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastComponent } from './toast.component';
import { ToastService } from '../../core/services/toast.service';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let toastService: ToastService;

  beforeEach(() => {
    const servicioSimulado = {
      show: vi.fn()
    };

    toastService = servicioSimulado as unknown as ToastService;
    component = new ToastComponent(toastService);
  });

  it('debe crear el componente correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe ser una instancia de ToastComponent', () => {
    expect(component).toBeInstanceOf(ToastComponent);
  });

  it('debe recibir el servicio de notificaciones', () => {
    expect(component.toast).toBeDefined();
  });

  it('debe conservar la instancia del servicio recibida', () => {
    expect(component.toast).toBe(toastService);
  });

  it('debe disponer del método show del servicio', () => {
    expect(typeof component.toast.show).toBe('function');
  });

  it('debe permitir acceder al servicio desde el componente', () => {
    expect(component.toast).not.toBeNull();
  });

  it('debe permitir crear varias instancias del componente', () => {
    const primero = new ToastComponent(toastService);
    const segundo = new ToastComponent(toastService);

    expect(primero).not.toBe(segundo);
  });

  it('debe permitir compartir el mismo servicio entre componentes', () => {
    const primero = new ToastComponent(toastService);
    const segundo = new ToastComponent(toastService);

    expect(primero.toast).toBe(segundo.toast);
  });

  it('debe permitir utilizar servicios independientes', () => {
    const otroServicio = {
      show: vi.fn()
    } as unknown as ToastService;

    const otroComponente = new ToastComponent(otroServicio);

    expect(otroComponente.toast).not.toBe(component.toast);
  });

  it('debe permitir llamar al método show del servicio', () => {
    component.toast.show('Operación exitosa');

    expect(component.toast.show).toHaveBeenCalledWith(
      'Operación exitosa'
    );
  });

  it('debe llamar al servicio una sola vez', () => {
    component.toast.show('Notificación');

    expect(component.toast.show).toHaveBeenCalledTimes(1);
  });

  it('debe permitir mostrar varias notificaciones', () => {
    component.toast.show('Primera notificación');
    component.toast.show('Segunda notificación');

    expect(component.toast.show).toHaveBeenCalledTimes(2);
  });

  it('debe conservar el constructor correcto', () => {
    expect(component.constructor).toBe(ToastComponent);
  });

  it('debe conservar el prototipo de la clase', () => {
    expect(Object.getPrototypeOf(component)).toBe(
      ToastComponent.prototype
    );
  });

  it('debe permitir crear el componente con un servicio simulado', () => {
    expect(() => new ToastComponent(toastService)).not.toThrow();
  });
});
