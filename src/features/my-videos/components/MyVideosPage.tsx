import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/use-auth';
import { getDownloadUrl, listVideoJobs, type VideoJobListItem } from '../api/my-videos-api';
import { isActiveJobStatus, STATUS_LABEL } from '../../job-status/status-label';
import { formatDateTime } from '../../../lib/format';
import { ApiError } from '../../../lib/http';
import { navigateTo } from '../../../lib/navigation';
import './my-videos-page.css';

const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 3000;

export function MyVideosPage() {
  const { session } = useAuth();

  const [items, setItems] = useState<VideoJobListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (offset: number) => {
      if (!session) return;

      try {
        const result = await listVideoJobs(session.accessToken, offset, PAGE_SIZE);
        setItems((prev) => (offset === 0 ? result.items : [...prev, ...result.items]));
        setTotal(result.total);
        setError(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar seus vídeos.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [session]
  );

  const refreshVisibleJobs = useCallback(async () => {
    if (!session) return;

    const limit = Math.max(items.length, PAGE_SIZE);

    try {
      const result = await listVideoJobs(session.accessToken, 0, limit);
      setItems(result.items);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar seus vídeos.');
    }
  }, [session, items.length]);

  useEffect(() => {
    const initialFetch = setTimeout(() => void fetchPage(0), 0);
    return () => clearTimeout(initialFetch);
  }, [fetchPage]);

  const hasActiveJobs = items.some((item) => isActiveJobStatus(item.status));

  useEffect(() => {
    if (loading || !hasActiveJobs) {
      return;
    }

    const intervalId = setInterval(() => void refreshVisibleJobs(), POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [loading, hasActiveJobs, refreshVisibleJobs]);

  function handleLoadMore() {
    setLoadingMore(true);
    void fetchPage(items.length);
  }

  async function handleDownload(jobId: string) {
    if (!session) return;

    setDownloadingJobId(jobId);

    try {
      const { downloadUrl } = await getDownloadUrl(jobId, session.accessToken);
      navigateTo(downloadUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao gerar o link de download.');
    } finally {
      setDownloadingJobId(null);
    }
  }

  const hasMore = items.length < total;

  return (
    <div className="page">
      <div className="card card--wide">
        <h1>Meus vídeos</h1>
        <p className="subtitle">Suas conversões, mais recentes primeiro</p>

        {error && <p className="error">{error}</p>}

        {loading && <p className="subtitle">Carregando…</p>}

        {!loading && items.length === 0 && !error && (
          <p className="subtitle">
            Você ainda não converteu nenhum vídeo, <Link to="/convert">comece por aqui</Link>.
          </p>
        )}

        {!loading && items.length > 0 && (
          <ul className="video-list">
            {items.map((item) => {
              // A API só manda progress em PROCESSING; o filtro protege contra um valor antigo depois do DONE.
              const progress = item.status === 'PROCESSING' ? item.progress : undefined;
              const downloading = downloadingJobId === item.jobId;

              return (
                <li key={item.jobId} className="video-list__item">
                  <Link to={`/jobs/${item.jobId}`} className="video-list__link">
                    <span className="video-list__info">
                      <span className="video-list__name">{item.fileName}</span>
                      <time className="video-list__date" dateTime={item.createdAt}>
                        {formatDateTime(item.createdAt)}
                      </time>
                      {item.failureReason && <span className="video-list__reason">{item.failureReason}</span>}
                      {progress !== undefined && (
                        <span className="video-list__progress">
                          <progress value={progress} max={100} aria-label={`Progresso de ${item.fileName}`} />
                          <span className="video-list__percent">{Math.round(progress)}%</span>
                        </span>
                      )}
                    </span>
                    <span className={`video-list__status video-list__status--${item.status.toLowerCase()}`}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </Link>
                  {item.hasDownload && (
                    <button
                      type="button"
                      className="btn-secondary video-list__download"
                      onClick={() => void handleDownload(item.jobId)}
                      disabled={downloading}
                      aria-label={`Baixar o .zip de ${item.fileName}`}
                    >
                      {downloading ? 'Gerando link…' : 'Baixar .zip'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!loading && hasMore && (
          <button type="button" className="btn-secondary" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Carregando…' : 'Carregar mais'}
          </button>
        )}
      </div>
    </div>
  );
}
