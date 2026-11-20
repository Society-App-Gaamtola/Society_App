import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

/** Uploads one file with the given uploader (e.g. uploadToCloudinary) and shows its error as a toast */
export const useUpload = (upload: (file: File) => Promise<{ url: string }>) =>
  useMutation({
    mutationFn: upload,
    onError: (error: Error) => toast.error(error.message),
  });
