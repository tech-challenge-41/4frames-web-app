import { apiFetch } from '../../../lib/http';

export async function downloadFile(fileId: string, token: string): Promise<Blob> {
  const response = await apiFetch(`/files/${fileId}`, { method: 'GET' }, token);
  return response.blob();
}
