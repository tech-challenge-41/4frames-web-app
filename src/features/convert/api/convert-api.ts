import { apiFetch } from '../../../lib/http';

export interface CreateVideoJobResult {
  jobId: string;
  uploadUrl: string;
  expiresIn: number;
}

/** Limite de envios simultâneos na tela de conversão (cada um gera um job independente na fila). */
export const MAX_BATCH_UPLOAD_FILES = 10;

const ALLOWED_CONTENT_TYPES = ['video/mp4', 'video/quicktime'] as const;

export function isAllowedVideoType(file: File): boolean {
  return (ALLOWED_CONTENT_TYPES as readonly string[]).includes(file.type);
}

export async function createVideoJob(file: File, token: string): Promise<CreateVideoJobResult> {
  const response = await apiFetch(
    '/videos',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type
      })
    },
    token
  );

  return response.json() as Promise<CreateVideoJobResult>;
}

export async function uploadVideoToStorage(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file
  });

  if (!response.ok) {
    throw new Error('Falha ao enviar o arquivo para o armazenamento.');
  }
}

export async function completeVideoJob(jobId: string, token: string): Promise<void> {
  await apiFetch(`/videos/${jobId}/complete`, { method: 'POST' }, token);
}

export async function submitVideoForConversion(file: File, token: string): Promise<string> {
  const { jobId, uploadUrl } = await createVideoJob(file, token);
  await uploadVideoToStorage(uploadUrl, file);
  await completeVideoJob(jobId, token);
  return jobId;
}
