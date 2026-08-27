import { apiFetch } from '../../../lib/http';

export interface UploadedFile {
  id: string;
  fileName: string;
}

export async function uploadFile(file: File, token: string): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiFetch(
    '/files',
    {
      method: 'POST',
      body: formData
    },
    token
  );

  return response.json() as Promise<UploadedFile>;
}
