import { Component, computed, inject, signal, ChangeDetectionStrategy, effect } from '@angular/core';
import { FilesService } from '../../core/services/files.service';
import { VideoPlayer } from '../../shared/components/video-player/video-player';
import { mediaStatus, type Media } from '@floud/types';
import { toSignal } from '@angular/core/rxjs-interop';
import { exhaustMap, interval, startWith, takeWhile } from 'rxjs';
import { httpResource } from '@angular/common/http';

@Component({
  selector: 'app-files',
  imports: [VideoPlayer],
  templateUrl: './files.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './files.scss',
})
export class Files {
  private fileService = inject(FilesService);

  files = httpResource<Media[]>(() => '/api/media', { defaultValue: [] });

  selectedMedia = signal<Media | null>(null);

  fileType = computed(() => {
    const mime = this.selectedMedia()?.mime;
    const types = ['image', 'video'];
    if (!mime) {
      return null;
    }

    for (const type of types) {
      if (mime.includes(type)) {
        return type;
      }
    }

    return 'file';
  });

  constructor() {
    effect((onCleanup) => {
      if(!this.files.hasValue()) return;

      if(!this.files.value().some(m => m.status == mediaStatus.PROCESSING || m.status == mediaStatus.UPLOADING,)) return;

      const t = setTimeout(() => this.files.reload(), 1000);
      onCleanup(() => clearTimeout(t));
    })
  }

  loadMedia(media: Media): void {
    if (media.status === mediaStatus.READY || media.playable) {
      this.selectedMedia.set(media);
    }
  }

  displayMediaStatus(media: Media) {
    if (media.playable && media.status !== mediaStatus.READY) {
      return 'Playable';
    }

    return media.status.substring(0, 1).toUpperCase() + media.status.substring(1);
  }

  viewUrl(id: string) {
    return `${window.location.origin}/api/view/${id}`;
  }

  relaod() {

  }
}
