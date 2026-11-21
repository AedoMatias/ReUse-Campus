import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Se muestra cuando la URL no coincide con ninguna ruta
@Component({
  selector: 'app-no-encontrada',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <h1>Página no encontrada</h1>
      <p>La dirección que buscas no existe.</p>
      <a routerLink="/" class="boton">Ir al inicio</a>
    </section>
  `,
})
export class NoEncontrada {}
