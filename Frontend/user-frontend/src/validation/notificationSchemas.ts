import * as yup from "yup";
import { z } from "zod";

const notificationTargetTypes = ["ALL", "FACULTY", "CLASS", "USER"] as const;
const notificationPriorities = ["NORMAL", "URGENT"] as const;
const notificationStatuses = ["DRAFT", "PUBLISHED", "EXPIRED", "REVOKED"] as const;

const dateTimeSchema = z
  .string()
  .trim()
  .min(1, "Vui long chon thoi gian")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Thoi gian khong hop le");

export const notificationSchema = z
  .object({
    title: z.string().trim().min(5, "Tieu de can it nhat 5 ky tu").max(150, "Tieu de toi da 150 ky tu"),
    content: z.string().trim().min(10, "Noi dung can it nhat 10 ky tu"),
    attachmentUrl: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || /^https?:\/\/.+/i.test(value), "URL tep dinh kem phai bat dau bang http:// hoac https://"),
    priority: z.enum(notificationPriorities, {
      message: "Do uu tien khong hop le",
    }),
    targetType: z.enum(notificationTargetTypes, {
      message: "Doi tuong nhan khong hop le",
    }),
    targetId: z.string().trim().optional(),
    startDate: dateTimeSchema,
    endDate: dateTimeSchema,
    status: z.enum(notificationStatuses, {
      message: "Trang thai thong bao khong hop le",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.targetType !== "ALL" && !data.targetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui long nhap Target ID khi gui theo khoa, lop hoac MSSV",
        path: ["targetId"],
      });
    }

    if (new Date(data.endDate).getTime() <= new Date(data.startDate).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Thoi gian het han phai sau thoi gian bat dau",
        path: ["endDate"],
      });
    }
  });

export const notificationScheduleSchema = yup.object({
  startDate: yup.string().required("Vui long chon thoi gian bat dau"),
  endDate: yup
    .string()
    .required("Vui long chon thoi gian het han")
    .test("afterStart", "Thoi gian het han phai sau thoi gian bat dau", function (value) {
      const { startDate } = this.parent as { startDate?: string };
      if (!value || !startDate) return false;
      return new Date(value).getTime() > new Date(startDate).getTime();
    }),
});
