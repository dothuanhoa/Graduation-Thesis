# Bước 1: Dùng JDK 21 bọc Maven/Gradle để build file JAR
FROM gradle:8.6.0-jdk21 AS build
WORKDIR /app
COPY . .
RUN gradle bootJar -x test --no-daemon

# Bước 2: Chỉ lấy file JAR đã build xong sang một môi trường JRE gọn nhẹ để chạy
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]