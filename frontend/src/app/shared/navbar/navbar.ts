import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UsuarioActualService } from '../../services/usuario-actual.service';

// Barra de navegación: aparece en todas las pantallas.
// routerLink navega sin recargar la página; routerLinkActive marca la sección actual.
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
})
export class Navbar {
  readonly usuario = inject(UsuarioActualService);

  cambiarUsuario(evento: Event): void {
    this.usuario.cambiar(Number((evento.target as HTMLSelectElement).value));
  }
}
