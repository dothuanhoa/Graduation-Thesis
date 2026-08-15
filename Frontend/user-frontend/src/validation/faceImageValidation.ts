export const MAX_FACE_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_FACE_FOLDER_FILES = 200;

const supportedTypes = new Set(["image/jpeg", "image/png"]);
const studentIdPattern = /^[A-Za-z0-9_-]{1,50}$/;

export const studentIdFromFaceFile = (file: File) => {
  const dotIndex = file.name.lastIndexOf(".");
  if (dotIndex <= 0) return "";
  const extension = file.name.slice(dotIndex + 1).toLowerCase();
  if (!["jpg", "jpeg", "png"].includes(extension)) return "";
  const studentId = file.name.slice(0, dotIndex).trim();
  return studentIdPattern.test(studentId) ? studentId : "";
};

const readImageDimensions = async (file: File) => {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Không đọc được kích thước ảnh"));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
};

export async function validateFaceImageFile(file: File, requireStudentIdName = false) {
  if (!supportedTypes.has(file.type)) return "Chỉ hỗ trợ ảnh JPG hoặc PNG.";
  if (file.size <= 0) return "Ảnh không được để trống.";
  if (file.size > MAX_FACE_IMAGE_BYTES) return "Mỗi ảnh không được vượt quá 5MB.";
  if (requireStudentIdName && !studentIdFromFaceFile(file)) {
    return `Tên ảnh "${file.name}" phải là MSSV, ví dụ DH52201258.png.`;
  }

  try {
    const { width, height } = await readImageDimensions(file);
    if (width < 200 || height < 200) return "Ảnh phải có kích thước tối thiểu 200x200 px.";
    if (width > 8000 || height > 8000) return "Ảnh không được vượt quá 8000x8000 px.";
  } catch {
    return "File đã chọn không phải ảnh hợp lệ.";
  }
  return "";
}

export async function validateFaceFolder(
  files: File[],
  onProgress?: (processed: number, total: number) => void,
) {
  if (files.length === 0) return "Thư mục đã chọn không có ảnh JPG hoặc PNG.";
  if (files.length > MAX_FACE_FOLDER_FILES) return `Mỗi lần chỉ được gửi tối đa ${MAX_FACE_FOLDER_FILES} ảnh.`;

  const studentIds = new Set<string>();
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const error = await validateFaceImageFile(file, true);
    if (error) return `${file.name}: ${error}`;
    const studentId = studentIdFromFaceFile(file).toLowerCase();
    if (studentIds.has(studentId)) return `MSSV ${studentIdFromFaceFile(file)} bị trùng trong thư mục.`;
    studentIds.add(studentId);
    onProgress?.(index + 1, files.length);
  }
  return "";
}
