import { Component } from '@angular/core';
import { CameraComponent } from './camera/camera.component';

@Component({
  selector: 'app-root',
  imports: [CameraComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'myapp';
}
