import { adapter } from './core/adapter';

export const uploadService = {
  uploadFile: (file: File) => adapter.upload(file),
};
