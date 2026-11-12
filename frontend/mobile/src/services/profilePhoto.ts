import * as ImagePicker from 'expo-image-picker';
import { MEDIA } from '../config';
import type { ImageFile } from '../api/auth';

// The photo is shrunk before upload, so the limit is Cloudinary's (10MB) rather than the old 2MB
const MAX_PHOTO_BYTES = MEDIA.maxBytes.image;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

const mimeFromName = (name: string) => {
  const ext = name.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  return undefined;
};

type PickResult = { photo: ImageFile } | { error: string } | null;

/** Opens the gallery. Returns null when the user cancels. */
export async function pickProfilePhoto(): Promise<PickResult> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const type = asset.mimeType ?? mimeFromName(asset.fileName ?? asset.uri);
  if (!type || !ALLOWED_TYPES.includes(type)) return { error: 'Only JPG or PNG images are allowed.' };
  if (asset.fileSize && asset.fileSize > MAX_PHOTO_BYTES) return { error: 'Image must be smaller than 10MB.' };

  const name = asset.fileName ?? `profile.${type === 'image/png' ? 'png' : 'jpg'}`;
  return { photo: { uri: asset.uri, name, type: type === 'image/jpg' ? 'image/jpeg' : type } };
}
