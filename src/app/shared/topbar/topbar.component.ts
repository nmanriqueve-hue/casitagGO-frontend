import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent {
  readonly menuOpen = signal(false);

  constructor(readonly session: SessionService, private readonly router: Router) {}

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  dashboardRoute(): string {
    if (this.session.role() === 'host') return '/anfitrion';
    if (this.session.role() === 'admin') return '/administracion';
    return '/mis-reservas';
  }

  roleLabel(): string {
    const labels = { guest: 'Huésped', host: 'Anfitrión', admin: 'Administrador' };
    const role = this.session.role();
    return role ? labels[role] : '';
  }

  logout(): void {
    this.session.logout();
    this.closeMenu();
    this.router.navigate(['/']);
  }
}
