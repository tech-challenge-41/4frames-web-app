/**
 * Estado de navegação que o ProtectedRoute passa ao /login: a página pedida sem sessão, para o login voltar a
 * ela (ex.: o link do e-mail para /jobs/:jobId). Vem do estado do React Router, nunca da URL.
 */
export interface LoginRedirectState {
  from?: string;
}
