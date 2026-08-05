export const OTHER_PREFIX = "Others";

export function normalizePrefix(prefix: string | null | undefined): string {
  const value = prefix?.trim();

  if (!value) {
    return OTHER_PREFIX;
  }

  return value.toUpperCase() === OTHER_PREFIX.toUpperCase()
    ? OTHER_PREFIX
    : value.toUpperCase();
}

export function extractReferencePrefix(reference: string | null | undefined): string {
  const value = reference?.trim();

  if (!value || /^\d+$/.test(value)) {
    return OTHER_PREFIX;
  }

  if (/^[A-Za-z]/.test(value)) {
    const alphaPrefix = value.match(/^[A-Za-z]+/)?.[0] ?? "";
    return alphaPrefix ? normalizePrefix(alphaPrefix.slice(0, 7)) : OTHER_PREFIX;
  }

  if (/^\d/.test(value)) {
    const leadingDigits = value.match(/^\d+/)?.[0] ?? "";
    const leadingLetters = value.slice(leadingDigits.length).match(/^[A-Za-z]+/)?.[0] ?? "";

    if (!leadingLetters) {
      return OTHER_PREFIX;
    }

    return normalizePrefix(`${leadingDigits}${leadingLetters}`.slice(0, 7));
  }

  return OTHER_PREFIX;
}