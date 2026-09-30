import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_URL } from '../../../lib/http';
import { submitVideoForConversion, uploadVideoToStorage } from './convert-api';

const UPLOAD_URL = 'http://localhost:4566/4frames/videos/1/job-1.mp4?X-Amz-Signature=abc';

/** XMLHttpRequest de mentira: guarda o pedido e deixa o teste disparar o progresso, o fim ou a falha de rede. */
class FakeXhr {
  static instances: FakeXhr[] = [];
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: unknown = undefined;
  status = 0;
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    FakeXhr.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  send(body: unknown) {
    this.body = body;
  }

  progress(loaded: number, total: number, lengthComputable = true) {
    this.upload.onprogress?.({ loaded, total, lengthComputable } as ProgressEvent);
  }

  respond(status: number) {
    this.status = status;
    this.onload?.();
  }
}

function lastXhr(): FakeXhr {
  const xhr = FakeXhr.instances.at(-1);

  if (!xhr) throw new Error('nenhum XMLHttpRequest foi aberto');
  return xhr;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function videoFile() {
  return new File(['0123456789'], 'aula.mp4', { type: 'video/mp4' });
}

describe('uploadVideoToStorage', () => {
  beforeEach(() => {
    FakeXhr.instances = [];
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('PUTs the file to the presigned URL with its content type, reporting the percentage sent', async () => {
    const file = videoFile();
    const percents: number[] = [];

    const uploaded = uploadVideoToStorage(UPLOAD_URL, file, (percent) => percents.push(percent));
    const xhr = lastXhr();
    xhr.progress(1, 3);
    xhr.progress(2, 3);
    xhr.respond(200);
    await uploaded;

    expect(xhr.method).toBe('PUT');
    expect(xhr.url).toBe(UPLOAD_URL);
    expect(xhr.headers['Content-Type']).toBe('video/mp4');
    expect(xhr.body).toBe(file);
    expect(percents).toEqual([33, 67, 100]);
  });

  it('ignores progress events without a known total', async () => {
    const percents: number[] = [];

    const uploaded = uploadVideoToStorage(UPLOAD_URL, videoFile(), (percent) => percents.push(percent));
    lastXhr().progress(5, 0, false);
    lastXhr().respond(204);
    await uploaded;

    expect(percents).toEqual([100]);
  });

  it('rejects when the storage answers with an error status', async () => {
    const uploaded = uploadVideoToStorage(UPLOAD_URL, videoFile());
    lastXhr().respond(403);

    await expect(uploaded).rejects.toThrow('Falha ao enviar o arquivo para o armazenamento.');
  });

  it('rejects on a network failure', async () => {
    const uploaded = uploadVideoToStorage(UPLOAD_URL, videoFile());
    lastXhr().onerror?.();

    await expect(uploaded).rejects.toThrow('Falha ao enviar o arquivo para o armazenamento.');
  });
});

describe('submitVideoForConversion', () => {
  beforeEach(() => {
    FakeXhr.instances = [];
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates the job, uploads with progress and only then confirms it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(201, { jobId: 'job-1', uploadUrl: UPLOAD_URL, expiresIn: 300 }))
      .mockResolvedValueOnce(jsonResponse(200, { jobId: 'job-1', status: 'QUEUED' }));
    vi.stubGlobal('fetch', fetchMock);
    const percents: number[] = [];

    const submitted = submitVideoForConversion(videoFile(), 'token-123', (percent) => percents.push(percent));
    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1));

    // Enquanto o arquivo sobe, o complete ainda não foi chamado.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    lastXhr().progress(5, 10);
    lastXhr().respond(200);

    await expect(submitted).resolves.toBe('job-1');
    expect(percents).toEqual([50, 100]);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${API_URL}/videos/job-1/complete`);
  });

  it('never confirms a job whose upload failed', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(201, { jobId: 'job-1', uploadUrl: UPLOAD_URL, expiresIn: 300 }));
    vi.stubGlobal('fetch', fetchMock);

    const submitted = submitVideoForConversion(videoFile(), 'token-123');
    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    lastXhr().respond(500);

    await expect(submitted).rejects.toThrow('Falha ao enviar o arquivo para o armazenamento.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
