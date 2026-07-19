# Backend Test Cases

Tài liệu này liệt kê các test case đã bổ sung cho từng backend service. Các test tự động nằm trong thư mục `src/test/java` của từng service.

## discovery-server

File: `discovery-server/src/test/java/com/discoveryserver/DiscoveryServerApplicationTests.java`

| Mã | Test case | Kỳ vọng |
| --- | --- | --- |
| DS-01 | Khởi động Spring context | Context tải thành công. |
| DS-02 | Kiểm tra ứng dụng cấu hình Eureka Server | Application class có annotation `@EnableEurekaServer`. |

## api-gateway

File: `api-gateway/src/test/java/com/apigateway/util/JwtUtilTest.java`

| Mã | Test case | Kỳ vọng |
| --- | --- | --- |
| GW-01 | Đọc subject và role từ JWT hợp lệ | Trích xuất đúng username và role. |
| GW-02 | Nhận JWT sai định dạng | Token không hợp lệ bị từ chối. |

## auth-service

Files:
- `auth-service/src/test/java/com/authservice/service/JwtServiceTest.java`
- `auth-service/src/test/java/com/authservice/service/AuthServiceTest.java`

| Mã | Test case | Kỳ vọng |
| --- | --- | --- |
| AUTH-01 | Tạo access token và đọc lại từ Bearer token | Đọc đúng username/role trong token. |
| AUTH-02 | Token thiếu tiền tố Bearer | Bị từ chối. |
| AUTH-03 | Đăng nhập tài khoản bị khóa | Trả lỗi `FORBIDDEN`. |
| AUTH-04 | Quên mật khẩu vượt quá 2 lần/tháng | Trả lỗi `TOO_MANY_REQUESTS`. |
| AUTH-05 | Bulk register danh sách sinh viên | Tạo account mới, bỏ qua account đã có, tự sinh email `mssv@student.edu.vn`. |

## user-service

File: `user-service/src/test/java/com/userservice/service/impl/UserServiceImplTest.java`

| Mã | Test case | Kỳ vọng |
| --- | --- | --- |
| USER-01 | Tạo sinh viên chưa có email | Tự sinh email theo MSSV và gọi auth-service tạo tài khoản. |
| USER-02 | Chuyển sinh viên vào lớp đã đủ 120 người | Bị từ chối để giữ giới hạn sĩ số lớp. |
| USER-03 | Cập nhật nhóm sinh viên theo lớp | Cập nhật đúng nhóm cho các sinh viên thuộc lớp được chọn. |

## notification-service

File: `notification-service/src/test/java/com/notificationservice/service/NotificationServiceTest.java`

| Mã | Test case | Kỳ vọng |
| --- | --- | --- |
| NOTI-01 | Tạo thông báo có nội dung HTML từ TinyMCE | Lưu nguyên nội dung HTML. |
| NOTI-02 | Đánh dấu đã đọc nhiều lần | Thao tác idempotent, không tạo lỗi/trùng dữ liệu. |
| NOTI-03 | Sinh viên lấy thông báo của mình | Trả đúng trạng thái đã đọc và giữ nội dung HTML. |

## certification-service

File: `certification-service/src/test/java/com/certificationservice/service/ConfirmationRequestServiceImplTest.java`

| Mã | Test case | Kỳ vọng |
| --- | --- | --- |
| CERT-01 | Tạo đơn với loại đơn không hoạt động | Bị từ chối. |
| CERT-02 | Upload minh chứng khi đơn chưa ở trạng thái cần thông tin | Bị từ chối. |
| CERT-03 | Cập nhật hàng loạt trạng thái và ngày hẹn trả | Cập nhật đúng nhiều đơn cùng lúc. |

## activity-service

File: `activity-service/src/test/java/com/activityservice/service/ActivityServiceTest.java`

| Mã | Test case | Kỳ vọng |
| --- | --- | --- |
| ACT-01 | Tạo hoạt động tự do | Xóa capacity và Google Form vì không cần đăng ký. |
| ACT-02 | Thêm tay danh sách đăng ký cho hoạt động tự do | Bị từ chối. |
| ACT-03 | Điểm danh hoạt động tự do với sinh viên tồn tại | Tự tạo registration và đánh dấu đã điểm danh. |

## exam-service

File: `exam-service/src/test/java/com/examservice/service/ExamServiceTest.java`

| Mã | Test case | Kỳ vọng |
| --- | --- | --- |
| EXAM-01 | Tạo kỳ thi có đối tượng lớp/sinh viên | Lưu normalized target class/student identifiers. |
| EXAM-02 | Sinh viên nộp bài khi còn thiếu câu trả lời | Bị từ chối và yêu cầu trả lời đầy đủ trước khi nộp. |