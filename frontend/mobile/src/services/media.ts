import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { createUploadTask, FileSystemUploadType } from 'expo-file-system/legacy';
import { CLOUDINARY, MEDIA } from '../config';
import { createId } from '../utils/format';

export type MediaKind = 'image' | 'video';

/** A photo or video picked on the phone. */
export type LocalMedia = { uri: string; kind: MediaKind; mimeType?: string; fileSize?: number };

/** What Cloudinary gives back; the link is what the backend stores. */
export type UploadedMedia = { url: string; publicId: string; kind: MediaKind; bytes: number; thumbnailUrl?: string };

export class UploadError extends Error {}

const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))}MB`;
const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Folder for a new file in Cloudinary:
 *   society_app/<production|development>/profiles/user_<id>
 *   society_app/<production|development>/gallery/<yyyy>/<mm>   (by month, so no folder grows too big)
 */
export const mediaFolder = (purpose: 'profile' | 'gallery', userId?: string) => {
  const base = `${CLOUDINARY.rootFolder}/${CLOUDINARY.envFolder}`;
  if (purpose === 'profile') return `${base}/profiles/user_${userId ?? 'unknown'}`;
  const now = new Date();
  return `${base}/gallery/${now.getFullYear()}/${pad2(now.getMonth() + 1)}`;
};

/**
 * Photos are re-saved as JPEG, and shrunk when bigger than MEDIA.maxImageSide (never enlarged):
 * a 12MB camera photo becomes about 1–2MB, much quicker on mobile data.
 */
async function shrinkImage(uri: string) {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const { width, height } = original;
  const image =
    Math.max(width, height) > MEDIA.maxImageSide
      ? await ImageManipulator.manipulate(original)
          .resize(width >= height ? { width: MEDIA.maxImageSide } : { height: MEDIA.maxImageSide })
          .renderAsync()
      : original;
  const result = await image.saveAsync({ compress: MEDIA.imageQuality, format: SaveFormat.JPEG });
  return { uri: result.uri, mimeType: 'image/jpeg' };
}

/**
 * Uploads one file straight to Cloudinary (unsigned preset) into `folder` and returns its link,
 * e.g. https://res.cloudinary.com/<cloud>/image/upload/v1/society_app/production/gallery/2026/11/image-…jpg
 * The file streams from disk, so even a 100MB video never sits in the app's memory. onProgress gets 0–1.
 */
export async function uploadMedia(media: LocalMedia, folder: string, onProgress?: (fraction: number) => void): Promise<UploadedMedia> {
  const limit = MEDIA.maxBytes[media.kind];
  // Videos can't be shrunk on the phone, so a video that is too big is refused before anything is sent
  if (media.kind === 'video' && media.fileSize && media.fileSize > limit) {
    throw new UploadError(`Videos must be smaller than ${mb(limit)}. Please trim the video and try again.`);
  }

  const file = media.kind === 'image' ? await shrinkImage(media.uri) : { uri: media.uri, mimeType: media.mimeType ?? 'video/mp4' };

  const task = createUploadTask(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/${media.kind}/upload`,
    file.uri,
    {
      httpMethod: 'POST',
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: file.mimeType,
      // asset_folder files it in the Media Library; public_id puts the same path in the link, which the backend checks
      parameters: { upload_preset: CLOUDINARY.uploadPreset, asset_folder: folder, public_id: `${folder}/${createId(media.kind)}` },
    },
    ({ totalBytesSent, totalBytesExpectedToSend }) => {
      if (totalBytesExpectedToSend > 0) onProgress?.(totalBytesSent / totalBytesExpectedToSend);
    },
  );

  let result: Awaited<ReturnType<typeof task.uploadAsync>>;
  try {
    result = await task.uploadAsync();
  } catch {
    throw new UploadError('Upload failed. Check your internet connection and try again.');
  }
  if (!result) throw new UploadError('Upload was cancelled.');

  let reply: Record<string, any>;
  try {
    reply = JSON.parse(result.body);
  } catch {
    throw new UploadError('Upload failed. Please try again.');
  }
  if (result.status < 200 || result.status >= 300) {
    const message: string = reply?.error?.message ?? '';
    throw new UploadError(
      /file size too large/i.test(message)
        ? `File is too large. The limit is ${mb(limit)}.`
        : /format/i.test(message)
          ? 'This file type is not supported.'
          : /preset/i.test(message)
            ? 'Uploads are not set up yet. Please contact the admin.'
            : 'Upload failed. Please try again.',
    );
  }

  onProgress?.(1);
  const url: string = reply.secure_url;
  return {
    url,
    publicId: reply.public_id,
    kind: media.kind,
    bytes: reply.bytes,
    // A still frame from the first second of the video, made by Cloudinary when first requested
    thumbnailUrl: media.kind === 'video' ? url.replace('/video/upload/', '/video/upload/so_1/').replace(/\.[a-z0-9]+$/i, '.jpg') : undefined,
  };
}

/**
 * The same Cloudinary image, resized and in the best format for the phone (WebP/AVIF), e.g. 400px wide for a grid tile.
 * Other links are returned unchanged.
 */
export const cdnImage = (url: string | null | undefined, width: number) =>
  url && url.includes('res.cloudinary.com/') && url.includes('/upload/')
    ? url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${Math.round(width)}/`)
    : (url ?? null);
