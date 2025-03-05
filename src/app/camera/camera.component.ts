import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CameraService } from './services/camera.service';
import { AlertController } from '@ionic/angular';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-camera',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './camera.component.html',
  styleUrl: './camera.component.css'
})
export class CameraComponent implements OnInit {
  imgUrl: string = '';
  gallery: string[] = [];
  errorMessage: string = '';
  loading: boolean = false;

  constructor(
    private cameraService: CameraService,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    await this.loadGallery();
  }

  async loadGallery() {
    // Check permissions and load gallery
    const hasPermission = await this.cameraService.checkAndRequestPermissions();
    if (hasPermission) {
      this.gallery = this.cameraService.getGallery();
    }
  }

  async takePicture() {
    this.errorMessage = '';
    this.loading = true;

    try {
      const imageUrl = await this.cameraService.takePicture();

      if (!imageUrl) {
        throw new Error('No valid image obtained');
      }

      this.imgUrl = imageUrl;
      this.gallery = this.cameraService.getGallery();
    } catch (error) {
      console.error('Error capturing image:', error);
      this.errorMessage = error instanceof Error ? error.message : String(error);

      // Show error alert
      const alert = await this.alertController.create({
        header: 'Error',
        message: this.errorMessage,
        buttons: ['OK']
      });

      await alert.present();
    } finally {
      this.loading = false;
    }
  }

  resetCamera() {
    this.imgUrl = '';
  }

  async deletePhoto(photoUrl: string) {
    try {
      await this.cameraService.deletePhoto(photoUrl);
      this.gallery = this.cameraService.getGallery();

      // If deleted photo is the current image, reset
      if (this.imgUrl === photoUrl) {
        this.imgUrl = '';
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  }

  async clearGallery() {
    try {
      await this.cameraService.clearGallery();
      this.gallery = [];
      this.imgUrl = '';
    } catch (error) {
      console.error('Error clearing gallery:', error);
    }
  }
}