
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
})
export class Navbar {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
