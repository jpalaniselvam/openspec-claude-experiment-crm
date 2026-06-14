/**
 * Converts a display name into a `^[a-z][a-z0-9_]*$` snake_case slug, used to
 * derive `apiName`/`apiKey` values when the caller doesn't provide one.
 */
export function slugify(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return /^[a-z]/.test(slug) ? slug : `f_${slug}`;
}
