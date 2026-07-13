package com.userservice.dto;

import lombok.Getter;

@Getter
public class OrganizationImportSummary {
    private int facultiesCreated;
    private int facultiesUpdated;
    private int facultiesSkipped;
    private int academicYearsCreated;
    private int academicYearsSkipped;
    private int classesCreated;
    private int classesUpdated;
    private int classesSkipped;

    public void facultyCreated() {
        facultiesCreated++;
    }

    public void facultyUpdated() {
        facultiesUpdated++;
    }

    public void facultySkipped() {
        facultiesSkipped++;
    }

    public void academicYearCreated() {
        academicYearsCreated++;
    }

    public void academicYearSkipped() {
        academicYearsSkipped++;
    }

    public void classCreated() {
        classesCreated++;
    }

    public void classUpdated() {
        classesUpdated++;
    }

    public void classSkipped() {
        classesSkipped++;
    }

    public String toFacultyMessage() {
        return "Đã import khoa: tạo mới " + facultiesCreated
                + ", cập nhật " + facultiesUpdated
                + ", bỏ qua " + facultiesSkipped + ".";
    }

    public String toAcademicYearMessage() {
        return "Đã import niên khóa: tạo mới " + academicYearsCreated
                + ", bỏ qua " + academicYearsSkipped + ".";
    }

    public String toClassMessage() {
        return "Đã import lớp: tạo mới " + classesCreated
                + ", cập nhật " + classesUpdated
                + ", bỏ qua " + classesSkipped
                + ". Tự động tạo " + facultiesCreated + " khoa và "
                + academicYearsCreated + " niên khóa còn thiếu.";
    }

    public String toStudentMessage(int createdStudents, int updatedStudents, int skippedStudents) {
        return "Đã import sinh viên: tạo mới " + createdStudents
                + ", cập nhật " + updatedStudents
                + ", bỏ qua " + skippedStudents
                + ". Tự động tạo " + facultiesCreated + " khoa, "
                + academicYearsCreated + " niên khóa và "
                + classesCreated + " lớp còn thiếu.";
    }
}
