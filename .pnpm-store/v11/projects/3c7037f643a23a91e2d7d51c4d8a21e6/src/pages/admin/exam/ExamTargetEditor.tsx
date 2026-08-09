import { Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState, type ChangeEvent } from "react";
import type {
  ClassResponse,
  ExamTargetMode,
  ExamTargetPayload,
  FacultyResponse,
  StudentGroupResponse,
  UserProfile,
} from "../../../services/api";
import { defaultStudentGroups, studentGroupName } from "../../../utils/studentGroups";
import { createEmptyExamTarget } from "./examTargetUtils";

type Props = {
  classes: ClassResponse[];
  faculties: FacultyResponse[];
  onChange: (targets: ExamTargetPayload[]) => void;
  studentGroups: StudentGroupResponse[];
  students: UserProfile[];
  targets: ExamTargetPayload[];
};

const targetModes: Array<{ value: ExamTargetMode; label: string; helper: string }> = [
  { value: "CLASS", label: "Theo lớp", helper: "Sinh viên trong các lớp được chọn sẽ được thi." },
  { value: "STUDENT", label: "Theo sinh viên", helper: "Chỉ sinh viên được tick trong danh sách mới được thi." },
  { value: "BOTH", label: "Cả hai", helper: "Cho phép theo lớp và bổ sung sinh viên riêng." },
];

const appliedPreviewLimit = 12;
const groupCode = (group: StudentGroupResponse) => group.code || String(group.id || "");
const profileGroupCode = (profile: UserProfile) => profile.studentGroup?.code || String(profile.studentGroup?.id || "");
const studentKey = (profile: UserProfile) => profile.id || profile.studentId;

const normalizeText = (value?: string) =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

const selectedClassCodes = (classes: ClassResponse[], classIds: string[]) => {
  const selectedIds = new Set(classIds);
  return classes.filter((item) => selectedIds.has(item.id)).map((item) => item.classCode);
};

const selectedClassIdsFromTarget = (classes: ClassResponse[], target: ExamTargetPayload) => {
  const selectedKeys = new Set([...(target.classIds || []), ...(target.classCodes || [])].map(String));
  return classes
    .filter((item) => selectedKeys.has(String(item.id)) || selectedKeys.has(item.classCode))
    .map((item) => item.id);
};

const selectedStudentData = (students: UserProfile[], selectedKeys: Set<string>) => {
  const selected = students.filter((student) => selectedKeys.has(student.id) || selectedKeys.has(student.studentId));
  return {
    studentIds: selected.map((student) => student.id),
    studentCodes: selected.map((student) => student.studentId),
    studentNames: selected.map((student) => student.fullName),
  };
};

const isStudentMatchedByClass = (
  student: UserProfile,
  targetMode: ExamTargetMode,
  selectedClassIds: Set<string>,
) => {
  if (targetMode === "STUDENT") return false;
  const studentClassId = student.clazz?.id;
  return Boolean(studentClassId && selectedClassIds.has(studentClassId));
};

function ExamTargetEditor({ classes, faculties, onChange, studentGroups, students, targets }: Props) {
  const resolvedGroups = studentGroups.length > 0 ? studentGroups : defaultStudentGroups;
  const safeTargets = targets.length > 0 ? targets : [createEmptyExamTarget()];
  const [classSearches, setClassSearches] = useState<Record<number, string>>({});
  const [studentSearches, setStudentSearches] = useState<Record<number, string>>({});

  const studentsByGroupClass = useMemo(() => {
    const map = new Map<string, Set<string>>();
    students.forEach((student) => {
      const code = profileGroupCode(student);
      const classId = student.clazz?.id;
      if (!code || !classId) return;
      if (!map.has(code)) {
        map.set(code, new Set());
      }
      map.get(code)?.add(classId);
    });
    return map;
  }, [students]);

  const updateTarget = (index: number, patch: Partial<ExamTargetPayload>) => {
    onChange(safeTargets.map((target, targetIndex) => (targetIndex === index ? { ...target, ...patch } : target)));
  };

  const addTarget = () => {
    onChange([...safeTargets, createEmptyExamTarget()]);
  };

  const removeTarget = (index: number) => {
    if (safeTargets.length === 1) return;
    onChange(safeTargets.filter((_, targetIndex) => targetIndex !== index));
  };

  const changeGroup = (index: number, targetGroupCode: string) => {
    updateTarget(index, {
      targetGroupCode,
      classIds: [],
      classCodes: [],
      studentIds: [],
      studentCodes: [],
      studentNames: [],
    });
  };

  const changeMode = (index: number, targetMode: ExamTargetMode) => {
    const patch: Partial<ExamTargetPayload> = { targetMode };
    if (targetMode === "CLASS") {
      patch.studentIds = [];
      patch.studentCodes = [];
      patch.studentNames = [];
    }
    if (targetMode === "STUDENT") {
      patch.classIds = [];
      patch.classCodes = [];
    }
    updateTarget(index, patch);
  };

  const changeFaculty = (index: number, facultyId: string) => {
    const faculty = faculties.find((item) => item.id === facultyId);
    updateTarget(index, {
      facultyId,
      facultyCode: faculty?.facultyCode || "",
      facultyName: faculty?.facultyName || "",
      classIds: [],
      classCodes: [],
      studentIds: [],
      studentCodes: [],
      studentNames: [],
    });
  };

  const changeClass = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const target = safeTargets[index];
    const currentIds = selectedClassIdsFromTarget(classes, target);
    const nextIds = new Set(currentIds);
    if (event.target.checked) {
      nextIds.add(event.target.value);
    } else {
      nextIds.delete(event.target.value);
    }
    const classIds = Array.from(nextIds);
    updateTarget(index, {
      classIds,
      classCodes: selectedClassCodes(classes, classIds),
    });
  };

  const changeStudent = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const target = safeTargets[index];
    const selectedKeys = new Set([...(target.studentIds || []), ...(target.studentCodes || [])]);
    const student = students.find((item) => item.id === event.target.value || item.studentId === event.target.value);
    if (event.target.checked) {
      if (student) {
        selectedKeys.add(student.id);
        selectedKeys.add(student.studentId);
      } else {
        selectedKeys.add(event.target.value);
      }
    } else {
      selectedKeys.delete(event.target.value);
      if (student) {
        selectedKeys.delete(student.id);
        selectedKeys.delete(student.studentId);
      }
    }
    updateTarget(index, selectedStudentData(students, selectedKeys));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-on-surface">Đối tượng và khung giờ</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Chọn nhóm, khoa, lớp hoặc sinh viên cụ thể cho từng khung giờ thi.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary"
          onClick={addTarget}
          type="button"
        >
          <Plus className="h-5 w-5" />
          Thêm khung giờ
        </button>
      </div>

      {safeTargets.map((target, index) => {
        const targetMode = target.targetMode || "CLASS";
        const selectedClassIds = new Set(selectedClassIdsFromTarget(classes, target));
        const selectedStudentKeys = new Set([...(target.studentIds || []), ...(target.studentCodes || [])]);
        const otherTargets = safeTargets.filter((_, targetIndex) => targetIndex !== index);
        const otherSelectedClassIds = new Set(
          otherTargets.flatMap((otherTarget) => (
            (otherTarget.targetMode || "CLASS") === "STUDENT" ? [] : selectedClassIdsFromTarget(classes, otherTarget)
          )),
        );
        const otherSelectedStudentKeys = new Set(
          otherTargets.flatMap((otherTarget) => [
            ...(otherTarget.studentIds || []),
            ...(otherTarget.studentCodes || []),
          ]),
        );
        const otherDirectStudentClassIds = new Set(
          students
            .filter((student) => otherSelectedStudentKeys.has(student.id) || otherSelectedStudentKeys.has(student.studentId))
            .map((student) => student.clazz?.id)
            .filter(Boolean) as string[],
        );
        const resolvedFaculty = faculties.find((item) => item.id === target.facultyId || item.facultyCode === target.facultyCode || item.facultyName === target.facultyName);
        const resolvedFacultyId = resolvedFaculty?.id || target.facultyId || "";
        const resolvedFacultyName = resolvedFaculty?.facultyName || target.facultyName || "";
        const groupClassIds = studentsByGroupClass.get(target.targetGroupCode);
        const classKeyword = normalizeText(classSearches[index]);
        const studentKeyword = normalizeText(studentSearches[index]);
        const baseClasses = students.length > 0 && groupClassIds ? classes.filter((item) => groupClassIds.has(item.id)) : classes;
        const scopeClasses = baseClasses.filter((item) => {
          const facultyMatches = !resolvedFacultyId || item.faculty?.id === resolvedFacultyId;
          return facultyMatches;
        });
        const filteredClasses = scopeClasses.filter((item) => {
          const keywordMatches = !classKeyword || normalizeText(`${item.classCode} ${item.faculty?.facultyName || ""}`).includes(classKeyword);
          return keywordMatches;
        });
        const selectedClassCount = selectedClassIds.size;
        const showClasses = targetMode === "CLASS" || targetMode === "BOTH";
        const showStudents = targetMode === "STUDENT" || targetMode === "BOTH";
        const scopedStudents = students
          .filter((student) => profileGroupCode(student) === target.targetGroupCode)
          .filter((student) => !resolvedFacultyId || student.clazz?.faculty?.id === resolvedFacultyId);
        const directStudentCount = scopedStudents.filter((student) => selectedStudentKeys.has(student.id) || selectedStudentKeys.has(student.studentId)).length;
        const appliedStudentCount = scopedStudents.filter((student) => (
          selectedStudentKeys.has(student.id)
          || selectedStudentKeys.has(student.studentId)
          || isStudentMatchedByClass(student, targetMode, selectedClassIds)
        )).length;
        const studentCandidates = scopedStudents
          .filter((student) => {
            if (!studentKeyword) return true;
            return normalizeText(`${student.studentId} ${student.fullName} ${student.clazz?.classCode || ""}`).includes(studentKeyword);
          })
          .sort((left, right) => {
            const leftSelected = selectedStudentKeys.has(left.id)
              || selectedStudentKeys.has(left.studentId)
              || isStudentMatchedByClass(left, targetMode, selectedClassIds);
            const rightSelected = selectedStudentKeys.has(right.id)
              || selectedStudentKeys.has(right.studentId)
              || isStudentMatchedByClass(right, targetMode, selectedClassIds);
            if (leftSelected !== rightSelected) return leftSelected ? -1 : 1;
            return left.studentId.localeCompare(right.studentId);
          });
        const visibleStudents = studentCandidates.slice(0, 120);
        const appliedClasses = showClasses
          ? scopeClasses.filter((item) => selectedClassIds.has(item.id))
          : [];
        const appliedStudents = scopedStudents.filter((student) => (
          selectedStudentKeys.has(student.id)
          || selectedStudentKeys.has(student.studentId)
          || isStudentMatchedByClass(student, targetMode, selectedClassIds)
        ));
        const visibleAppliedClasses = appliedClasses.slice(0, appliedPreviewLimit);
        const visibleAppliedStudents = appliedStudents.slice(0, appliedPreviewLimit);
        const selectableScopeClassIds = scopeClasses
          .filter((item) => selectedClassIds.has(item.id) || (!otherSelectedClassIds.has(item.id) && !otherDirectStudentClassIds.has(item.id)))
          .map((item) => item.id);
        const classScopeLabel = selectedClassCount > 0 ? `${selectedClassCount} lớp` : "Chưa chọn lớp";
        const classSelectionHint = selectedClassCount > 0
          ? `Đã chọn ${selectedClassCount} lớp.`
          : "Chưa chọn lớp áp dụng.";

        return (
          <div key={`${target.id || "new"}-${index}`} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-primary">Dòng đối tượng {index + 1}</p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {studentGroupName(target.targetGroupCode)}
                  {resolvedFacultyName ? ` · ${resolvedFacultyName}` : " · Tất cả khoa"}
                  {showClasses ? ` · ${classScopeLabel}` : ""}
                  {showStudents ? ` · ${appliedStudentCount} sinh viên áp dụng` : ""}
                </p>
              </div>
              {safeTargets.length > 1 && (
                <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-error hover:bg-error-container" onClick={() => removeTarget(index)} type="button">
                  <Trash2 className="h-4 w-4" />
                  Gỡ
                </button>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">Nhóm sinh viên</span>
                <select
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm focus-ring"
                  onChange={(event) => changeGroup(index, event.target.value)}
                  value={target.targetGroupCode}
                >
                  {resolvedGroups.map((group) => (
                    <option key={groupCode(group)} value={groupCode(group)}>
                      {group.name || studentGroupName(groupCode(group))}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">Phạm vi chọn</span>
                <select
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm focus-ring"
                  onChange={(event) => changeMode(index, event.target.value as ExamTargetMode)}
                  value={targetMode}
                >
                  {targetModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-on-surface-variant">{targetModes.find((mode) => mode.value === targetMode)?.helper}</span>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">Khoa</span>
                <select
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm focus-ring"
                  onChange={(event) => changeFaculty(index, event.target.value)}
                  value={resolvedFacultyId}
                >
                  <option value="">Tất cả khoa</option>
                  {faculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.facultyName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-on-surface">Giờ mở đề</span>
                  <input
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm focus-ring"
                    onChange={(event) => updateTarget(index, { startTime: event.target.value })}
                    required
                    type="datetime-local"
                    value={target.startTime}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-on-surface">Giờ đóng đề</span>
                  <input
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm focus-ring"
                    onChange={(event) => updateTarget(index, { endTime: event.target.value })}
                    required
                    type="datetime-local"
                    value={target.endTime}
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <section className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-on-surface">Lớp đã áp dụng</p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {showClasses ? `${appliedClasses.length} lớp trong phạm vi hiện tại.` : "Kỳ thi này không áp dụng theo lớp."}
                    </p>
                  </div>
                </div>
                {appliedClasses.length > 0 ? (
                  <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
                    {visibleAppliedClasses.map((item) => (
                      <span key={item.id} className="rounded-md bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-primary">
                        {item.classCode}
                      </span>
                    ))}
                    {appliedClasses.length > visibleAppliedClasses.length && (
                      <span className="rounded-md bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                        +{appliedClasses.length - visibleAppliedClasses.length} lớp
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-on-surface-variant">Chưa có lớp nào được chọn.</p>
                )}
              </section>

              <section className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
                <div>
                  <p className="text-sm font-bold text-on-surface">Sinh viên đã áp dụng</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {appliedStudents.length} sinh viên đủ điều kiện theo lớp hoặc được chọn riêng.
                  </p>
                </div>
                {appliedStudents.length > 0 ? (
                  <div className="mt-3 max-h-24 space-y-2 overflow-y-auto pr-1">
                    {visibleAppliedStudents.map((student) => {
                      const directSelected = selectedStudentKeys.has(student.id) || selectedStudentKeys.has(student.studentId);
                      const matchedByClass = isStudentMatchedByClass(student, targetMode, selectedClassIds);
                      return (
                        <div key={student.id} className="rounded-md bg-surface-container-lowest px-2.5 py-1.5 text-xs text-on-surface">
                          <span className="font-semibold">{student.fullName}</span>
                          <span className="text-on-surface-variant">
                            {" "}· {student.studentId} · {student.clazz?.classCode || "Chưa có lớp"}
                            {matchedByClass && !directSelected ? " · Theo lớp" : ""}
                          </span>
                        </div>
                      );
                    })}
                    {appliedStudents.length > visibleAppliedStudents.length && (
                      <p className="text-xs font-semibold text-on-surface-variant">
                        Còn {appliedStudents.length - visibleAppliedStudents.length} sinh viên khác. Dùng ô tìm MSSV/họ tên bên dưới để xem nhanh.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-on-surface-variant">Chưa có sinh viên nào được áp dụng.</p>
                )}
              </section>
            </div>

            {(showClasses || showStudents) && (
              <div className={`mt-4 grid gap-4 ${showClasses && showStudents ? "xl:grid-cols-2" : ""}`}>
                {showClasses && (
                  <section className="flex min-h-0 flex-col">
                    <div className="mb-2 flex min-h-12 flex-col justify-end gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <span className="text-sm font-semibold text-on-surface">Lớp áp dụng</span>
                        <span className="mt-1 block text-xs text-on-surface-variant">{classSelectionHint}</span>
                      </div>
                      <button
                        className="text-sm font-semibold text-primary hover:underline"
                        onClick={() => {
                          updateTarget(index, {
                            classIds: selectableScopeClassIds,
                            classCodes: selectedClassCodes(classes, selectableScopeClassIds),
                          });
                        }}
                        type="button"
                      >
                        Chọn tất cả các lớp
                      </button>
                    </div>
                    <label className="relative mb-2 block">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                      <input
                        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-9 pr-3 text-sm focus-ring"
                        onChange={(event) => setClassSearches((current) => ({ ...current, [index]: event.target.value }))}
                        placeholder="Tìm lớp theo mã hoặc khoa"
                        value={classSearches[index] || ""}
                      />
                    </label>
                    <div className="h-56 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-low p-2">
                      {filteredClasses.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {filteredClasses.map((item) => (
                            <label key={item.id} className="flex items-center gap-2 rounded-lg bg-surface-container-lowest px-3 py-2 text-sm text-on-surface">
                              {(() => {
                                const selectedHere = selectedClassIds.has(item.id);
                                const usedElsewhere = otherSelectedClassIds.has(item.id) || otherDirectStudentClassIds.has(item.id);
                                return (
                                  <>
                                    <input
                                      checked={selectedHere}
                                      className="h-4 w-4 rounded border-outline-variant text-primary focus-ring disabled:opacity-60"
                                      disabled={!selectedHere && usedElsewhere}
                                      onChange={(event) => changeClass(index, event)}
                                      title={!selectedHere && usedElsewhere ? "Lớp này đã được áp dụng ở khung giờ khác" : undefined}
                                      type="checkbox"
                                      value={item.id}
                                    />
                                    <span className="min-w-0 truncate">
                                      {item.classCode}
                                      {!selectedHere && usedElsewhere ? " · Đã chọn ở khung khác" : ""}
                                    </span>
                                  </>
                                );
                              })()}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="px-3 py-4 text-sm text-on-surface-variant">Không tìm thấy lớp phù hợp.</p>
                      )}
                    </div>
                  </section>
                )}

                {showStudents && (
                  <section className="flex min-h-0 flex-col">
                    <div className="mb-2 flex min-h-12 flex-col justify-end gap-1">
                      <span className="text-sm font-semibold text-on-surface">Sinh viên áp dụng</span>
                      <span className="text-xs text-on-surface-variant">
                        Đã áp dụng {appliedStudentCount} sinh viên, trong đó {directStudentCount} sinh viên chọn riêng.
                      </span>
                    </div>
                    <label className="relative mb-2 block">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                      <input
                        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-9 pr-3 text-sm focus-ring"
                        onChange={(event) => setStudentSearches((current) => ({ ...current, [index]: event.target.value }))}
                        placeholder="Tìm MSSV, họ tên hoặc lớp"
                        value={studentSearches[index] || ""}
                      />
                    </label>
                    <div className="h-56 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-low p-2">
                      {visibleStudents.length > 0 ? (
                        <div className="grid gap-2">
                          {visibleStudents.map((student) => (
                            <label key={student.id} className="flex items-center gap-3 rounded-lg bg-surface-container-lowest px-3 py-2 text-sm text-on-surface">
                              {(() => {
                                const directSelected = selectedStudentKeys.has(student.id) || selectedStudentKeys.has(student.studentId);
                                const matchedByClass = isStudentMatchedByClass(student, targetMode, selectedClassIds);
                                const usedElsewhere = otherSelectedStudentKeys.has(student.id)
                                  || otherSelectedStudentKeys.has(student.studentId)
                                  || Boolean(student.clazz?.id && otherSelectedClassIds.has(student.clazz.id));
                                return (
                                  <>
                                    <input
                                      checked={directSelected || matchedByClass}
                                      className="h-4 w-4 rounded border-outline-variant text-primary focus-ring disabled:opacity-70"
                                      disabled={(matchedByClass && !directSelected) || (!directSelected && usedElsewhere)}
                                      onChange={(event) => changeStudent(index, event)}
                                      title={
                                        matchedByClass && !directSelected
                                          ? "Sinh viên được áp dụng thông qua lớp đã chọn"
                                          : !directSelected && usedElsewhere
                                            ? "Sinh viên này đã được áp dụng ở khung giờ khác"
                                            : undefined
                                      }
                                      type="checkbox"
                                      value={studentKey(student)}
                                    />
                                    <span className="min-w-0">
                                      <span className="block truncate font-semibold">{student.fullName}</span>
                                      <span className="block truncate text-xs text-on-surface-variant">
                                        {student.studentId} · {student.clazz?.classCode || "Chưa có lớp"}
                                        {matchedByClass && !directSelected ? " · Theo lớp" : ""}
                                        {!directSelected && usedElsewhere ? " · Đã chọn ở khung khác" : ""}
                                      </span>
                                    </span>
                                  </>
                                );
                              })()}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="px-3 py-4 text-sm text-on-surface-variant">Không tìm thấy sinh viên phù hợp.</p>
                      )}
                      {studentCandidates.length > visibleStudents.length && (
                        <p className="px-3 py-3 text-xs text-on-surface-variant">
                          Đang hiển thị 120 kết quả đầu tiên. Nhập thêm từ khóa để lọc chính xác hơn.
                        </p>
                      )}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ExamTargetEditor;
