import { launchImageLibrary } from 'react-native-image-picker';

/**
 * Opens the phone's photos and returns the chosen image as a data URL
 * ready to send to the server, scaled down to `maxSide` pixels. Returns
 * null if the person cancelled; throws an Error with a message for them
 * if the image can't be used.
 */
export async function pickImage({ maxSide, allowed, typeMessage }: { maxSide: number; allowed: string[]; typeMessage: string }): Promise<string | null> {
  let result;
  try {
    result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, includeBase64: true, maxWidth: maxSide, maxHeight: maxSide, quality: 0.8 });
  } catch {
    throw new Error('Could not open your photos.');
  }
  if (result.didCancel) return null;
  if (result.errorCode) throw new Error(result.errorMessage || 'Could not open your photos.');
  const asset = result.assets?.[0];
  const type = asset?.type === 'image/jpg' ? 'image/jpeg' : asset?.type;
  if (!asset?.base64 || !type || !allowed.includes(type)) throw new Error(typeMessage);
  return `data:${type};base64,${asset.base64}`;
}
