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

/** Percentual (0–100) do arquivo que já saiu do navegador. */
export type UploadProgressHandler = (percent: number) => void;

const STORAGE_UPLOAD_ERROR = 'Falha ao enviar o arquivo para o armazenamento.';

/**
 * PUT direto no S3 pela URL pré-assinada: os bytes não passam pela API. Usa XMLHttpRequest, e não fetch, porque
 * só ele avisa quanto do corpo já foi enviado (`upload.onprogress`).
 */
export function uploadVideoToStorage(uploadUrl: string, file: File, onProgress?: UploadProgressHandler): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open('PUT', uploadUrl);
    // A URL é assinada com o Content-Type: o PUT precisa mandar o mesmo.
    request.setRequestHeader('Content-Type', file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(STORAGE_UPLOAD_ERROR));
      }
    };
    request.onerror = () => reject(new Error(STORAGE_UPLOAD_ERROR));
    request.send(file);
  });
}

export async function completeVideoJob(jobId: string, token: string): Promise<void> {
  await apiFetch(`/videos/${jobId}/complete`, { method: 'POST' }, token);
}

/** Cria o job, envia o arquivo ao S3 avisando o progresso e confirma o upload. Pular o `complete` deixa o job preso. */
export async function submitVideoForConversion(
  file: File,
  token: string,
  onProgress?: UploadProgressHandler
): Promise<string> {
  const { jobId, uploadUrl } = await createVideoJob(file, token);
  await uploadVideoToStorage(uploadUrl, file, onProgress);
  await completeVideoJob(jobId, token);
  return jobId;
}
