import { apiFetch } from '../../../lib/http';

export interface VideoJobListItem {
  jobId: string;
  fileName: string;
  status: string;
  createdAt: string;
  failureReason?: string;
  hasDownload: boolean;
}

export interface ListVideoJobsResult {
  items: VideoJobListItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function listVideoJobs(token: string, offset = 0, limit = 20): Promise<ListVideoJobsResult> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  const response = await apiFetch(`/videos?${params.toString()}`, { method: 'GET' }, token);
  return response.json() as Promise<ListVideoJobsResult>;
}
