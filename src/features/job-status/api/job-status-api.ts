import { API_URL, apiFetch } from '../../../lib/http';

export type VideoJobStatus = 'UPLOAD_PENDING' | 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED' | 'EXPIRED';

export interface VideoJobStatusResult {
  jobId: string;
  status: VideoJobStatus;
  fileName: string;
  progress?: number;
  failureReason?: string;
}

export interface VideoJobDownloadResult {
  downloadUrl: string;
}

export type VideoJobEvent =
  | { type: 'job.progress'; jobId: string; userId: number; percent: number }
  | { type: 'job.done'; jobId: string; userId: number; zipKey: string; frameCount: number }
  | { type: 'job.failed'; jobId: string; userId: number; reason: string }
  // Escrito pelo backend quando a assinatura no Redis falha (GetVideoJobEventsController).
  | { type: 'error'; message: string };

export async function getVideoJobStatus(jobId: string, token: string): Promise<VideoJobStatusResult> {
  const response = await apiFetch(`/videos/${jobId}`, { method: 'GET' }, token);
  return response.json() as Promise<VideoJobStatusResult>;
}

export async function getVideoJobDownloadUrl(jobId: string, token: string): Promise<VideoJobDownloadResult> {
  const response = await apiFetch(`/videos/${jobId}/download`, { method: 'GET' }, token);
  return response.json() as Promise<VideoJobDownloadResult>;
}

export async function cancelVideoJob(jobId: string, token: string): Promise<void> {
  await apiFetch(`/videos/${jobId}/cancel`, { method: 'POST' }, token);
}

/**
 * EventSource não permite headers customizados, então o token vai como query param (?token=),
 * consistente com o sseAuthMiddleware do backend — restrito a esta rota por isso mesmo.
 */
export function openVideoJobEventsStream(jobId: string, token: string): EventSource {
  const params = new URLSearchParams({ token });
  return new EventSource(`${API_URL}/videos/${jobId}/events?${params.toString()}`);
}
