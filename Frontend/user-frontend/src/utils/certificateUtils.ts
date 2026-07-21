export const normalizeCertificateCode = (formCode?: string, formTypeName?: string) => {
  const raw = `${formCode || ""} ${formTypeName || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  if (raw.includes("VAY") || raw.includes("VON")) return "VAY_VON";
  if (raw.includes("NVQS") || raw.includes("QUAN SU") || raw.includes("NGHIA VU")) {
    return "NVQS";
  }
  return "KHAC";
};
