import { apiFetch } from '../../../lib/http';

export type VideoJobStatus = 'UPLOAD_PENDING' | 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED' | 'EXPIRED';

export interface VideoJobStatusResult {
  jobId: number;
  status: VideoJobStatus;
  fileName: string;
  progress?: number;
  failureReason?: string;
}

export interface VideoJobDownloadResult {
  downloadUrl: string;
}

export async function getVideoJobStatus(jobId: string, token: string): Promise<VideoJobStatusResult> {
  const response = await apiFetch(`/videos/${jobId}`, { method: 'GET' }, token);
  return response.json() as Promise<VideoJobStatusResult>;
}

export async function getVideoJobDownloadUrl(jobId: string, token: string): Promise<VideoJobDownloadResult> {
  const response = await apiFetch(`/videos/${jobId}/download`, { method: 'GET' }, token);
  return response.json() as Promise<VideoJobDownloadResult>;
}
