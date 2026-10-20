import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FilesService } from '../../core/services/files.service';
import { VideoPlayer } from '../../shared/components/video-player/video-player';
import { mediaStatus, type Media } from '@floud/types';
import { toSignal } from '@angular/core/rxjs-interop';
import { exhaustMap, interval, startWith, takeWhile } from 'rxjs';

@Component({
  selector: 'app-files',
  imports: [VideoPlayer],
  templateUrl: './files.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './files.scss',
})
export class Files {
  private fileService = inject(FilesService);

  $files = toSignal(
    interval(1000).pipe(
      startWith(0),
      exhaustMap((_) => this.fileService.getFiles()),
      takeWhile(
        (medias) =>
          medias.some(
            (media) =>
              media.status == mediaStatus.PROCESSING || media.status == mediaStatus.UPLOADING,
          ),
        true,
      ),
    ),
  );

  selectedMedia = signal<Media | null>(null);
  mediaUrl = computed(() => {
    return `${window.location.origin}/view/${this.selectedMedia()?.id}`;
  });
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
}
