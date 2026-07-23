import type { AttemptResponse, ExamResponse, ExamTargetPayload, UserProfile } from "../services/api";

export const attemptStatusLabel: Record<string, string> = {
  NOT_STARTED: "Ch\u01b0a b\u1eaft \u0111\u1ea7u",
  IN_PROGRESS: "\u0110ang l\u00e0m",
  SUBMITTED: "\u0110\u00e3 n\u1ed9p",
  LOCKED: "B\u1ecb kh\u00f3a",
  NOT_TAKEN: "Ch\u01b0a thi",
};

export type ExamResultRow = {
  examId: string;
  examTitle: string;
  studentCode: string;
  fullName: string;
  classCode: string;
  facultyName: string;
  score: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  correctText: string;
  violationCount: number;
  status: string;
  statusLabel: string;
  startedAt?: string;
  submittedAt?: string;
  attempt?: AttemptResponse;
  profile?: UserProfile;
};

const textKey = (value?: string | number | null) => String(value ?? "").trim();

const profileGroupCode = (profile: UserProfile) =>
  textKey(profile.studentGroup?.code) || textKey(profile.studentGroup?.id);

const matchesTargetGroup = (profile: UserProfile, target: ExamTargetPayload) => {
  const targetGroupCode = textKey(target.targetGroupCode);
  return !targetGroupCode || profileGroupCode(profile) === targetGroupCode;
};

const matchesTargetFaculty = (profile: UserProfile, target: ExamTargetPayload) => {
  const targetFacultyKeys = [target.facultyId, target.facultyCode, target.facultyName].map(textKey).filter(Boolean);
  if (targetFacultyKeys.length === 0) return true;

  const profileFacultyKeys = [
    profile.clazz?.faculty?.id,
    profile.clazz?.faculty?.facultyCode,
    profile.clazz?.faculty?.facultyName,
  ].map(textKey).filter(Boolean);

  return targetFacultyKeys.some((key) => profileFacultyKeys.includes(key));
};

const isClassSelected = (profile: UserProfile, target: ExamTargetPayload) => {
  const classKeys = [...(target.classIds || []), ...(target.classCodes || [])].map(textKey).filter(Boolean);
  if (classKeys.length === 0) return true;

  const profileClassKeys = [profile.clazz?.id, profile.clazz?.classCode].map(textKey).filter(Boolean);
  return classKeys.some((key) => profileClassKeys.includes(key));
};

const isStudentSelected = (profile: UserProfile, target: ExamTargetPayload) => {
  const studentKeys = [...(target.studentIds || []), ...(target.studentCodes || [])].map(textKey).filter(Boolean);
  if (studentKeys.length === 0) return false;

  const profileKeys = [profile.id, profile.studentId].map(textKey).filter(Boolean);
  return studentKeys.some((key) => profileKeys.includes(key));
};

const matchesTarget = (profile: UserProfile, target: ExamTargetPayload) => {
  const mode = target.targetMode || "CLASS";
  const baseMatched = matchesTargetGroup(profile, target) && matchesTargetFaculty(profile, target);

  if (mode === "STUDENT") {
    return isStudentSelected(profile, target);
  }

  if (mode === "BOTH") {
    const hasClassSelection = Boolean(target.classIds?.length || target.classCodes?.length);
    return (baseMatched && hasClassSelection && isClassSelected(profile, target)) || isStudentSelected(profile, target);
  }

  return baseMatched && isClassSelected(profile, target);
};

export const getExamEligibleStudents = (exam: ExamResponse | null | undefined, students: UserProfile[]) => {
  if (!exam) return [];

  const targets = exam.targets?.length
    ? exam.targets
    : [{ targetGroupCode: exam.targetGroupCode, targetMode: "CLASS" as const, classIds: [], classCodes: [], studentIds: [], studentCodes: [], startTime: exam.startTime, endTime: exam.endTime }];

  const seen = new Map<string, UserProfile>();
  students.forEach((student) => {
    if (!student.studentId) return;
    if (targets.some((target) => matchesTarget(student, target))) {
      seen.set(student.studentId, student);
    }
  });

  return [...seen.values()].sort((a, b) => {
    const classCompare = textKey(a.clazz?.classCode).localeCompare(textKey(b.clazz?.classCode), "vi");
    if (classCompare !== 0) return classCompare;
    return textKey(a.studentId).localeCompare(textKey(b.studentId), "vi");
  });
};

const chooseAttempt = (current: AttemptResponse | undefined, next: AttemptResponse) => {
  if (!current) return next;
  if (current.status !== "SUBMITTED" && next.status === "SUBMITTED") return next;
  const currentTime = new Date(current.submittedAt || current.startedAt || 0).getTime();
  const nextTime = new Date(next.submittedAt || next.startedAt || 0).getTime();
  return nextTime > currentTime ? next : current;
};

export const buildExamResultRows = (exam: ExamResponse | null | undefined, attempts: AttemptResponse[], students: UserProfile[]): ExamResultRow[] => {
  if (!exam) return [];

  const eligibleStudents = getExamEligibleStudents(exam, students);
  const attemptsByStudentCode = new Map<string, AttemptResponse>();
  attempts.forEach((attempt) => {
    const code = textKey(attempt.userTsid);
    if (!code) return;
    attemptsByStudentCode.set(code, chooseAttempt(attemptsByStudentCode.get(code), attempt));
  });

  const rows: ExamResultRow[] = eligibleStudents.map((profile) => {
    const attempt = attemptsByStudentCode.get(profile.studentId);
    const status = attempt?.status || "NOT_TAKEN";
    const row: ExamResultRow = {
      examId: exam.id,
      examTitle: exam.title,
      studentCode: profile.studentId,
      fullName: profile.fullName,
      classCode: profile.clazz?.classCode || "Ch\u01b0a ph\u00e2n l\u1edbp",
      facultyName: profile.clazz?.faculty?.facultyName || "Ch\u01b0a c\u00f3 khoa",
      score: attempt?.score ?? null,
      correctCount: attempt?.correctCount ?? null,
      totalQuestions: attempt?.totalQuestions ?? null,
      correctText: attempt ? `${attempt.correctCount ?? 0}/${attempt.totalQuestions ?? 0}` : "-",
      violationCount: attempt?.violationCount ?? 0,
      status,
      statusLabel: attemptStatusLabel[status] || status,
      profile,
    };

    if (attempt) {
      row.attempt = attempt;
      if (attempt.startedAt) row.startedAt = attempt.startedAt;
      if (attempt.submittedAt) row.submittedAt = attempt.submittedAt;
    }

    return row;
  });

  const eligibleCodes = new Set(eligibleStudents.map((student) => student.studentId));
  const profileByCode = new Map(students.map((student) => [student.studentId, student]));
  attemptsByStudentCode.forEach((attempt, code) => {
    if (eligibleCodes.has(code)) return;
    const profile = profileByCode.get(code);
    const row: ExamResultRow = {
      examId: exam.id,
      examTitle: exam.title,
      studentCode: code,
      fullName: profile?.fullName || code,
      classCode: profile?.clazz?.classCode || "Ch\u01b0a ph\u00e2n l\u1edbp",
      facultyName: profile?.clazz?.faculty?.facultyName || "Ch\u01b0a c\u00f3 khoa",
      score: attempt.score ?? null,
      correctCount: attempt.correctCount ?? null,
      totalQuestions: attempt.totalQuestions ?? null,
      correctText: `${attempt.correctCount ?? 0}/${attempt.totalQuestions ?? 0}`,
      violationCount: attempt.violationCount ?? 0,
      status: attempt.status,
      statusLabel: attemptStatusLabel[attempt.status] || attempt.status,
      attempt,
    };
    if (attempt.startedAt) row.startedAt = attempt.startedAt;
    if (attempt.submittedAt) row.submittedAt = attempt.submittedAt;
    if (profile) {
      row.profile = profile;
    }
    rows.push(row);
  });

  return rows.sort((a, b) => {
    const classCompare = a.classCode.localeCompare(b.classCode, "vi");
    if (classCompare !== 0) return classCompare;
    return a.studentCode.localeCompare(b.studentCode, "vi");
  });
};