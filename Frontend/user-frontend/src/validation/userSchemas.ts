import * as yup from "yup";
import { z } from "zod";
import { emitToast } from "../utils/toastBus";
import { toUserFacingMessage } from "../utils/messages";

const phoneRegex = /^(0|\+84)(\d{8,10})$/;

export const userProfileSchema = z.object({
  studentId: z
    .string()
    .trim()
    .min(3, "MSSV cần ít nhất 3 ký tự")
    .max(50, "MSSV tối đa 50 ký tự")
    .regex(/^[A-Za-z0-9_-]+$/, "MSSV chỉ gồm chữ, số, gạch dưới hoặc gạch ngang"),
  fullName: z
    .string()
    .trim()
    .min(2, "Họ tên cần ít nhất 2 ký tự")
    .max(100, "Họ tên tối đa 100 ký tự"),
  dob: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    message: "Giới tính không hợp lệ",
  }),
  contactPhone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || phoneRegex.test(value), "Số điện thoại không hợp lệ"),
  studentStatus: z.enum(["STUDYING", "RESERVED", "SUSPENDED", "GRADUATED"], {
    message: "Trạng thái sinh viên không hợp lệ",
  }),
});

export const contactPhoneSchema = yup.object({
  contactPhone: yup
    .string()
    .trim()
    .required("Vui lòng nhập số điện thoại liên hệ")
    .matches(phoneRegex, "Số điện thoại không hợp lệ"),
});

export const excelImportSchema = yup.object({
  file: yup
    .mixed<File>()
    .required("Vui lòng chọn file Excel trước khi import")
    .test("fileType", "Chỉ chấp nhận file .xlsx hoặc .xls", (file) => {
      if (!file) return false;
      return /\.(xlsx|xls)$/i.test(file.name);
    })
    .test("fileSize", "File tối đa 30MB", (file) => {
      if (!file) return false;
      return file.size <= 30 * 1024 * 1024;
    }),
});

export const getZodMessage = (error: unknown, fallback: string) => {
  if (error instanceof z.ZodError) {
    const message = toUserFacingMessage(error.issues[0]?.message || fallback);
    emitToast({ variant: "warning", message });
    return message;
  }
  return fallback;
};

export const getYupMessage = (error: unknown, fallback: string) => {
  if (error instanceof yup.ValidationError) {
    const message = toUserFacingMessage(error.errors[0] || fallback);
    emitToast({ variant: "warning", message });
    return message;
  }
  return fallback;
};
