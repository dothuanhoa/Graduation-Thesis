package com.certificationservice.service;

import com.certificationservice.dto.FormTypeDTO;
import java.util.List;

public interface FormTypeService {
    FormTypeDTO createFormType(FormTypeDTO dto);
    FormTypeDTO updateFormType(Long id, FormTypeDTO dto);
    void deleteFormType(Long id);
    FormTypeDTO getFormTypeById(Long id);
    List<FormTypeDTO> getAllActiveFormTypes();
}
