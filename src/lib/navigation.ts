/**
 * Leva o navegador a outra URL, como o link pré-assinado do .zip. Fica isolado aqui porque o jsdom não navega:
 * os testes interceptam esta função.
 */
export function navigateTo(url: string): void {
  window.location.assign(url);
}
