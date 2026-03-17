import sharp from 'sharp';
import fs from 'fs';

async function resize() {
  const input = 'public/clippy-icon.png';

  // Favicon sizes: 16, 32
  await sharp(input).resize(16, 16).toFile('public/favicon-16x16.png');
  await sharp(input).resize(32, 32).toFile('public/favicon-32x32.png');

  // README title size (arbitrary, let's say 200px for "top center")
  await sharp(input).resize(200).toFile('public/clippy-title.png');

  // Control panel icon size (16px)
  await sharp(input).resize(16, 16).toFile('public/clippy-ui-16.png');
}

resize().catch(console.error);
