type CellValue = string | number | boolean | null | undefined;

export type XlsxSheet = {
  name: string;
  rows: CellValue[][];
  columnWidths?: number[];
};

const encoder = new TextEncoder();

const crcTable = (() => {
  const table: number[] = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const escapeXml = (value: CellValue) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const columnName = (index: number) => {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
};

const sanitizeSheetName = (name: string, index: number) => {
  const cleaned = (name || `Sheet ${index + 1}`).replace(/[\\/?*\[\]:]/g, " ").trim();
  return (cleaned || `Sheet ${index + 1}`).slice(0, 31);
};

export const safeFileName = (value: string, fallback = "excel") => {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return normalized || fallback;
};

const measureCellWidth = (value: CellValue) => {
  const text = String(value ?? "");
  if (!text) return 12;
  const estimatedWidth = Array.from(text).reduce((sum, character) => sum + (character.charCodeAt(0) > 255 ? 1.25 : 1), 0);
  return Math.min(Math.max(estimatedWidth + 4, 14), 54);
};

const getColumnWidths = (sheet: XlsxSheet) => {
  const maxColumns = Math.max(1, sheet.columnWidths?.length ?? 0, ...sheet.rows.map((row) => row.length));
  return Array.from({ length: maxColumns }, (_, columnIndex) => {
    const configuredWidth = sheet.columnWidths?.[columnIndex];
    if (configuredWidth && configuredWidth > 0) return configuredWidth;
    return Math.max(...sheet.rows.map((row) => measureCellWidth(row[columnIndex])), 14);
  });
};

const columnsXml = (sheet: XlsxSheet) => {
  const columns = getColumnWidths(sheet)
    .map((width, index) => {
      const roundedWidth = Math.round(width * 10) / 10;
      return `<col min="${index + 1}" max="${index + 1}" width="${roundedWidth}" customWidth="1"/>`;
    })
    .join("");
  return `<cols>${columns}</cols>`;
};

const sheetXml = (sheet: XlsxSheet) => {
  const rows = sheet.rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, cellIndex) => {
          const ref = `${columnName(cellIndex)}${rowIndex + 1}`;
          const style = rowIndex === 0 ? ' s="1"' : "";
          if (typeof cell === "number" && Number.isFinite(cell)) {
            return `<c r="${ref}"${style}><v>${cell}</v></c>`;
          }
          if (typeof cell === "boolean") {
            return `<c r="${ref}" t="b"${style}><v>${cell ? 1 : 0}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"${style}><is><t>${escapeXml(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${columnsXml(sheet)}
  <sheetData>${rows}</sheetData>
</worksheet>`;
};

const workbookXml = (sheets: XlsxSheet[]) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheets
    .map((sheet, index) => `<sheet name="${escapeXml(sanitizeSheetName(sheet.name, index))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join("")}</sheets>
</workbook>`;

const workbookRelsXml = (sheetCount: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${Array.from({ length: sheetCount }, (_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}
  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const contentTypesXml = (sheetCount: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${Array.from({ length: sheetCount }, (_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
</Types>`;

const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
</styleSheet>`;

type ZipEntry = {
  path: string;
  data: Uint8Array;
  crc: number;
  offset: number;
};

const writeUint16 = (view: DataView, offset: number, value: number) => view.setUint16(offset, value, true);
const writeUint32 = (view: DataView, offset: number, value: number) => view.setUint32(offset, value >>> 0, true);

const concatBytes = (chunks: Uint8Array[]) => {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
};

const zipFiles = (files: Array<{ path: string; content: string }>) => {
  const chunks: Uint8Array[] = [];
  const entries: ZipEntry[] = [];
  let offset = 0;

  files.forEach((file) => {
    const name = encoder.encode(file.path);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const header = new Uint8Array(30 + name.length);
    const view = new DataView(header.buffer);
    writeUint32(view, 0, 0x04034b50);
    writeUint16(view, 4, 20);
    writeUint16(view, 6, 0x0800);
    writeUint16(view, 8, 0);
    writeUint16(view, 10, 0);
    writeUint16(view, 12, 0);
    writeUint32(view, 14, crc);
    writeUint32(view, 18, data.length);
    writeUint32(view, 22, data.length);
    writeUint16(view, 26, name.length);
    writeUint16(view, 28, 0);
    header.set(name, 30);

    chunks.push(header, data);
    entries.push({ path: file.path, data, crc, offset });
    offset += header.length + data.length;
  });

  const centralDirectoryOffset = offset;

  entries.forEach((entry) => {
    const name = encoder.encode(entry.path);
    const header = new Uint8Array(46 + name.length);
    const view = new DataView(header.buffer);
    writeUint32(view, 0, 0x02014b50);
    writeUint16(view, 4, 20);
    writeUint16(view, 6, 20);
    writeUint16(view, 8, 0x0800);
    writeUint16(view, 10, 0);
    writeUint16(view, 12, 0);
    writeUint16(view, 14, 0);
    writeUint32(view, 16, entry.crc);
    writeUint32(view, 20, entry.data.length);
    writeUint32(view, 24, entry.data.length);
    writeUint16(view, 28, name.length);
    writeUint16(view, 30, 0);
    writeUint16(view, 32, 0);
    writeUint16(view, 34, 0);
    writeUint16(view, 36, 0);
    writeUint32(view, 38, 0);
    writeUint32(view, 42, entry.offset);
    header.set(name, 46);
    chunks.push(header);
    offset += header.length;
  });

  const centralDirectorySize = offset - centralDirectoryOffset;
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, entries.length);
  writeUint16(endView, 10, entries.length);
  writeUint32(endView, 12, centralDirectorySize);
  writeUint32(endView, 16, centralDirectoryOffset);
  writeUint16(endView, 20, 0);
  chunks.push(end);

  return concatBytes(chunks);
};

export const exportXlsxFile = (filename: string, sheets: XlsxSheet[]) => {
  const normalizedSheets = sheets.length ? sheets : [{ name: "Sheet1", rows: [] }];
  const files = [
    { path: "[Content_Types].xml", content: contentTypesXml(normalizedSheets.length) },
    { path: "_rels/.rels", content: relsXml },
    { path: "xl/workbook.xml", content: workbookXml(normalizedSheets) },
    { path: "xl/_rels/workbook.xml.rels", content: workbookRelsXml(normalizedSheets.length) },
    { path: "xl/styles.xml", content: stylesXml },
    ...normalizedSheets.map((sheet, index) => ({ path: `xl/worksheets/sheet${index + 1}.xml`, content: sheetXml(sheet) })),
  ];
  const bytes = zipFiles(files);
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};