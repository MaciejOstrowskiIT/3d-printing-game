/** Cheap word filter run before Llama Guard. Llama Guard only flags harmful content (hate, threats, sexual...), so plain
 *  vulgar insults like "chuj ..." pass it, and it is weak at Polish. Bug reports are public issues, so these are
 *  held back too. Kept short on purpose: a false positive loses a real bug report. */

type Mode = 'any' | 'start' | 'exact';

/** Stems in normalized form (lowercase, no diacritics, repeated letters collapsed). */
const RULES: [string, Mode][] = [
  // Polish
  ['chuj', 'any'], ['huj', 'any'], ['kurw', 'any'], ['pierdol', 'any'], ['pierdal', 'any'], ['jeb', 'any'],
  ['pizd', 'any'], ['kutas', 'start'], ['cipa', 'start'], ['cipk', 'start'], ['dziwk', 'any'], ['fiut', 'start'],
  // English
  ['fuck', 'any'], ['fuk', 'exact'], ['shit', 'start'], ['cunt', 'start'], ['bitch', 'any'], ['whore', 'any'],
  ['slut', 'start'], ['nigg', 'start'], ['fagot', 'start'], ['fag', 'exact'], ['retard', 'start'],
  ['ashole', 'any'], ['dick', 'exact'], ['cock', 'exact'], ['motherf', 'start'],
];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };

const collapse = (s: string) => s.replace(/(.)\1+/g, '$1');

export function normalize(text: string): string {
  return collapse(
    text.toLowerCase()
      .replace(/ł/g, 'l')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[013457@$!]/g, c => LEET[c]),
  );
}

export function containsProfanity(text: string): boolean {
  const words = normalize(text).split(/[^a-z]+/).filter(Boolean);
  return words.some(w => RULES.some(([stem, mode]) =>
    mode === 'exact' ? w === stem : mode === 'start' ? w.startsWith(stem) : w.includes(stem)));
}
