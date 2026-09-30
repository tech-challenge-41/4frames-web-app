import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MyVideosPage } from './MyVideosPage';
import { AuthProvider } from '../../auth/context/auth-context';
import * as myVideosApi from '../api/my-videos-api';
import { formatDateTime } from '../../../lib/format';
import { ApiError } from '../../../lib/http';
import * as navigation from '../../../lib/navigation';

const detailedList: myVideosApi.ListVideoJobsResult = {
  items: [
    {
      jobId: 'job-done',
      fileName: 'pronto.mp4',
      status: 'DONE',
      createdAt: '2026-01-01T10:00:00.000Z',
      hasDownload: true
    },
    {
      jobId: 'job-failed',
      fileName: 'quebrado.mp4',
      status: 'FAILED',
      createdAt: '2026-01-02T10:00:00.000Z',
      failureReason: 'Arquivo de vídeo inválido',
      hasDownload: false
    },
    {
      jobId: 'job-processing',
      fileName: 'andamento.mp4',
      status: 'PROCESSING',
      createdAt: '2026-01-03T10:00:00.000Z',
      hasDownload: false,
      progress: 42.4
    },
    {
      jobId: 'job-starting',
      fileName: 'comecando.mp4',
      status: 'PROCESSING',
      createdAt: '2026-01-04T10:00:00.000Z',
      hasDownload: false
    }
  ],
  total: 4,
  limit: 20,
  offset: 0
};

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

  it('shows the creation date of each job', async () => {
    vi.spyOn(myVideosApi, 'listVideoJobs').mockResolvedValue(detailedList);

    renderMyVideosPage();

    const date = await screen.findByText(formatDateTime('2026-01-01T10:00:00.000Z'));
    expect(date.tagName).toBe('TIME');
    expect(date).toHaveAttribute('dateTime', '2026-01-01T10:00:00.000Z');
  });

  it('shows the failure reason of a failed job', async () => {
    vi.spyOn(myVideosApi, 'listVideoJobs').mockResolvedValue(detailedList);

    renderMyVideosPage();

    expect(await screen.findByText('Arquivo de vídeo inválido')).toBeInTheDocument();
  });

  it('shows a progress bar only for processing jobs that already have progress', async () => {
    vi.spyOn(myVideosApi, 'listVideoJobs').mockResolvedValue(detailedList);

    renderMyVideosPage();

    const bar = await screen.findByRole('progressbar', { name: 'Progresso de andamento.mp4' });
    expect(bar).toHaveAttribute('value', '42.4');
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  it('ignores a progress value on a job that is no longer processing', async () => {
    vi.spyOn(myVideosApi, 'listVideoJobs').mockResolvedValue({
      ...detailedList,
      items: [{ ...detailedList.items[0], progress: 100 }]
    });

    renderMyVideosPage();

    await screen.findByText('pronto.mp4');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('offers the download only for jobs with a zip and opens the presigned link', async () => {
    vi.spyOn(myVideosApi, 'listVideoJobs').mockResolvedValue(detailedList);
    const downloadSpy = vi
      .spyOn(myVideosApi, 'getDownloadUrl')
      .mockResolvedValue({ downloadUrl: 'http://localhost:4566/zips/1/job-done.zip?X-Amz-Signature=abc' });
    const navigateSpy = vi.spyOn(navigation, 'navigateTo').mockImplementation(() => undefined);

    renderMyVideosPage();

    const button = await screen.findByRole('button', { name: 'Baixar o .zip de pronto.mp4' });
    expect(screen.getAllByRole('button', { name: /baixar o \.zip/i })).toHaveLength(1);

    await userEvent.click(button);

    expect(downloadSpy).toHaveBeenCalledWith('job-done', 'token-123');
    expect(navigateSpy).toHaveBeenCalledWith('http://localhost:4566/zips/1/job-done.zip?X-Amz-Signature=abc');
  });

  it('shows an error when the download link cannot be generated', async () => {
    vi.spyOn(myVideosApi, 'listVideoJobs').mockResolvedValue(detailedList);
    vi.spyOn(myVideosApi, 'getDownloadUrl').mockRejectedValue(new ApiError('Video job not found', 404));
    const navigateSpy = vi.spyOn(navigation, 'navigateTo').mockImplementation(() => undefined);

    renderMyVideosPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Baixar o .zip de pronto.mp4' }));

    expect(await screen.findByText('Video job not found')).toBeInTheDocument();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
