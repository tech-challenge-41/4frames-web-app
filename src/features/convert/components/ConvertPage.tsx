import { useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/use-auth';
import { completeVideoJob, createVideoJob, isAllowedVideoType, uploadVideoToStorage } from '../api/convert-api';
import { ApiError } from '../../../lib/http';
import './convert-page.css';

export function ConvertPage() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'converting' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  function selectFile(candidate: File | null) {
    if (candidate && !isAllowedVideoType(candidate)) {
      setFile(null);
      setStatus('error');
      setMessage('Formato não suportado. Envie um vídeo .mp4 ou .mov.');
      return;
    }

    setFile(candidate);
    setStatus('idle');
    setMessage(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleConvert() {
    if (!file || !session) return;

    setStatus('converting');
    setMessage(null);

    try {
      const { jobId, uploadUrl } = await createVideoJob(file, session.accessToken);
      await uploadVideoToStorage(uploadUrl, file);
      await completeVideoJob(jobId, session.accessToken);
      navigate(`/jobs/${jobId}`);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof ApiError ? err.message : 'Falha ao enviar o vídeo.');
    }
  }

  return (
    <div className="page">
      <div className="card card--wide">
        <h1>Converter vídeo em frames</h1>
        <p className="subtitle">Selecione ou arraste um vídeo (.mp4 ou .mov) para converter em um .zip de imagens</p>

        <label
          className={`dropzone ${dragActive ? 'dropzone--active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <input type="file" accept="video/mp4,video/quicktime" onChange={handleFileChange} hidden />
          {file ? <span>{file.name}</span> : <span>Clique ou arraste um vídeo aqui</span>}
        </label>

        {message && <p className="error">{message}</p>}

        <button
          type="button"
          className="btn-primary"
          disabled={!file || status === 'converting'}
          onClick={handleConvert}
        >
          {status === 'converting' ? 'Enviando…' : 'Converter'}
        </button>
      </div>
    </div>
  );
}
