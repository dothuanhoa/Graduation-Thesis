import { z } from "zod";

const codeRegex = /^[A-Za-z0-9_.-]+$/;
const facultyCodeRegex = /^[A-Za-z0-9_-]+$/;
const idRegex = /^[0-9]+$/;
const yearNameRegex = /^[\p{L}\p{N}\s._/-]+$/u;

export const organizationStatusSchema = z.enum(["ACTIVE", "INACTIVE"], {
  message: "Trạng thái không hợp lệ.",
});

export const facultySchema = z.object({
  facultyCode: z
    .string()
    .trim()
    .min(2, "Mã khoa phải có ít nhất 2 ký tự.")
    .max(20, "Mã khoa không được vượt quá 20 ký tự.")
    .regex(facultyCodeRegex, "Mã khoa chỉ gồm chữ, số, gạch dưới hoặc gạch ngang."),
  facultyName: z
    .string()
    .trim()
    .min(2, "Tên khoa phải có ít nhất 2 ký tự.")
    .max(255, "Tên khoa không được vượt quá 255 ký tự."),
  status: organizationStatusSchema,
});

export const academicYearSchema = z.object({
  yearName: z
    .string()
    .trim()
    .min(3, "Tên niên khóa phải có ít nhất 3 ký tự.")
    .max(50, "Tên niên khóa không được vượt quá 50 ký tự.")
    .regex(yearNameRegex, "Tên niên khóa chỉ gồm chữ, số, khoảng trắng, dấu chấm, gạch dưới, gạch ngang hoặc dấu /."),
  startYear: z
    .number({ message: "Năm bắt đầu không được để trống." })
    .int("Năm bắt đầu phải là số nguyên.")
    .min(1900, "Năm bắt đầu không hợp lệ.")
    .max(2100, "Năm bắt đầu không hợp lệ."),
});

export const classSchema = z
  .object({
    classCode: z
      .string()
      .trim()
      .min(2, "Mã lớp phải có ít nhất 2 ký tự.")
      .max(50, "Mã lớp không được vượt quá 50 ký tự.")
      .regex(codeRegex, "Mã lớp chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang."),
    facultyId: z.string().trim().min(1, "Vui lòng chọn khoa cho lớp.").regex(idRegex, "Khoa không hợp lệ."),
    academicYearId: z.string().trim().optional().refine((value) => !value || idRegex.test(value), "Niên khóa không hợp lệ."),
    academicYearName: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || value.length >= 3, "Tên niên khóa phải có ít nhất 3 ký tự.")
      .refine((value) => !value || value.length <= 50, "Tên niên khóa không được vượt quá 50 ký tự.")
      .refine((value) => !value || yearNameRegex.test(value), "Tên niên khóa chỉ gồm chữ, số, khoảng trắng, dấu chấm, gạch dưới, gạch ngang hoặc dấu /."),
    startYear: z.number().int("Năm bắt đầu phải là số nguyên.").min(1900, "Năm bắt đầu không hợp lệ.").max(2100, "Năm bắt đầu không hợp lệ.").optional(),
    status: organizationStatusSchema,
  })
  .refine((data) => !data.academicYearId || !data.academicYearName, {
    message: "Chỉ chọn niên khóa có sẵn hoặc nhập niên khóa mới, không dùng cả hai.",
    path: ["academicYearName"],
  })
  .refine((data) => !data.academicYearName || data.startYear !== undefined, {
    message: "Vui lòng nhập năm bắt đầu khi tạo niên khóa mới.",
    path: ["startYear"],
  });
