import { Component, computed, inject, type OnInit, signal } from '@angular/core';
import { FilesService } from '../../core/services/files.service';
import { VideoPlayer } from '../../shared/components/video-player/video-player';
import type { Media } from '@floud/types';

@Component({
  selector: 'app-files',
  imports: [VideoPlayer],
  templateUrl: './files.html',
  styleUrl: './files.scss',
})
export class Files implements OnInit {
  private fileService = inject(FilesService);

  files = signal<Media[]>([]);

  selectedMedia = signal<Media | null>(null);
  mediaUrl = computed(() => {
    return `http://localhost:3000/view/${this.selectedMedia()?.id}`;
  });
  fileType = computed(() => {
    const mime = this.selectedMedia()?.mime;
    const types = ['image', 'video'];
    if(!mime) {
      return null;
    }

    for(const type of types) {
      if(mime.includes(type)){
        return type;
      }
    }

    return 'file';
  })

  ngOnInit(): void {
    this.fileService.getFiles().subscribe((res) => {
      this.files.set(res);
    });
  }

  loadMedia(media: Media): void {
    this.selectedMedia.set(media);
  }
}
