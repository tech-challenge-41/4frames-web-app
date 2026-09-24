import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MyVideosPage } from './MyVideosPage';
import { AuthProvider } from '../../auth/context/auth-context';
import * as myVideosApi from '../api/my-videos-api';
import { ApiError } from '../../../lib/http';

const fakeSession = {
  accessToken: 'token-123',
  expireIn: 3600,
  user: { id: '1', email: 'user@user.com' }
};

function renderMyVideosPage() {
  localStorage.setItem('4frames.session', JSON.stringify(fakeSession));

  return render(
    <MemoryRouter>
      <AuthProvider>
        <MyVideosPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('MyVideosPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the list of video jobs', async () => {
    vi.spyOn(myVideosApi, 'listVideoJobs').mockResolvedValue({
      items: [
        {
          jobId: 'job-1',
          fileName: 'video-1.mp4',
          status: 'DONE',
          createdAt: '2026-01-01T00:00:00.000Z',
          hasDownload: true
        },
        {
          jobId: 'job-2',
          fileName: 'video-2.mp4',
          status: 'PROCESSING',
          createdAt: '2026-01-02T00:00:00.000Z',
          hasDownload: false
        }
      ],
      total: 2,
      limit: 20,
      offset: 0
    });

    renderMyVideosPage();

    await waitFor(() => {
      expect(screen.getByText('video-1.mp4')).toBeInTheDocument();
    });
    expect(screen.getByText('video-2.mp4')).toBeInTheDocument();
    expect(screen.getByText('Finalizado')).toBeInTheDocument();
    expect(screen.getByText('Convertendo')).toBeInTheDocument();
  });

  it('shows an empty state with a link to /convert', async () => {
    vi.spyOn(myVideosApi, 'listVideoJobs').mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });

    renderMyVideosPage();

    await waitFor(() => {
      expect(screen.getByText(/você ainda não converteu nenhum vídeo/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /comece por aqui/i })).toHaveAttribute('href', '/convert');
  });

  it('shows an error message when the request fails', async () => {
    vi.spyOn(myVideosApi, 'listVideoJobs').mockRejectedValue(new ApiError('Falha ao carregar', 500));

    renderMyVideosPage();

    await waitFor(() => {
      expect(screen.getByText('Falha ao carregar')).toBeInTheDocument();
    });
  });
});
