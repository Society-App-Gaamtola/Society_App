import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { uploadService } from '@/services/upload';

export const useUpload = () =>
  useMutation({
    mutationFn: uploadService.uploadFile,
    onError: (error: Error) => toast.error(error.message),
  });
