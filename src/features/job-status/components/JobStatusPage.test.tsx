import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { JobStatusPage } from './JobStatusPage';
import { AuthProvider } from '../../auth/context/auth-context';
import * as jobStatusApi from '../api/job-status-api';

const fakeSession = {
  accessToken: 'token-123',
  expireIn: 3600,
  user: { id: '1', email: 'user@user.com' }
};

function renderJobStatusPage(jobId = 'job-1') {
  sessionStorage.setItem('4frames.session', JSON.stringify(fakeSession));

  return render(
    <MemoryRouter initialEntries={[`/jobs/${jobId}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/jobs/:jobId" element={<JobStatusPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

function baseStatus(overrides: Partial<jobStatusApi.VideoJobStatusResult> = {}): jobStatusApi.VideoJobStatusResult {
  return {
    jobId: 'job-1',
    status: 'UPLOAD_PENDING',
    fileName: 'video.mp4',
    ...overrides
  };
}

describe('JobStatusPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows the cancel button when the job is UPLOAD_PENDING or QUEUED', async () => {
    vi.spyOn(jobStatusApi, 'getVideoJobStatus').mockResolvedValue(baseStatus({ status: 'QUEUED' }));

    renderJobStatusPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    });
  });

  it('does not show the cancel button once the job is DONE', async () => {
    vi.spyOn(jobStatusApi, 'getVideoJobStatus').mockResolvedValue(baseStatus({ status: 'DONE' }));

    renderJobStatusPage();

    await waitFor(() => {
      expect(screen.getByText('Finalizado')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
  });

  it('calls cancelVideoJob when the cancel button is clicked', async () => {
    vi.spyOn(jobStatusApi, 'getVideoJobStatus').mockResolvedValue(baseStatus({ status: 'UPLOAD_PENDING' }));
    vi.spyOn(jobStatusApi, 'cancelVideoJob').mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderJobStatusPage('job-1');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(jobStatusApi.cancelVideoJob).toHaveBeenCalledWith('job-1', 'token-123');
    });
  });

  it('shows "Cancelado" instead of "Expirado" after the user cancels the job', async () => {
    vi.spyOn(jobStatusApi, 'getVideoJobStatus')
      .mockResolvedValueOnce(baseStatus({ status: 'UPLOAD_PENDING' }))
      .mockResolvedValue(baseStatus({ status: 'EXPIRED' }));
    vi.spyOn(jobStatusApi, 'cancelVideoJob').mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderJobStatusPage('job-1');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.getByText('Cancelado')).toBeInTheDocument();
    });
    expect(screen.queryByText('Expirado')).not.toBeInTheDocument();
  });

  it('shows "Expirado" when the job expires without the user cancelling it', async () => {
    vi.spyOn(jobStatusApi, 'getVideoJobStatus').mockResolvedValue(baseStatus({ status: 'EXPIRED' }));

    renderJobStatusPage('job-1');

    await waitFor(() => {
      expect(screen.getByText('Expirado')).toBeInTheDocument();
    });
  });

  it('opens the SSE event stream when the job enters PROCESSING', async () => {
    vi.spyOn(jobStatusApi, 'getVideoJobStatus').mockResolvedValue(baseStatus({ status: 'PROCESSING' }));
    const fakeEventSource = { close: vi.fn(), onmessage: null, onerror: null } as unknown as EventSource;
    const openStreamSpy = vi.spyOn(jobStatusApi, 'openVideoJobEventsStream').mockReturnValue(fakeEventSource);

    renderJobStatusPage('job-2');

    await waitFor(() => {
      expect(openStreamSpy).toHaveBeenCalledWith('job-2', 'token-123');
    });
  });

  it('shows the progress from GET /videos/:jobId until the SSE sends its first event', async () => {
    vi.spyOn(jobStatusApi, 'getVideoJobStatus').mockResolvedValue(baseStatus({ status: 'PROCESSING', progress: 30 }));
    const fakeEventSource = { close: vi.fn(), onmessage: null, onerror: null } as unknown as EventSource;
    vi.spyOn(jobStatusApi, 'openVideoJobEventsStream').mockReturnValue(fakeEventSource);

    renderJobStatusPage();

    const bar = await screen.findByRole('progressbar', { name: 'Progresso da conversão' });
    expect(bar).toHaveAttribute('value', '30');
  });
});
