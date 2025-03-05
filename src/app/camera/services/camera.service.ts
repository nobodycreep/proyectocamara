import { Injectable } from '@angular/core';
import { Platform } from '@angular/cdk/platform';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private gallery: string[] = [];

  constructor(
    private platform: Platform,
    private alertController: AlertController
  ) {
    this.loadGallery();
  }

  async checkAndRequestPermissions(): Promise<boolean> {
    try {
      // Different approach for web and mobile platforms
      if (Capacitor.isNativePlatform()) {
        const permissionStatus = await Camera.requestPermissions();
        return permissionStatus.camera === 'granted';
      } else {
        // For web, we'll use the browser's camera permission API
        if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
          try {
            await navigator.mediaDevices.getUserMedia({ video: true });
            return true;
          } catch (error) {
            console.error('Web camera permission denied', error);
            await this.showPermissionAlert();
            return false;
          }
        }
        return false;
      }
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      await this.showPermissionAlert();
      return false;
    }
  }

  async takePicture(): Promise<string | null> {
    try {
      // Verificar permisos
      const hasPermission = await this.checkAndRequestPermissions();
      if (!hasPermission) {
        throw new Error('Permisos de cámara denegados');
      }

      // Tomar la foto
      let photo: Photo;
      if (Capacitor.isNativePlatform()) {
        photo = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera
        });
      } else {
        photo = await this.takePictureWeb();
      }

      if (!photo.webPath) {
        throw new Error('No se obtuvo una imagen válida');
      }

      // Generar un nombre de archivo único
      const fileName = new Date().getTime() + '.jpeg';

      // Convertir la imagen a base64
      const base64Data = await this.readAsBase64(photo);

      // Guardar la imagen en el sistema de archivos
      let savedFile;
      if (Capacitor.isNativePlatform()) {
        savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents
        });
      } else {
        // Para web, usar localStorage
        savedFile = { uri: base64Data };
      }

      // Agregar a la galería
      this.gallery.push(savedFile.uri);
      this.saveGallery();

      return savedFile.uri;
    } catch (error) {
      console.error('Error al capturar imagen:', error);
      await this.showErrorAlert('Error al capturar la imagen');
      return null;
    }
  }

  // Método web-específico para capturar imagen
  private takePictureWeb(): Promise<Photo> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';

      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            resolve({
              webPath: dataUrl,
              format: 'jpeg'
            } as Photo);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }
      };

      input.click();
    });
  }

  // Convertir imagen a base64
  private async readAsBase64(photo: Photo): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      const response = await fetch(photo.webPath!);
      const blob = await response.blob();
      return await this.convertBlobToBase64(blob) as string;
    }
    return photo.webPath || '';
  }

  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  // Guardar la galería en el almacenamiento local
  private saveGallery() {
    try {
      localStorage.setItem('photo_gallery', JSON.stringify(this.gallery));
    } catch (error) {
      console.error('Error al guardar la galería:', error);
    }
  }

  // Cargar la galería desde el almacenamiento local
  private loadGallery() {
    try {
      const savedGallery = localStorage.getItem('photo_gallery');
      this.gallery = savedGallery ? JSON.parse(savedGallery) : [];
    } catch (error) {
      console.error('Error al cargar la galería:', error);
      this.gallery = [];
    }
  }

  // Obtener la galería
  getGallery(): string[] {
    return this.gallery;
  }

  // Eliminar una foto específica
  async deletePhoto(photoUrl: string) {
    try {
      if (Capacitor.isNativePlatform()) {
        // Eliminar del sistema de archivos
        await Filesystem.deleteFile({
          path: photoUrl,
          directory: Directory.Documents
        });
      }

      // Eliminar de la galería
      this.gallery = this.gallery.filter(url => url !== photoUrl);
      this.saveGallery();
    } catch (error) {
      console.error('Error al eliminar la foto:', error);
    }
  }

  // Eliminar toda la galería
  async clearGallery() {
    try {
      if (Capacitor.isNativePlatform()) {
        // Eliminar todas las fotos del sistema de archivos
        for (const photoUrl of this.gallery) {
          await Filesystem.deleteFile({
            path: photoUrl,
            directory: Directory.Documents
          });
        }
      }

      // Limpiar la galería
      this.gallery = [];
      this.saveGallery();
    } catch (error) {
      console.error('Error al limpiar la galería:', error);
    }
  }

  // Método para mostrar alerta de permisos
  private async showPermissionAlert() {
    const alert = await this.alertController.create({
      header: 'Permisos de Cámara',
      message: 'La aplicación necesita permisos de cámara para funcionar. Por favor, habilite los permisos en la configuración de la aplicación.',
      buttons: ['OK']
    });

    await alert.present();
  }

  // Método para mostrar alerta de error
  private async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });

    await alert.present();
  }
}