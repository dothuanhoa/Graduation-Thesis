import { z } from "zod";

const isValidDateTime = (value: string) => !Number.isNaN(new Date(value).getTime());

export const activitySchema = z
  .object({
    title: z.string().trim().min(3, "Tên hoạt động phải có ít nhất 3 ký tự.").max(255, "Tên hoạt động không được vượt quá 255 ký tự."),
    category: z.enum(["ACADEMIC", "MOVEMENT", "FACULTY", "UNIVERSITY", "OTHER"]),
    reward: z.string().trim().min(1, "Vui lòng nhập điểm rèn luyện.").max(100, "Điểm rèn luyện không được vượt quá 100 ký tự."),
    googleFormUrl: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập link Google Form.")
      .max(500, "Link Google Form không được vượt quá 500 ký tự.")
      .refine((value) => /^https?:\/\/.+/i.test(value), "Link Google Form phải bắt đầu bằng http:// hoặc https://."),
    location: z.string().trim().min(1, "Vui lòng nhập địa điểm.").max(255, "Địa điểm không được vượt quá 255 ký tự."),
    startTime: z.string().trim().min(1, "Vui lòng chọn thời gian bắt đầu.").refine(isValidDateTime, "Thời gian bắt đầu không hợp lệ."),
    endTime: z.string().trim().min(1, "Vui lòng chọn thời gian kết thúc.").refine(isValidDateTime, "Thời gian kết thúc không hợp lệ."),
    capacity: z.number().int("Số lượng tối đa phải là số nguyên.").positive("Số lượng tối đa phải lớn hơn 0."),
  })
  .refine((data) => new Date(data.endTime).getTime() > new Date(data.startTime).getTime(), {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
    path: ["endTime"],
  });

export const checkerSchema = z.object({
  checkerCode: z.string().trim().min(1, "Vui lòng nhập mã người điểm danh.").max(50, "Mã người điểm danh không được vượt quá 50 ký tự."),
  checkerName: z.string().trim().min(2, "Vui lòng nhập họ tên người điểm danh.").max(100, "Họ tên người điểm danh không được vượt quá 100 ký tự."),
});

export const registrationSchema = z.object({
  studentCode: z.string().trim().min(1, "Vui lòng nhập MSSV sinh viên.").max(50, "MSSV không được vượt quá 50 ký tự."),
  fullName: z.string().trim().min(2, "Vui lòng nhập họ tên sinh viên.").max(100, "Họ tên sinh viên không được vượt quá 100 ký tự."),
});

export const checkinSchema = z.object({
  activityId: z.string().trim().min(1, "Vui lòng chọn hoạt động."),
  studentCode: z.string().trim().min(1, "Vui lòng nhập MSSV cần điểm danh."),
});
