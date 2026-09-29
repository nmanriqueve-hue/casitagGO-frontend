import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { MfaService } from '../../core/services/mfa.service';
@Component({ selector: 'app-verify', imports: [FieldValidationDirective, FormsModule, RouterLink], templateUrl: './verify.component.html', styleUrl: './verify.component.css' })
export class VerifyComponent {
  readonly mfa = inject(MfaService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly error = signal('');
  code = '';
  verify(): void {
    const c = this.mfa.challenge();
    if (!c) return;
    if (!this.mfa.verify(this.code)) { this.error.set('Código incorrecto, vencido o cinco intentos agotados. Vuelve a iniciar sesión si es necesario.'); return; }
    if (!this.session.completeMfa()) { this.error.set('Error de autenticación. Vuelve a iniciar sesión.'); return; } this.mfa.clear(); this.router.navigateByUrl(c.target);
  }
  cancel(): void { this.mfa.clear(); this.router.navigate(['/iniciar-sesion']); }
}
