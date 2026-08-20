export function isDubbedTitle(title: string): boolean {
  return /(^|[^\p{L}\p{N}])dublado([^\p{L}\p{N}]|$)/iu.test(title);
}

export function animeAudioLabelFromTitle(title: string):
  | "Dublado"
  | "Legendado" {
  return isDubbedTitle(title) ? "Dublado" : "Legendado";
}
