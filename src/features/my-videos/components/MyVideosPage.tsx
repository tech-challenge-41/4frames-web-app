import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/use-auth';
import { listVideoJobs, type VideoJobListItem } from '../api/my-videos-api';
import { STATUS_LABEL } from '../../job-status/status-label';
import { ApiError } from '../../../lib/http';
import './my-videos-page.css';

const PAGE_SIZE = 20;

export function MyVideosPage() {
  const { session } = useAuth();

  const [items, setItems] = useState<VideoJobListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const initialFetch = setTimeout(() => void fetchPage(0), 0);
    return () => clearTimeout(initialFetch);
  }, [fetchPage]);

  function handleLoadMore() {
    setLoadingMore(true);
    void fetchPage(items.length);
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
            {items.map((item) => (
              <li key={item.jobId} className="video-list__item">
                <Link to={`/jobs/${item.jobId}`} className="video-list__link">
                  <span className="video-list__name">{item.fileName}</span>
                  <span className={`video-list__status video-list__status--${item.status.toLowerCase()}`}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </Link>
              </li>
            ))}
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
