package com.certificationservice.service;

import com.certificationservice.dto.FormTypeDTO;
import com.certificationservice.dto.FormTypeRequestDTO;
import java.util.List;

public interface FormTypeService {
    FormTypeDTO createFormType(FormTypeRequestDTO dto);
    FormTypeDTO updateFormType(Long id, FormTypeRequestDTO dto);
    void deleteFormType(Long id);
    FormTypeDTO getFormTypeById(Long id);
    List<FormTypeDTO> getAllActiveFormTypes();
}
