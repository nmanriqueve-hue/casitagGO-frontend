import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MfaService } from '../../core/services/mfa.service';
import { SessionService } from '../../core/services/session.service';
@Component({ selector: 'app-security', imports: [FieldValidationDirective, FormsModule, RouterLink], templateUrl: './security.component.html', styleUrl: './security.component.css' })
export class SecurityComponent {
  readonly mfa = inject(MfaService);
  readonly session = inject(SessionService);
  readonly enrolling = signal(false);
  readonly notice = signal('');
  code = '';
  active(): boolean { const u = this.session.currentUser(); return !!u && this.mfa.enabled(u.email, u.role); }
  activate(): void { const u = this.session.currentUser(); if (!u) return; if (this.code !== '123456') { this.notice.set('Código incorrecto. Usa 123456 en esta demostración.'); return; } this.mfa.enable(u.email, u.role); this.enrolling.set(false); this.code = ''; this.notice.set('Verificación activada. Cierra sesión e ingresa con el mismo correo y perfil para probarla.'); }
  disable(): void { const u = this.session.currentUser(); if (u) this.mfa.disable(u.email, u.role); this.notice.set('Verificación desactivada.'); }
}
