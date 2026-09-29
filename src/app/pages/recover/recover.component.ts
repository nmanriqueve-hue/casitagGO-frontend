import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({ selector: 'app-recover', imports: [FieldValidationDirective, ReactiveFormsModule, RouterLink], templateUrl: './recover.component.html', styleUrl: './recover.component.css' })
export class RecoverComponent {
  private readonly fb = inject(FormBuilder);
  readonly sent = signal(false);
  readonly form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });

  send(): void {
    if (this.form.valid) this.sent.set(true);
    else this.form.markAllAsTouched();
  }
}
