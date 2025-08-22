import fs from 'fs/promises';
import path from 'path';

// Simple file-based image storage
const IMAGE_DIR = path.join(process.cwd(), 'public', 'generated-images');

// Ensure the directory exists
async function ensureDir() {
  try {
    await fs.mkdir(IMAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating image directory:', error);
  }
}

export async function saveImage(imageId: string, base64Data: string): Promise<string> {
  await ensureDir();
  
  // Remove data URL prefix if present
  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  
  const filename = `${imageId}.png`;
  const filepath = path.join(IMAGE_DIR, filename);
  
  await fs.writeFile(filepath, buffer);
  
  // Return public URL
  return `/generated-images/${filename}`;
}

export async function loadImage(imageId: string): Promise<string | null> {
  try {
    const filepath = path.join(IMAGE_DIR, `${imageId}.png`);
    const buffer = await fs.readFile(filepath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error(`Error loading image ${imageId}:`, error);
    return null;
  }
}

export async function deleteImage(imageId: string): Promise<void> {
  try {
    const filepath = path.join(IMAGE_DIR, `${imageId}.png`);
    await fs.unlink(filepath);
  } catch (error) {
    console.error(`Error deleting image ${imageId}:`, error);
  }
}

export async function clearProjectImages(imageIds: string[]): Promise<void> {
  for (const id of imageIds) {
    await deleteImage(id);
  }
}