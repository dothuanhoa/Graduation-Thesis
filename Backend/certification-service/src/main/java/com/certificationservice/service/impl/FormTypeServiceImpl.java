package com.certificationservice.service.impl;

import com.certificationservice.domain.FormType;
import com.certificationservice.dto.FormTypeDTO;
import com.certificationservice.dto.FormTypeRequestDTO;
import com.certificationservice.exception.ResourceNotFoundException;
import com.certificationservice.repository.FormTypeRepository;
import com.certificationservice.service.FormTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormTypeServiceImpl implements FormTypeService {

    private static final List<String> DEFAULT_FORM_CODES = List.of("NVQS", "KHAC", "VAY_VON");
    private static final Map<String, Integer> FORM_CODE_ORDER = Map.of(
            "NVQS", 0,
            "KHAC", 1,
            "VAY_VON", 2
    );

    private final FormTypeRepository formTypeRepository;

    @Override
    @Transactional
    public FormTypeDTO createFormType(FormTypeRequestDTO dto) {
        if (formTypeRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Tên form đã tồn tại: " + dto.getName());
        }
        FormType formType = new FormType();
        formType.setName(dto.getName());
        formType.setDescription(dto.getDescription());
        if(dto.getFormCode().compareTo("")==0){
            formType.setFormCode(null);
        }else {
            formType.setFormCode(dto.getFormCode());
        }
        formType.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
        FormType saved = formTypeRepository.save(formType);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public FormTypeDTO updateFormType(Long id, FormTypeRequestDTO dto) {
        FormType formType = formTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy form type: " + id));
        
        if (formTypeRepository.existsByNameAndIdNot(dto.getName(), id)) {
            throw new IllegalArgumentException("Tên form đã tồn tại: " + dto.getName());
        }

        formType.setName(dto.getName());
        formType.setDescription(dto.getDescription());
        if (dto.getFormCode() != null) {
            formType.setFormCode(dto.getFormCode());
        }
        if (dto.getIsActive() != null) {
            formType.setIsActive(dto.getIsActive());
        }
        FormType saved = formTypeRepository.save(formType);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public void deleteFormType(Long id) {
        FormType formType = formTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy form type: " + id));
        formType.setIsActive(false);
        formTypeRepository.save(formType);
    }

    @Override
    @Transactional(readOnly = true)
    public FormTypeDTO getFormTypeById(Long id) {
        FormType formType = formTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy form type: " + id));
        return mapToDTO(formType);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FormTypeDTO> getAllActiveFormTypes() {
        return formTypeRepository.findByIsActiveTrueAndFormCodeIn(DEFAULT_FORM_CODES).stream()
                .sorted(Comparator.comparingInt(formType ->
                        FORM_CODE_ORDER.getOrDefault(formType.getFormCode(), DEFAULT_FORM_CODES.size())))
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private FormTypeDTO mapToDTO(FormType formType) {
        FormTypeDTO dto = new FormTypeDTO();
        dto.setId(formType.getId());
        dto.setName(formType.getName());
        dto.setFormCode(formType.getFormCode());
        dto.setDescription(formType.getDescription());
        dto.setIsActive(formType.getIsActive());
        dto.setCreatedAt(formType.getCreatedAt());
        dto.setUpdatedAt(formType.getUpdatedAt());
        return dto;
    }
}
