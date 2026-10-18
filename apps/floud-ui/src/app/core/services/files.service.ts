import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { Media } from '../../shared/types/Media';

export type Metadata = {
  width: number;
  height: number;
  quality: number;
};

@Injectable({
  providedIn: 'root',
})
export class FilesService {
  private http = inject(HttpClient);

  baseUrl = 'http://localhost:3000';

  uploadFile(file: File): Observable<{ filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ filename: string }>(`${this.baseUrl}/media`, formData);
  }

  getFiles(): Observable<Media[]> {
    return this.http.get<Media[]>(`${this.baseUrl}/media`);
  }

  steramUrl(storageKey: string) {
    return `${this.baseUrl}/stream/${storageKey}/master.m3u8`;
  }
}
