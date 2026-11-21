import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

// Barra de navegación: aparece en todas las pantallas.
// routerLink navega sin recargar la página; routerLinkActive marca la sección actual.
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
})
export class Navbar {}
