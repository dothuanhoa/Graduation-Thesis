package com.certificationservice.config;

import com.certificationservice.domain.FormType;
import com.certificationservice.repository.FormTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DefaultFormTypeInitializer implements CommandLineRunner {

    private final FormTypeRepository formTypeRepository;

    @Override
    @Transactional
    public void run(String... args) {
        List<DefaultFormType> defaults = List.of(
                new DefaultFormType("NVQS", "NVQS", "Đơn xác nhận nghĩa vụ quân sự"),
                new DefaultFormType("KHAC", "KHAC", "Đơn xác nhận thông tin sinh viên"),
                new DefaultFormType("VAY_VON", "VAY_VON", "Giấy xác nhận vay vốn sinh viên")
        );

        defaults.forEach(this::upsertDefaultFormType);
    }

    private void upsertDefaultFormType(DefaultFormType defaultFormType) {
        FormType formType = formTypeRepository.findByFormCode(defaultFormType.formCode())
                .or(() -> formTypeRepository.findByName(defaultFormType.name()))
                .orElseGet(FormType::new);

        formType.setFormCode(defaultFormType.formCode());
        formType.setName(defaultFormType.name());
        formType.setDescription(defaultFormType.description());
        formType.setIsActive(true);
        formTypeRepository.save(formType);
    }

    private record DefaultFormType(String formCode, String name, String description) {
    }
}
