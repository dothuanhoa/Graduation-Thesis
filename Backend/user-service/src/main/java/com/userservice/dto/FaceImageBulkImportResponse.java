package com.userservice.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FaceImageBulkImportResponse {
    private int total;
    private int succeeded;
    private int failed;
    private List<FaceImageImportItemResult> items;
}
