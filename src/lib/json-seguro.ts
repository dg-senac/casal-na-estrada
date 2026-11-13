/** JSON-LD usa HTML raw: impedir que conteúdo editorial feche o <script>. */
export function jsonSeguro(valor: unknown): string {
  return JSON.stringify(valor).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
