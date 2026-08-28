import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../auth/context/use-auth';
import { getVideoJobDownloadUrl, getVideoJobStatus, type VideoJobStatusResult } from '../api/job-status-api';
import { ApiError } from '../../../lib/http';
import './job-status-page.css';

const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES = new Set(['DONE', 'FAILED', 'EXPIRED']);

const STATUS_LABEL: Record<string, string> = {
  UPLOAD_PENDING: 'Aguardando upload',
  QUEUED: 'Na fila de processamento',
  PROCESSING: 'Convertendo',
  DONE: 'Finalizado',
  FAILED: 'Erro na conversão',
  EXPIRED: 'Expirado'
};

export function JobStatusPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { session } = useAuth();

  const [job, setJob] = useState<VideoJobStatusResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!jobId || !session) return;

    try {
      const result = await getVideoJobStatus(jobId, session.accessToken);
      setJob(result);
      setError(null);

      if (TERMINAL_STATUSES.has(result.status) && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível consultar o status do job.');
    }
  }, [jobId, session]);

  useEffect(() => {
    const initialFetch = setTimeout(() => void fetchStatus(), 0);
    pollRef.current = setInterval(() => void fetchStatus(), POLL_INTERVAL_MS);

    return () => {
      clearTimeout(initialFetch);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus]);

  async function handleDownload() {
    if (!jobId || !session) return;

    setDownloading(true);
    setError(null);

    try {
      const { downloadUrl } = await getVideoJobDownloadUrl(jobId, session.accessToken);
      window.location.assign(downloadUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao gerar o link de download.');
    } finally {
      setDownloading(false);
    }
  }

  const status = job?.status;
  const isProcessing = status === 'UPLOAD_PENDING' || status === 'QUEUED' || status === 'PROCESSING';
  const isDone = status === 'DONE';
  const isFailed = status === 'FAILED' || status === 'EXPIRED';

  return (
    <div className="page">
      <div className="card card--wide">
        <h1>Job #{jobId}</h1>
        <p className="subtitle">Compartilhe esta página para acompanhar a conversão</p>

        {error && <p className="error">{error}</p>}

        {job && (
          <div className={`status-box status-box--${status?.toLowerCase()}`}>
            {isProcessing && <span className="spinner" aria-hidden="true" />}
            <div className="status-box__text">
              <strong>{STATUS_LABEL[status ?? ''] ?? status}</strong>
              <span>{job.fileName}</span>
              {isFailed && job.failureReason && <span className="status-box__reason">{job.failureReason}</span>}
            </div>
          </div>
        )}

        {isDone && (
          <button type="button" className="btn-primary" onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Gerando link…' : 'Baixar .zip'}
          </button>
        )}
      </div>
    </div>
  );
}
