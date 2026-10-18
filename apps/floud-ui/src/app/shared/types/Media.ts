export type Media = {
  id: string;
  storageKey: string;
  originalName: string;
  mime: string;
  sizeBytes: number;
  status: 'uploading' | 'ready' | 'failed';
  createdAt: Date;
};
