package com.userservice.service.impl;

import com.userservice.exception.BadRequestException;
import com.userservice.service.FaceAnalysisService;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.rekognition.RekognitionClient;
import software.amazon.awssdk.services.rekognition.model.BoundingBox;
import software.amazon.awssdk.services.rekognition.model.CompareFacesMatch;
import software.amazon.awssdk.services.rekognition.model.CompareFacesRequest;
import software.amazon.awssdk.services.rekognition.model.DetectFacesRequest;
import software.amazon.awssdk.services.rekognition.model.Image;
import software.amazon.awssdk.services.rekognition.model.RekognitionException;

import java.util.List;

@Service
public class AwsFaceAnalysisService implements FaceAnalysisService {
    private final RekognitionClient client;

    public AwsFaceAnalysisService(
            @Value("${app.student-face.rekognition-region:ap-southeast-1}") String rekognitionRegion
    ) {
        String region = rekognitionRegion == null || rekognitionRegion.isBlank()
                ? "ap-southeast-1"
                : rekognitionRegion.trim();
        this.client = RekognitionClient.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }

    @Override
    public void validateSingleReferenceFace(byte[] imageBytes) {
        try {
            var response = client.detectFaces(DetectFacesRequest.builder()
                    .image(bytesImage(imageBytes))
                    .attributesWithStrings("DEFAULT")
                    .build());
            int faceCount = response.faceDetails().size();
            if (faceCount == 0) {
                throw new BadRequestException("AWS không phát hiện khuôn mặt trong ảnh mẫu");
            }
            if (faceCount > 1) {
                throw new BadRequestException("Ảnh mẫu chỉ được chứa đúng một khuôn mặt");
            }
            Float confidence = response.faceDetails().get(0).confidence();
            if (confidence == null || confidence < 90F) {
                throw new BadRequestException("Khuôn mặt trong ảnh mẫu không đủ rõ, vui lòng chọn ảnh khác");
            }
        } catch (RekognitionException ex) {
            throw awsError("AWS Rekognition không phân tích được ảnh mẫu", ex);
        }
    }

    @Override
    public List<FaceMatch> compareFaces(byte[] sourceImageBytes, byte[] targetImageBytes, float similarityThreshold) {
        try {
            var response = client.compareFaces(CompareFacesRequest.builder()
                    .sourceImage(bytesImage(sourceImageBytes))
                    .targetImage(bytesImage(targetImageBytes))
                    .similarityThreshold(similarityThreshold)
                    .build());
            return response.faceMatches().stream()
                    .map(this::toMatch)
                    .toList();
        } catch (RekognitionException ex) {
            throw awsError("AWS Rekognition không thể so khớp khuôn mặt", ex);
        }
    }

    private FaceMatch toMatch(CompareFacesMatch match) {
        BoundingBox box = match.face() == null ? null : match.face().boundingBox();
        return new FaceMatch(
                match.similarity() == null ? 0F : match.similarity(),
                box == null ? null : box.left(),
                box == null ? null : box.top(),
                box == null ? null : box.width(),
                box == null ? null : box.height()
        );
    }

    private Image bytesImage(byte[] bytes) {
        return Image.builder().bytes(SdkBytes.fromByteArray(bytes)).build();
    }

    @PreDestroy
    void closeClient() {
        client.close();
    }

    private BadRequestException awsError(String message, RekognitionException ex) {
        String detail = ex.awsErrorDetails() == null ? ex.getMessage() : ex.awsErrorDetails().errorMessage();
        return new BadRequestException(message + (detail == null || detail.isBlank() ? "" : ": " + detail));
    }
}
