export const stickerConfig = () => ({
  maxSize: parseInt(process.env.STICKER_MAX_SIZE || '524288', 10), // 512KB
  recommendedSide: parseInt(process.env.STICKER_RECOMMENDED_SIDE || '320', 10),
  maxSide: parseInt(process.env.STICKER_MAX_SIDE || '1024', 10),
  maxDurationMs: parseInt(process.env.STICKER_MAX_DURATION_MS || '5000', 10),
  folder: process.env.MEDIA_STICKER_FOLDER || 'stickers',
});
