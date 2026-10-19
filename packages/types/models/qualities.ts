export const qualities = [480, 720, 1080, 2160] as const;
export type Quality = (typeof qualities)[number];

export const HLS_QUALITY_PRESETS = {
  2160: {
    resolution: '3840x2160',
    bufSize: 21000,
    maxBitrate: 15000,
    audioBitrate: 320,
  },
  1080: {
    resolution: '1920x1080',
    bufSize: 7500,
    maxBitrate: 5350,
    audioBitrate: 192,
  },
  720: {
    resolution: '1280x720',
    bufSize: 4200,
    maxBitrate: 3000,
    audioBitrate: 128,
  },
  480: {
    resolution: '854x480',
    bufSize: 2100,
    maxBitrate: 1500,
    audioBitrate: 128,
  },
} as const;
