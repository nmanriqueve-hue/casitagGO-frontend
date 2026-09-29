import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './shared/footer/footer.component';
import { ToastComponent } from './shared/toast/toast.component';
import { TopbarComponent } from './shared/topbar/topbar.component';

@Component({
  imports: [RouterOutlet, TopbarComponent, FooterComponent, ToastComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
