import { Component, computed, inject, type OnDestroy, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { FilesService } from '../../core/services/files.service';

@Component({
  selector: 'app-home',
  imports: [ButtonModule, FileUploadModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnDestroy {
  private fileService = inject(FilesService);

  selectedFile = signal<File | null>(null);

  filePreview = computed(() => {
    const file = this.selectedFile();
    return file ? URL.createObjectURL(file) : undefined;
  });

  fileType = computed(() => {
    const type = this.selectedFile()?.type;
    if (type?.includes('video')) return 'video';
    if (type?.includes('image')) return 'image';
    return 'unknown';
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files?.[0]) {
      const file = input.files[0];
      this.selectedFile.set(file);
    }
  }

  async uploadImage(): Promise<void> {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    if (this.fileType() === 'video') {
      this.fileService.uploadFile(file).subscribe();
      return;
    }

    this.fileService.uploadFile(file).subscribe();
  }

  ngOnDestroy(): void {
    if (this.filePreview() && typeof this.filePreview() === 'string') {
      console.log(`Revoke: ${this.filePreview()}`);
      URL.revokeObjectURL(this.filePreview()!);
    }
  }
}
