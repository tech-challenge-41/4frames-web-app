import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../auth/context/use-auth';
import {
  cancelVideoJob,
  getVideoJobDownloadUrl,
  getVideoJobStatus,
  openVideoJobEventsStream,
  type VideoJobEvent,
  type VideoJobStatusResult
} from '../api/job-status-api';
import { ApiError } from '../../../lib/http';
import { STATUS_LABEL } from '../status-label';
import './job-status-page.css';

const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES = new Set(['DONE', 'FAILED', 'EXPIRED']);
const CANCELABLE_STATUSES = new Set(['UPLOAD_PENDING', 'QUEUED']);

export function JobStatusPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { session } = useAuth();

  const [job, setJob] = useState<VideoJobStatusResult | null>(null);
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  // O backend reaproveita o status EXPIRED para "cancelado pelo usuário" (não há um status
  // CANCELLED dedicado). Guardamos localmente que fomos nós que cancelamos para não mostrar
  // "Expirado" como se o job tivesse falhado sozinho.
  const [wasCanceledByUser, setWasCanceledByUser] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

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

  useEffect(() => {
    if (!jobId || !session || job?.status !== 'PROCESSING') return;

    const eventSource = openVideoJobEventsStream(jobId, session.accessToken);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data) as VideoJobEvent;

      if (payload.type === 'job.progress') {
        setProgress(payload.percent);
      } else if (payload.type === 'job.done' || payload.type === 'job.failed') {
        eventSource.close();
        eventSourceRef.current = null;
        void fetchStatus();
      } else if (payload.type === 'error') {
        // Falha ao assinar o canal no backend (ex.: Redis fora do ar): o servidor já encerra o
        // stream depois deste evento. O polling de GET /videos/:jobId segue como fonte de status.
        eventSource.close();
        eventSourceRef.current = null;
      }
    };

    // O EventSource reconecta sozinho por padrão; o polling de GET /videos/:jobId continua
    // sendo a fonte de verdade para status, então um erro de conexão aqui não é fatal.
    eventSource.onerror = () => {
      // ignora: reconexão automática do EventSource
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setProgress(undefined);
    };
  }, [jobId, session, job?.status, fetchStatus]);

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

  async function handleCancel() {
    if (!jobId || !session) return;

    setCanceling(true);
    setError(null);

    try {
      await cancelVideoJob(jobId, session.accessToken);
      setWasCanceledByUser(true);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao cancelar o job.');
    } finally {
      setCanceling(false);
    }
  }

  const status = job?.status;
  const isProcessing = status === 'UPLOAD_PENDING' || status === 'QUEUED' || status === 'PROCESSING';
  const isDone = status === 'DONE';
  const isCanceled = status === 'EXPIRED' && wasCanceledByUser;
  const isFailed = (status === 'FAILED' || status === 'EXPIRED') && !isCanceled;
  const isCancelable = status !== undefined && CANCELABLE_STATUSES.has(status);
  // O SSE traz o percentual ao vivo; até o primeiro evento, vale o que o GET /videos/:jobId trouxe.
  const shownProgress = progress ?? job?.progress;
  const showProgressBar = status === 'PROCESSING' && shownProgress !== undefined;
  const statusLabel = isCanceled ? 'Cancelado' : (STATUS_LABEL[status ?? ''] ?? status);
  const statusBoxModifier = isCanceled ? 'canceled' : status?.toLowerCase();

  return (
    <div className="page">
      <div className="card card--wide">
        <h1>Job #{jobId}</h1>
        <p className="subtitle">Compartilhe esta página para acompanhar a conversão</p>

        {error && <p className="error">{error}</p>}

        {job && (
          <div className={`status-box status-box--${statusBoxModifier}`}>
            {isProcessing && !showProgressBar && <span className="spinner" aria-hidden="true" />}
            <div className="status-box__text">
              <strong>{statusLabel}</strong>
              <span>{job.fileName}</span>
              {isFailed && job.failureReason && <span className="status-box__reason">{job.failureReason}</span>}
            </div>
          </div>
        )}

        {showProgressBar && (
          <progress className="job-progress" value={shownProgress} max={100} aria-label="Progresso da conversão" />
        )}

        {isDone && (
          <button type="button" className="btn-primary" onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Gerando link…' : 'Baixar .zip'}
          </button>
        )}

        {isCancelable && (
          <button type="button" className="btn-secondary" onClick={handleCancel} disabled={canceling}>
            {canceling ? 'Cancelando…' : 'Cancelar'}
          </button>
        )}
      </div>
    </div>
  );
}
