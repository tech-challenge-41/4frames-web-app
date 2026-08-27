import { useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useAuth } from '../../auth/context/use-auth';
import { uploadFile } from '../api/upload-api';
import { ApiError } from '../../../lib/http';
import './upload-page.css';

export function UploadPage() {
  const { session } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setStatus('idle');
    setMessage(null);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      setStatus('idle');
      setMessage(null);
    }
  }

  async function handleUpload() {
    if (!file || !session) return;

    setStatus('uploading');
    setMessage(null);

    try {
      await uploadFile(file, session.accessToken);
      setStatus('done');
      setMessage(`"${file.name}" enviado com sucesso.`);
      setFile(null);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof ApiError ? err.message : 'Falha ao enviar o arquivo.');
    }
  }

  return (
    <div className="page">
      <div className="card card--wide">
        <h1>Enviar arquivo</h1>
        <p className="subtitle">Selecione ou arraste um arquivo para enviar</p>

        <label
          className={`dropzone ${dragActive ? 'dropzone--active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <input type="file" onChange={handleFileChange} hidden />
          {file ? <span>{file.name}</span> : <span>Clique ou arraste um arquivo aqui</span>}
        </label>

        {message && <p className={status === 'error' ? 'error' : 'success'}>{message}</p>}

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
