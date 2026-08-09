export const normalizeSearch = (value?: string | number | null) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();

export const includesSearch = (value: string | number | null | undefined, keyword: string) => {
  const normalizedKeyword = normalizeSearch(keyword);
  return !normalizedKeyword || normalizeSearch(value).includes(normalizedKeyword);
};

