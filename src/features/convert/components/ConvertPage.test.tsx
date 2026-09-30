import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConvertPage } from './ConvertPage';
import { AuthProvider } from '../../auth/context/auth-context';
import * as convertApi from '../api/convert-api';
import { ApiError } from '../../../lib/http';

const navigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate
}));

const session = {
  accessToken: 'token-123',
  expireIn: 3600,
  user: { id: '1', email: 'user@user.com' }
};

function videoFile(name: string) {
  return new File(['conteudo'], name, { type: 'video/mp4' });
}

function renderConvertPage() {
  localStorage.setItem('4frames.session', JSON.stringify(session));

  return render(
    <AuthProvider>
      <ConvertPage />
    </AuthProvider>
  );
}

/** O input de arquivo está escondido dentro do dropzone; o upload do user-event acha pelo tipo. */
function fileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

describe('ConvertPage', () => {
  beforeEach(() => {
    localStorage.clear();
    navigate.mockClear();
    vi.restoreAllMocks();
  });

  it('navigates to /my-videos when every file is accepted', async () => {
    vi.spyOn(convertApi, 'submitVideoForConversion').mockResolvedValue('job-1');
    const user = userEvent.setup();

    renderConvertPage();
    await user.upload(fileInput(), [videoFile('a.mp4'), videoFile('b.mp4')]);
    await user.click(screen.getByRole('button', { name: 'Converter 2 vídeos' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/my-videos'));
  });

  it('shows one progress bar per file while it uploads, instead of a single counter', async () => {
    // Cada envio avisa o progresso e fica pendente até o teste liberar.
    const release: Record<string, (jobId: string) => void> = {};
    vi.spyOn(convertApi, 'submitVideoForConversion').mockImplementation(
      (file: File, _token: string, onProgress?: (percent: number) => void) => {
        onProgress?.(file.name === 'a.mp4' ? 40 : 100);

        return new Promise<string>((resolve) => {
          release[file.name] = resolve;
        });
      }
    );
    const user = userEvent.setup();

    renderConvertPage();
    await user.upload(fileInput(), [videoFile('a.mp4'), videoFile('b.mp4')]);
    await user.click(screen.getByRole('button', { name: 'Converter 2 vídeos' }));

    const barA = await screen.findByRole('progressbar', { name: 'Envio de a.mp4' });
    expect(barA).toHaveAttribute('value', '40');
    expect(screen.getByText('40%')).toBeInTheDocument();
    // Arquivo inteiro no S3: falta a confirmação na API.
    expect(screen.getByRole('progressbar', { name: 'Envio de b.mp4' })).toHaveAttribute('value', '100');
    expect(screen.getByText('Confirmando…')).toBeInTheDocument();
    // Durante o envio, não dá para tirar o arquivo da seleção.
    expect(screen.queryByRole('button', { name: 'Remover' })).not.toBeInTheDocument();

    release['b.mp4']?.('job-b');
    expect(await screen.findByText('Na fila')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();

    release['a.mp4']?.('job-a');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/my-videos'));
  });

  it('stays on the page and lists the failures when part of the batch fails', async () => {
    vi.spyOn(convertApi, 'submitVideoForConversion').mockImplementation(async (file: File) => {
      if (file.name === 'b.mp4') {
        throw new ApiError('Arquivo maior que 500MB', 422);
      }

      return 'job-ok';
    });
    const user = userEvent.setup();

    renderConvertPage();
    await user.upload(fileInput(), [videoFile('a.mp4'), videoFile('b.mp4'), videoFile('c.mp4')]);
    await user.click(screen.getByRole('button', { name: 'Converter 3 vídeos' }));

    // O bug era exatamente este: navigate desmontava a tela antes de a mensagem aparecer.
    const failureList = await screen.findByRole('list', { name: 'Vídeos que não foram enviados' });
    expect(failureList).toHaveTextContent('b.mp4: Arquivo maior que 500MB');
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByText('2 vídeo(s) entraram na fila.')).toBeInTheDocument();
    // Os que entraram na fila saem da seleção; o que falhou continua lá para reenvio, como uma seleção comum.
    expect(screen.queryByText('a.mp4')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver meus vídeos' })).toBeInTheDocument();
  });

  it('keeps only the failed files selected, so a retry does not duplicate queued jobs', async () => {
    const submit = vi.spyOn(convertApi, 'submitVideoForConversion').mockImplementation(async (file: File) => {
      if (file.name === 'b.mp4') {
        throw new ApiError('Falha temporária', 503);
      }

      return 'job-ok';
    });
    const user = userEvent.setup();

    renderConvertPage();
    await user.upload(fileInput(), [videoFile('a.mp4'), videoFile('b.mp4')]);
    await user.click(screen.getByRole('button', { name: 'Converter 2 vídeos' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Converter' })).toBeInTheDocument());

    submit.mockResolvedValue('job-retry');
    await user.click(screen.getByRole('button', { name: 'Converter' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/my-videos'));
    // 2 do primeiro envio + 1 do reenvio: o a.mp4 que já entrou na fila não foi enviado de novo.
    expect(submit).toHaveBeenCalledTimes(3);
    expect(submit.mock.calls[2]?.[0].name).toBe('b.mp4');
  });

  it('offers no shortcut to /my-videos when nothing reached the queue', async () => {
    vi.spyOn(convertApi, 'submitVideoForConversion').mockRejectedValue(new ApiError('Sessão expirada', 401));
    const user = userEvent.setup();

    renderConvertPage();
    await user.upload(fileInput(), [videoFile('a.mp4')]);
    await user.click(screen.getByRole('button', { name: 'Converter' }));

    await waitFor(() => expect(screen.getByText(/Sessão expirada/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Ver meus vídeos' })).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates from the failure panel when asked', async () => {
    vi.spyOn(convertApi, 'submitVideoForConversion').mockImplementation(async (file: File) => {
      if (file.name === 'b.mp4') {
        throw new ApiError('Falha temporária', 503);
      }

      return 'job-ok';
    });
    const user = userEvent.setup();

    renderConvertPage();
    await user.upload(fileInput(), [videoFile('a.mp4'), videoFile('b.mp4')]);
    await user.click(screen.getByRole('button', { name: 'Converter 2 vídeos' }));

    await user.click(await screen.findByRole('button', { name: 'Ver meus vídeos' }));

    expect(navigate).toHaveBeenCalledWith('/my-videos');
  });
});
