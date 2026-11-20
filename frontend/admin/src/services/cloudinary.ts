import { CLOUDINARY } from '@/config';

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Folder of a new file, the same as the mobile app and the backend's check (MEDIA_FOLDERS):
 *   society_app/<production|development>/events/<yyyy>/<mm>    event posters and images
 *   society_app/<production|development>/finance/<yyyy>/<mm>   donation proofs, expense bills
 *   society_app/<production|development>/branding               society logo, UPI QR code
 */
export function cloudinaryFolder(purpose: 'events' | 'finance' | 'branding') {
  const base = `${CLOUDINARY.rootFolder}/${CLOUDINARY.envFolder}/${purpose}`;
  if (purpose === 'branding') return base;
  const now = new Date();
  return `${base}/${now.getFullYear()}/${pad2(now.getMonth() + 1)}`;
}

/**
 * Uploads an image straight to Cloudinary (unsigned preset) and returns its link, e.g.
 * https://res.cloudinary.com/<cloud>/image/upload/v1/society_app/development/events/2026/11/poster-….jpg
 * The backend only stores the link after checking it is in the right folder.
 */
export async function uploadToCloudinary(file: File, folder: string): Promise<{ url: string }> {
  if (!CLOUDINARY.cloudName || !CLOUDINARY.uploadPreset) {
    throw new Error('Image upload is not set up: add the Cloudinary settings to .env.local.');
  }
  const name = `${file.type.startsWith('image/') ? 'image' : 'file'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY.uploadPreset);
  // asset_folder files it in the Media Library; public_id puts the same path in the link, which the backend checks
  form.append('asset_folder', folder);
  form.append('public_id', `${folder}/${name}`);

  let reply: { secure_url?: string; error?: { message?: string } };
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`, { method: 'POST', body: form });
    reply = await res.json();
  } catch {
    throw new Error('Upload failed. Check your internet connection and try again.');
  }
  if (!reply.secure_url) {
    const message = reply.error?.message ?? '';
    throw new Error(/file size/i.test(message) ? 'The image is too large.' : /format/i.test(message) ? 'This file type is not supported.' : 'Upload failed. Please try again.');
  }
  return { url: reply.secure_url };
}

/** Uploaders for <FileUpload upload={…} />: event posters, finance files (proofs, bills), branding (logo, QR) */
export const uploadEventImage = (file: File) => uploadToCloudinary(file, cloudinaryFolder('events'));
export const uploadFinanceFile = (file: File) => uploadToCloudinary(file, cloudinaryFolder('finance'));
export const uploadBrandingImage = (file: File) => uploadToCloudinary(file, cloudinaryFolder('branding'));
