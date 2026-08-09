package com.userservice.service;

import java.util.List;

public interface FaceAnalysisService {
    void validateSingleReferenceFace(byte[] imageBytes);

    List<FaceMatch> compareFaces(byte[] sourceImageBytes, byte[] targetImageBytes, float similarityThreshold);

    record FaceMatch(float similarity, Float left, Float top, Float width, Float height) {
    }
}
