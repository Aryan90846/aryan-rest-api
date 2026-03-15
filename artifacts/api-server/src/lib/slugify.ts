export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueSlug(title: string): string {
  const base = slugify(title);
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
}
