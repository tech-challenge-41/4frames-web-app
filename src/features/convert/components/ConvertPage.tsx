import { useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/use-auth';
import { isAllowedVideoType, MAX_BATCH_UPLOAD_FILES, submitVideoForConversion } from '../api/convert-api';
import { ApiError } from '../../../lib/http';
import './convert-page.css';

function mergeFiles(existing: File[], incoming: File[]): File[] {
  const seen = new Set(existing.map((file) => `${file.name}:${file.size}`));
  const merged = [...existing];

  for (const file of incoming) {
    if (!isAllowedVideoType(file)) continue;
    const key = `${file.name}:${file.size}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(file);
  }

  return merged.slice(0, MAX_BATCH_UPLOAD_FILES);
}

export function ConvertPage() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'converting' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  function addFiles(candidates: File[]) {
    const allowed = candidates.filter(isAllowedVideoType);
    const rejected = candidates.length - allowed.length;

    if (candidates.length > 0 && allowed.length === 0) {
      setFiles([]);
      setStatus('error');
      setMessage('Formato não suportado. Envie vídeos .mp4 ou .mov.');
      return;
    }

    const next = mergeFiles(files, allowed);
    setFiles(next);
    setStatus('idle');
    setMessage(
      rejected > 0
        ? `${rejected} arquivo(s) ignorado(s): use apenas .mp4 ou .mov.`
        : next.length >= MAX_BATCH_UPLOAD_FILES
          ? `Máximo de ${MAX_BATCH_UPLOAD_FILES} vídeos por envio.`
          : null
    );
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setMessage(null);
  }

  async function handleConvert() {
    if (files.length === 0 || !session) return;

    setStatus('converting');
    setMessage(null);
    setProgress(`0 / ${files.length}`);

    const failures: string[] = [];
    let completed = 0;

    await Promise.all(
      files.map(async (file) => {
        try {
          await submitVideoForConversion(file, session.accessToken);
          completed += 1;
          setProgress(`${completed} / ${files.length}`);
        } catch (err) {
          const text = err instanceof ApiError ? err.message : 'Falha ao enviar o vídeo.';
          failures.push(`${file.name}: ${text}`);
        }
      })
    );

    if (completed === 0) {
      setStatus('error');
      setMessage(failures.join(' '));
      setProgress(null);
      return;
    }

    if (failures.length > 0) {
      setStatus('error');
      setMessage(`${completed} vídeo(s) na fila. Falhas: ${failures.join(' ')}`);
    }

    navigate('/my-videos');
  }

  return (
    <div className="page">
      <div className="card card--wide">
        <h1>Converter vídeo em frames</h1>
        <p className="subtitle">
          Selecione ou arraste um ou mais vídeos (.mp4 ou .mov). Cada arquivo vira um job na fila e pode ser processado
          em paralelo.
        </p>

        <label
          className={`dropzone ${dragActive ? 'dropzone--active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <input type="file" accept="video/mp4,video/quicktime" multiple onChange={handleFileChange} hidden />
          {files.length === 0 ? (
            <span>Clique ou arraste vídeos aqui (até {MAX_BATCH_UPLOAD_FILES})</span>
          ) : (
            <span>{files.length} vídeo(s) selecionado(s)</span>
          )}
        </label>

        {files.length > 0 && (
          <ul className="convert-file-list">
            {files.map((file, index) => (
              <li key={`${file.name}-${file.size}-${index}`}>
                <span>{file.name}</span>
                <button type="button" className="btn-secondary convert-file-remove" onClick={() => removeFile(index)}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}

        {progress && status === 'converting' && <p className="convert-progress">{progress} enviado(s)</p>}
        {message && <p className="error">{message}</p>}

        <button
          type="button"
          className="btn-primary"
          disabled={files.length === 0 || status === 'converting'}
          onClick={handleConvert}
        >
          {status === 'converting' ? 'Enviando…' : files.length > 1 ? `Converter ${files.length} vídeos` : 'Converter'}
        </button>
      </div>
    </div>
  );
}
