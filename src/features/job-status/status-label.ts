export const TERMINAL_JOB_STATUSES = new Set(['DONE', 'FAILED', 'EXPIRED']);

export function isActiveJobStatus(status: string): boolean {
  return !TERMINAL_JOB_STATUSES.has(status);
}

export const STATUS_LABEL: Record<string, string> = {
  UPLOAD_PENDING: 'Aguardando upload',
  QUEUED: 'Na fila de processamento',
  PROCESSING: 'Convertendo',
  DONE: 'Finalizado',
  FAILED: 'Erro na conversão',
  EXPIRED: 'Expirado'
};
