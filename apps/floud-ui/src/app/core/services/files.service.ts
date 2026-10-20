import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {Media} from '@floud/types';

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

  baseUrl = window.location.origin + "/api";

  uploadFile(file: File): Observable<{ filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ filename: string }>(`${this.baseUrl}/media`, formData);
  }

  getFiles(): Observable<Media[]> {
    return this.http.get<Media[]>(`${this.baseUrl}/media`);
  }

  getFile(id: string): Observable<Media> {
    return this.http.get<Media>(`${this.baseUrl}/media/${id}`);
  }

  steramUrl(storageKey: string) {
    return `${this.baseUrl}/stream/${storageKey}/master.m3u8`;
  }
}
