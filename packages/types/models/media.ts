import type { Quality } from './qualities.ts';

export const mediaStatus = {
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export type MediaStatus = (typeof mediaStatus)[keyof typeof mediaStatus];

export type Media = {
  id: string;
  storageKey: string;
  originalName: string;
  mime: string;
  width: string | null;
  height: string | null;
  resolution: string | null;
  codec: string | null;
  colorFormat: string | null;
  bitrateMbps: number | null;
  aspectRatio: string | null;
  originalQuality: number | null;
  sizeBytes: number | null;
  status: MediaStatus;
  createdAt: string;
};

export type Metadata = {
  resolution: string;
  codec: string;
  colorFormat: string;
  bitrateMbps: number;
  height: string;
  width: string;
  sizeBytes: number;
  aspectRatio: string;
  originalQuality: Quality;
};
