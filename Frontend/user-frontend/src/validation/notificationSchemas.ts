import * as yup from "yup";
import { z } from "zod";
import { stripHtmlToText } from "../utils/html";

const notificationTargetTypes = ["ALL", "FACULTY", "CLASS"] as const;
const notificationPriorities = ["NORMAL", "URGENT"] as const;
const notificationStatuses = ["DRAFT", "PUBLISHED", "EXPIRED", "REVOKED"] as const;

const dateTimeSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng chọn thời gian")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Thời gian không hợp lệ");

export const notificationSchema = z
  .object({
    title: z.string().trim().min(5, "Tiêu đề cần ít nhất 5 ký tự").max(150, "Tiêu đề tối đa 150 ký tự"),
    content: z.string().trim().refine((value) => stripHtmlToText(value).length >= 10, "Nội dung cần ít nhất 10 ký tự"),
    attachmentUrl: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || /^https?:\/\/.+/i.test(value), "URL tệp đính kèm phải bắt đầu bằng http:// hoặc https://"),
    priority: z.enum(notificationPriorities, {
      message: "Độ ưu tiên không hợp lệ",
    }),
    targetType: z.enum(notificationTargetTypes, {
      message: "Đối tượng nhận không hợp lệ",
    }),
    targetId: z.string().trim().optional(),
    startDate: dateTimeSchema,
    endDate: dateTimeSchema,
    status: z.enum(notificationStatuses, {
      message: "Trạng thái thông báo không hợp lệ",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.targetType !== "ALL" && !data.targetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập Mã đối tượng khi gửi theo khoa hoặc lớp",
        path: ["targetId"],
      });
    }

    if (new Date(data.endDate).getTime() <= new Date(data.startDate).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Thời gian hết hạn phải sau thời gian bắt đầu",
        path: ["endDate"],
      });
    }
  });

export const notificationScheduleSchema = yup.object({
  startDate: yup.string().required("Vui lòng chọn thời gian bắt đầu"),
  endDate: yup
    .string()
    .required("Vui lòng chọn thời gian hết hạn")
    .test("afterStart", "Thời gian hết hạn phải sau thời gian bắt đầu", function (value) {
      const { startDate } = this.parent as { startDate?: string };
      if (!value || !startDate) return false;
      return new Date(value).getTime() > new Date(startDate).getTime();
    }),
});
