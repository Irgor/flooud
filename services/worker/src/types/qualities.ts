interface QualityConfig {
  name: string;
  width: number;
  height: number;
  vBitrate: string;
  maxrate: string;
  bufsize: string;
  aBitrate: string;
  codec: string;
}

const QUALITIES: QualityConfig[] = [
  {
    name: '480p',
    width: 854,
    height: 480,
    vBitrate: '1400k',
    maxrate: '1498k',
    bufsize: '2100k',
    aBitrate: '128k',
    codec: 'libx264',
  },
  {
    name: '720p',
    width: 1280,
    height: 720,
    vBitrate: '2500k',
    maxrate: '2675k',
    bufsize: '3750k',
    aBitrate: '128k',
    codec: 'libx264',
  },
  {
    name: '1080p',
    width: 1920,
    height: 1080,
    vBitrate: '5000k',
    maxrate: '5350k',
    bufsize: '7500k',
    aBitrate: '192k',
    codec: 'libx264',
  },
  {
    name: '4k',
    width: 3840,
    height: 2160,
    vBitrate: '14000k',
    maxrate: '14980k',
    bufsize: '21000k',
    aBitrate: '192k',
    codec: 'libx265',
  },
];

export { QUALITIES, type QualityConfig };
