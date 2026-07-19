package com.certificationservice.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

public interface FileService {
    String uploadFile(MultipartFile file) throws IOException;
    Resource loadFileAsResource(String fileName) throws IOException;
}
