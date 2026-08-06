/**
 * Regra de senha do produto: mínimo 8 caracteres.
 * Devolve mensagem de erro em pt-BR, ou null quando válida.
 */
export function passwordError(password: string, confirm?: string): string | null {
  if (confirm !== undefined && password !== confirm) {
    return "As senhas não coincidem.";
  }
  if (password.length < 8) {
    return "A senha deve ter no mínimo 8 caracteres.";
  }
  return null;
}
