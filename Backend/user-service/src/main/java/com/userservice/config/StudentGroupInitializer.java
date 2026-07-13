package com.userservice.config;

import com.userservice.domain.StudentGroup;
import com.userservice.repository.StudentGroupRepository;
import com.userservice.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class StudentGroupInitializer implements CommandLineRunner {
    private final StudentGroupRepository studentGroupRepository;
    private final UserProfileRepository userProfileRepository;

    @Override
    @Transactional
    public void run(String... args) {
        ensureGroup(1, "1", "Đầu khóa");
        ensureGroup(2, "2", "Giữa khóa");
        ensureGroup(3, "3", "Cuối khóa");
        studentGroupRepository.findByCode("1").ifPresent(userProfileRepository::assignDefaultStudentGroup);
    }

    private void ensureGroup(Integer id, String code, String name) {
        StudentGroup group = studentGroupRepository.findById(id).orElseGet(StudentGroup::new);
        group.setId(id);
        group.setCode(code);
        group.setName(name);
        studentGroupRepository.save(group);
    }
}
