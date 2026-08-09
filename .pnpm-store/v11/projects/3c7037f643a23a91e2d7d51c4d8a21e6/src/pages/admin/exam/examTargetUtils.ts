import type { ExamTargetPayload } from "../../../services/api";

export const createEmptyExamTarget = (): ExamTargetPayload => ({
  targetGroupCode: "1",
  facultyId: "",
  facultyCode: "",
  facultyName: "",
  classIds: [],
  classCodes: [],
  targetMode: "CLASS",
  studentIds: [],
  studentCodes: [],
  studentNames: [],
  startTime: "",
  endTime: "",
});
