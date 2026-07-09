import { z } from "zod";

export const activitySchema = z
  .object({
    title: z.string().trim().min(3, "Tên hoạt động phải có ít nhất 3 ký tự."),
    category: z.enum(["ACADEMIC", "MOVEMENT", "FACULTY", "UNIVERSITY", "OTHER"]),
    reward: z.string().trim().optional(),
    googleFormUrl: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập link Google Form.")
      .refine((value) => /^https?:\/\/.+/i.test(value), "Link Google Form phải bắt đầu bằng http:// hoặc https://."),
    location: z.string().trim().optional(),
    startTime: z.string().min(1, "Vui lòng chọn thời gian bắt đầu."),
    endTime: z.string().min(1, "Vui lòng chọn thời gian kết thúc."),
    capacity: z.coerce.number().int().positive("Số lượng phải lớn hơn 0.").optional(),
  })
  .refine((data) => new Date(data.endTime).getTime() > new Date(data.startTime).getTime(), {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
    path: ["endTime"],
  });

export const checkerSchema = z.object({
  checkerTsid: z.string().trim().min(1, "Vui lòng nhập TSID của người điểm danh."),
  checkerCode: z.string().trim().min(1, "Vui lòng nhập mã người điểm danh."),
  checkerName: z.string().trim().min(2, "Vui lòng nhập họ tên người điểm danh."),
});

export const checkinSchema = z.object({
  activityId: z.string().trim().min(1, "Vui lòng chọn hoạt động."),
  studentCode: z.string().trim().min(1, "Vui lòng nhập MSSV cần điểm danh."),
});
