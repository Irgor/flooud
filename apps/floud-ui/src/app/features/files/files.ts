import { Component, computed, inject, type OnInit, signal } from '@angular/core';
import { FilesService } from '../../core/services/files.service';
import { VideoPlayer } from '../../shared/components/video-player/video-player';
import type { Media } from '../../shared/types/Media';

@Component({
  selector: 'app-files',
  imports: [VideoPlayer],
  templateUrl: './files.html',
  styleUrl: './files.scss',
})
export class Files implements OnInit {
  private fileService = inject(FilesService);

  files = signal<Media[]>([]);
  fileType = signal<'image' | 'video' | null>(null);
  selectedMedia = signal<Media | null>(null);
  streamUrl = computed(() => {
    return `http://localhost:3000/stream/${this.selectedMedia()?.storageKey}`;
  });

  ngOnInit(): void {
    this.fileService.getFiles().subscribe((res) => {
      this.files.set(res);
    });
  }

  loadMedia(media: Media): void {
    const type = media.mime.includes('image') ? 'image' : 'video';
    this.fileType.set(type);
    this.selectedMedia.set(media);
  }
}
