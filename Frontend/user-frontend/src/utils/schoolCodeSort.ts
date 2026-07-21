const normalizeSchoolCode = (value: string | number | null | undefined) => String(value ?? "").trim();

export const compareSchoolCode = (
  left: string | number | null | undefined,
  right: string | number | null | undefined,
) =>
  normalizeSchoolCode(left).localeCompare(normalizeSchoolCode(right), "vi", {
    numeric: true,
    sensitivity: "base",
  });

export const sortBySchoolCode = <T>(
  items: T[],
  resolveCode: (item: T) => string | number | null | undefined,
) => [...items].sort((left, right) => compareSchoolCode(resolveCode(left), resolveCode(right)));
