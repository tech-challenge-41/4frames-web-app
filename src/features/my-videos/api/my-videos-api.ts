import { apiFetch } from '../../../lib/http';

export interface VideoJobListItem {
  jobId: string;
  fileName: string;
  status: string;
  createdAt: string;
  failureReason?: string;
  hasDownload: boolean;
  /** Percentual (0–100) do processamento. A API só manda em PROCESSING, depois do primeiro progresso do worker. */
  progress?: number;
}

export interface ListVideoJobsResult {
  items: VideoJobListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface VideoJobDownloadResult {
  downloadUrl: string;
}

export async function listVideoJobs(token: string, offset = 0, limit = 20): Promise<ListVideoJobsResult> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  const response = await apiFetch(`/videos?${params.toString()}`, { method: 'GET' }, token);
  return response.json() as Promise<ListVideoJobsResult>;
}

/** URL pré-assinada do .zip de um job DONE. */
export async function getDownloadUrl(jobId: string, token: string): Promise<VideoJobDownloadResult> {
  const response = await apiFetch(`/videos/${jobId}/download`, { method: 'GET' }, token);
  return response.json() as Promise<VideoJobDownloadResult>;
}
