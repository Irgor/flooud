export const renditionStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const;
export type RenditionStatus = (typeof renditionStatus)[keyof typeof renditionStatus];

export type Rendition = {
  id: string;
  mediaId: string;
  renditionStatus: RenditionStatus;
  quality: number;
  createdAt: Date;
};
