import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { useAuth } from '../../auth/context/use-auth';
import { downloadFile } from '../api/download-api';
import { ApiError } from '../../../lib/http';
import './download-page.css';

export function DownloadPage() {
  const { session } = useAuth();
  const [fileId, setFileId] = useState('');
  const [status, setStatus] = useState<'idle' | 'downloading' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !fileId) return;

    setStatus('downloading');
    setMessage(null);

    try {
      const blob = await downloadFile(fileId, session.accessToken);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileId;
      link.click();
      URL.revokeObjectURL(url);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof ApiError ? err.message : 'Falha ao baixar o arquivo.');
    }
  }

  return (
    <div className="page">
      <div className="card card--wide">
        <h1>Baixar arquivo</h1>
        <p className="subtitle">
          Informe o ID do job exibido na tela de envio após o upload do vídeo
        </p>

        <form onSubmit={handleSubmit} className="download-form">
          <input
            type="text"
            value={fileId}
            onChange={(e) => setFileId(e.target.value)}
            placeholder="ID do arquivo"
            required
          />

          {message && <p className="error">{message}</p>}

          <button type="submit" className="btn-primary" disabled={!fileId || status === 'downloading'}>
            {status === 'downloading' ? 'Baixando…' : 'Baixar'}
          </button>
        </form>
      </div>
    </div>
  );
}
