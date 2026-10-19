import {
  Component,
  computed,
  inject,
  type OnDestroy,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FilesService } from '../../core/services/files.service';
import fa from '@angular/common/locales/fa';
import fi from '@angular/common/locales/fi';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './home.scss',
})
export class Home implements OnDestroy {
  private fileService = inject(FilesService);

  selectedFile = signal<File | null>(null);

  uploading = signal(false);
  fileInvalid = signal(false);

  uploadDisabled = computed(() => {
    return this.uploading() || this.fileInvalid();
  })

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
    const file = input.files?.[0]

    if(!file) {
      this.fileInvalid.set(true);
      return;
    }

    if(file.type == 'text/javascript') {
      this.fileInvalid.set(true);
      input.files = null;
      return;
    }

    this.selectedFile.set(file);
    this.fileInvalid.set(false);

  }

  async uploadImage(): Promise<void> {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.uploading.set(true);

    this.fileService.uploadFile(file).subscribe(res => this.uploading.set(false));
  }

  ngOnDestroy(): void {
    if (this.filePreview() && typeof this.filePreview() === 'string') {
      console.log(`Revoke: ${this.filePreview()}`);
      URL.revokeObjectURL(this.filePreview()!);
    }
  }
}
