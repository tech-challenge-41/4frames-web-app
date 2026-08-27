import { useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useAuth } from '../../auth/context/use-auth';
import { createVideoJob, isAllowedVideoType, uploadVideoToStorage } from '../api/upload-api';
import { ApiError } from '../../../lib/http';
import './upload-page.css';

export function UploadPage() {
  const { session } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

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
    setJobId(null);
    setCopied(false);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleUpload() {
    if (!file || !session) return;

    setStatus('uploading');
    setMessage(null);
    setJobId(null);
    setCopied(false);

    try {
      const { jobId: createdJobId, uploadUrl } = await createVideoJob(file, session.accessToken);
      await uploadVideoToStorage(uploadUrl, file);
      setStatus('done');
      setJobId(createdJobId);
      setMessage(`"${file.name}" enviado com sucesso. O processamento começará em breve.`);
      setFile(null);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof ApiError ? err.message : 'Falha ao enviar o vídeo.');
    }
  }

  async function handleCopyJobId() {
    if (jobId === null) return;

    try {
      await navigator.clipboard.writeText(String(jobId));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="page">
      <div className="card card--wide">
        <h1>Enviar vídeo</h1>
        <p className="subtitle">Selecione ou arraste um vídeo (.mp4 ou .mov) para enviar</p>

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

        {message && <p className={status === 'error' ? 'error' : 'success'}>{message}</p>}

        {jobId !== null && (
          <div className="job-id-box">
            <span>
              ID do job: <strong>{jobId}</strong>
            </span>
            <button type="button" className="btn-secondary" onClick={handleCopyJobId}>
              {copied ? 'Copiado!' : 'Copiar ID'}
            </button>
          </div>
        )}

        <button
          type="button"
          className="btn-primary"
          disabled={!file || status === 'uploading'}
          onClick={handleUpload}
        >
          {status === 'uploading' ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
