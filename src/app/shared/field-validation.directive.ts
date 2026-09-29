import { Directive, ElementRef, Renderer2, Injector, DoCheck, forwardRef, OnDestroy } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, NgControl, ValidationErrors, Validator } from '@angular/forms';
@Directive({ selector: 'input[formControlName],textarea[formControlName],select[formControlName],input[ngModel],textarea[ngModel],select[ngModel]', providers: [{ provide: NG_VALIDATORS, useExisting: forwardRef(() => FieldValidationDirective), multi: true }] })
export class FieldValidationDirective implements Validator, DoCheck, OnDestroy {
  private message: HTMLElement | null = null;
  private static sequence = 0;
  private readonly id = 'field-error-' + ++FieldValidationDirective.sequence;
  constructor(private element: ElementRef<HTMLInputElement>, private renderer: Renderer2, private injector: Injector) {}
  validate(c: AbstractControl): ValidationErrors | null {
    const el = this.element.nativeElement;
    const name = el.getAttribute('formControlName') ?? el.name ?? '';
    const value = c.value;
    if (el.type === 'checkbox' || el.type === 'radio') return null;
    if (el.validity?.badInput) return { field: 'Escribe un número válido, sin letras.' };
    if (value === null || value === undefined || value === '') {
      return el.type === 'number' ? { field: 'Completa este campo con un número válido.' } : null;
    }
    const text = String(value);
    if (!text.trim()) return { field: 'Este campo no puede contener solo espacios.' };
    if (['name', 'holder', 'city'].includes(name) && !/^[\p{L}\p{M}]+(?:[ .’'−-][\p{L}\p{M}]+)*$/u.test(text.trim())) return { field: 'Escribe solo letras y espacios, sin números.' };
    if (name === 'phone' && !/^\+?[\d ()-]{7,20}$/.test(text.trim())) return { field: 'Escribe un teléfono válido, sin letras (7 a 15 dígitos).' };
    if (name === 'phone' && !/^\d{7,15}$/.test(text.replace(/\D/g, ''))) return { field: 'El teléfono debe tener entre 7 y 15 dígitos.' };
    if (['title', 'description', 'rules', 'address'].includes(name) && !/\p{L}/u.test(text)) return { field: 'Escribe un texto válido; no uses únicamente números o símbolos.' };
    if (name === 'title' && text.trim().length < 8) return { field: 'Escribe al menos 8 caracteres.' };
    if (name === 'description' && text.trim().length < 30) return { field: 'Escribe al menos 30 caracteres.' };
    if (el.type === 'number' || ['card', 'cvv'].includes(name)) {
      if (!/^-?\d+(?:\.\d+)?$/.test(text) || !Number.isFinite(Number(value))) return { field: 'Escribe un número válido, sin letras.' };
      if (['capacity', 'bedrooms', 'beds', 'bathrooms', 'guests'].includes(name) && (!Number.isInteger(Number(value)) || Number(value) < 1)) return { field: 'Escribe un número entero de al menos 1.' };
      if (el.min !== '' && Number(value) < Number(el.min)) return { field: 'El valor mínimo permitido es ' + el.min + '.' };
      if (el.max !== '' && Number(value) > Number(el.max)) return { field: 'El valor máximo permitido es ' + el.max + '.' };
    }
    if (name === 'image' && !/^(https?:\/\/\S+|images\/\S+|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+)$/.test(text.trim())) return { field: 'Usa una URL de imagen válida o carga una fotografía.' };
    if (name === 'expiry') {
      const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(text);
      const now = new Date();
      if (!match || new Date(2000 + Number(match[2]), Number(match[1]), 1) <= new Date(now.getFullYear(), now.getMonth(), 1)) return { field: 'Usa MM/AA y un mes de vencimiento vigente.' };
    }
    if (el.type === 'date' && el.min && text < el.min) return { field: 'La fecha no puede ser anterior a ' + el.min + '.' };
    return null;
  }
  ngDoCheck(): void {
    const control = this.injector.get(NgControl, null, { self: true })?.control;
    const el = this.element.nativeElement;
    const errors = control?.errors;
    const show = !!control && (control.touched || control.dirty) && !!errors;
    if (!this.message) {
      this.message = this.renderer.createElement('div');
      this.renderer.addClass(this.message, 'field-error');
      this.renderer.setAttribute(this.message, 'id', this.id);
      this.renderer.setAttribute(this.message, 'aria-live', 'polite');
      const parent = el.parentElement!;
      const anchor = parent.classList.contains('input-group') ? parent : el;
      this.renderer.insertBefore(anchor.parentNode, this.message, anchor.nextSibling);
      this.renderer.setAttribute(el, 'aria-describedby', this.id);
    }
    let text = '';
    if (show && errors) {
      text = errors['field'] ?? (errors['required'] ? 'Este campo es obligatorio.' : errors['email'] ? 'Escribe un correo electrónico válido.' : errors['minlength'] ? 'Escribe al menos ' + errors['minlength'].requiredLength + ' caracteres.' : errors['min'] ? 'El valor mínimo es ' + errors['min'].min + '.' : errors['max'] ? 'El valor máximo es ' + errors['max'].max + '.' : 'El formato no es válido. Revisa este campo.');
    }
    this.renderer.setProperty(this.message, 'textContent', text);
    this.renderer.setProperty(this.message, 'hidden', !text);
    this.renderer.setAttribute(el, 'aria-invalid', String(show));
  }
  ngOnDestroy(): void { if (this.message?.parentNode) this.renderer.removeChild(this.message.parentNode, this.message); }
}
