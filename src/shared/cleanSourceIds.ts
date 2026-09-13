/**
 * Nettoie les identifiants techniques internes comme [SOURCE_ID: 1], [SOURCE_ID: 1, 2],
 * afin qu'ils ne soient JAMAIS affichés à l'utilisateur.
 */
export function cleanInternalSourceIds(text: string): string {
  if (!text) return '';
  return text
    // Supprime [SOURCE_ID: X] ou [SOURCE_ID: X, Y, Z] avec ou sans espaces
    .replace(/\[\s*SOURCE_ID\s*:\s*[\d\s,]+\s*\]/gi, '')
    // Supprime les résidus du type [SOURCE_ID: ...] ou (SOURCE_ID: ...)
    .replace(/[\[\(]\s*SOURCE_ID[^\s\]\)]*[\s\S]*?[\]\)]/gi, '')
    // Nettoie les espaces doubles ou les espaces avant les ponctuations résultant de la suppression
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([.,;:!?])/g, '$1');
}
