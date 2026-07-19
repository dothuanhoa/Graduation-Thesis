# Detailed Service Test Cases

Ngày cập nhật: 2026-07-19  
Phạm vi: toàn bộ backend microservices và các luồng tích hợp chính của hệ thống Quản lý Công tác Sinh viên STU.

Tài liệu này thiết kế test case ở mức đủ chi tiết để dùng cho QA thủ công, Postman/Newman, unit test, integration test và regression test sau mỗi lần merge.

## 1. Quy ước kiểm thử

### Vai trò kiểm thử

| Vai trò | Mô tả |
| --- | --- |
| ANON | Người chưa đăng nhập |
| STUDENT | Sinh viên thường |
| ADMIN | Chuyên viên CTSV hoặc tài khoản quản trị |
| INTERNAL | Service gọi nội bộ qua endpoint internal |

### Dữ liệu nền nên chuẩn bị

| Mã dữ liệu | Nội dung |
| --- | --- |
| ADMIN_01 | username `admin`, role `ADMIN`, status `ACTIVE` |
| STUDENT_01 | MSSV `DH52201258`, email `DH52201258@student.edu.vn`, status `STUDYING`, lớp `D22_TH04`, khoa CNTT, nhóm Đầu khóa |
| STUDENT_02 | MSSV hợp lệ khác, status `STUDYING`, cùng lớp với STUDENT_01 |
| STUDENT_INACTIVE | Sinh viên có tài khoản bị khóa hoặc trạng thái không còn học |
| CLASS_FULL | Một lớp đã có đúng 120 sinh viên |
| FACULTY_CNTT | Khoa Công nghệ thông tin |
| ACADEMIC_YEAR_2024 | Niên khóa 2024-2028 |
| ACT_LIMITED | Hoạt động giới hạn đăng ký, có capacity và Google Form |
| ACT_OPEN | Hoạt động tự do tham gia, không cần danh sách đăng ký |
| EXAM_ACTIVE | Kỳ thi ACTIVE, có câu hỏi, có khung giờ và đối tượng áp dụng |
| FORM_NVQS | Loại đơn NVQS đang active |
| FORM_VAY_VON | Loại đơn VAY_VON đang active |
| FORM_KHAC | Loại đơn KHAC đang active |

### Quy ước mức ưu tiên

| Mức | Ý nghĩa |
| --- | --- |
| P0 | Chức năng sống còn, lỗi là block release |
| P1 | Chức năng chính, cần pass trước khi nghiệm thu |
| P2 | Edge case, regression hoặc trải nghiệm người dùng |
| P3 | Non-functional hoặc kiểm tra bổ sung |

## 2. Discovery Server

| ID | Nhóm | Điều kiện | Bước kiểm thử | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Startup | Chưa có service nào chạy | Khởi động discovery-server | Spring context load thành công, Eureka dashboard mở được | P0 |
| DS-002 | Cấu hình | Application class tồn tại | Kiểm tra annotation cấu hình | Có `@EnableEurekaServer` và app lắng nghe đúng port cấu hình | P0 |
| DS-003 | Đăng ký service | Khởi động auth-service sau discovery-server | Chờ service register | Eureka hiển thị auth-service trạng thái UP | P0 |
| DS-004 | Nhiều service | Khởi động user, notification, activity, exam, certification | Quan sát registry | Tất cả service hiện đúng application name, host, port | P0 |
| DS-005 | Heartbeat | Một service đã UP | Tạm dừng service hoặc ngắt heartbeat | Registry chuyển trạng thái unavailable sau timeout cấu hình | P1 |
| DS-006 | Re-register | Service bị restart | Khởi động lại service cùng application name | Registry cập nhật instance mới, không giữ instance cũ quá lâu | P1 |
| DS-007 | Gateway discovery | Gateway dùng service discovery | Gọi API qua gateway tới một service đã đăng ký | Gateway route được đến service tương ứng | P0 |
| DS-008 | Resilience | Discovery-server restart khi các service còn chạy | Restart discovery-server | Service đăng ký lại được sau khi discovery-server sẵn sàng | P2 |

## 3. API Gateway

| ID | Nhóm | Điều kiện | Bước kiểm thử | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| GW-001 | Public route | ANON | POST `/api/auth/login` | Cho phép đi qua gateway, không yêu cầu token | P0 |
| GW-002 | Public route | ANON | POST `/api/auth/forgot-password` | Cho phép đi qua gateway, không yêu cầu token | P0 |
| GW-003 | Protected route | ANON | GET `/api/users` | Trả 401 | P0 |
| GW-004 | Bearer token | Token hợp lệ role ADMIN | GET `/api/users` | Route thành công và forward thông tin user xuống service | P0 |
| GW-005 | Token sai định dạng | Header `Authorization: Bearer abc` | Gọi route protected bất kỳ | Trả 401, không forward request | P0 |
| GW-006 | Token hết hạn | Access token expired | Gọi route protected | Trả 401 để frontend thực hiện refresh | P0 |
| GW-007 | Refresh token dùng sai | Dùng refresh token ở header Authorization | Gọi route protected | Trả 401 | P1 |
| GW-008 | Phân quyền admin | STUDENT | Gọi endpoint admin như POST `/api/users` | Trả 403 hoặc bị service từ chối theo policy | P0 |
| GW-009 | Admin xem student | ADMIN | Gọi route student cần xem dữ liệu | Được phép nếu nghiệp vụ cho admin quan sát | P1 |
| GW-010 | Header propagation | Token hợp lệ | Kiểm tra request đến service | Có header/claim định danh username, role, studentId/tsid nếu hệ thống đang dùng | P0 |
| GW-011 | Route user-service | Token hợp lệ | GET `/api/users/profile/DH52201258` | Gateway chuyển đúng sang user-service | P0 |
| GW-012 | Route notification-service | Token hợp lệ | GET `/api/notifications/my` | Gateway chuyển đúng sang notification-service | P0 |
| GW-013 | Route activity-service | Token hợp lệ | GET `/api/activities` | Gateway chuyển đúng sang activity-service | P0 |
| GW-014 | Route exam-service | Token hợp lệ | GET `/api/exams/my` | Gateway chuyển đúng sang exam-service | P0 |
| GW-015 | Route certification-service | Token hợp lệ | GET `/api/certifications/requests/my-requests` | Gateway chuyển đúng sang certification-service | P0 |
| GW-016 | CORS | Browser preflight | OPTIONS đến các route API | Trả header CORS đúng, không block frontend | P1 |
| GW-017 | Service down | Tắt activity-service | GET `/api/activities` | Trả lỗi service unavailable rõ ràng, không timeout dài | P1 |
| GW-018 | Log bảo mật | Gọi route có token | Kiểm tra log gateway | Không log full access token, refresh token hoặc password | P1 |
| GW-019 | Tải file | Token hợp lệ | Gọi API file upload/download qua gateway | Không mất multipart boundary, không hỏng stream | P1 |
| GW-020 | Tải lớn | File hợp lệ gần giới hạn | Upload qua gateway | Request đi qua nếu dưới giới hạn, bị từ chối rõ ràng nếu vượt giới hạn | P2 |

## 4. Auth Service

| ID | Nhóm | Điều kiện | Bước kiểm thử | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| AUTH-001 | Login | Tài khoản active, mật khẩu đúng | POST `/api/auth/login` | Trả accessToken, refreshToken, role, thông tin firstLogin nếu có | P0 |
| AUTH-002 | Login | Username không tồn tại | POST `/api/auth/login` | Trả 401 hoặc 400 với thông báo chung, không tiết lộ tài khoản tồn tại hay không | P0 |
| AUTH-003 | Login | Mật khẩu sai | POST `/api/auth/login` | Trả 401, không tạo token | P0 |
| AUTH-004 | Login | Tài khoản bị khóa | POST `/api/auth/login` | Trả 403, không tạo token | P0 |
| AUTH-005 | Login validate | Thiếu username | POST login | Trả 400 | P0 |
| AUTH-006 | Login validate | Thiếu password | POST login | Trả 400 | P0 |
| AUTH-007 | Token | Login thành công | Decode access token | Subject, role, thời hạn, signature đúng | P0 |
| AUTH-008 | Refresh | Refresh token hợp lệ | POST `/api/auth/refresh` | Cấp accessToken mới và có thể rotate refreshToken nếu thiết kế yêu cầu | P0 |
| AUTH-009 | Refresh | Refresh token hết hạn | POST refresh | Trả 401, frontend phải logout | P0 |
| AUTH-010 | Refresh | Refresh token đã logout/revoked | POST refresh | Trả 401 | P0 |
| AUTH-011 | Logout | Đang có refresh token hợp lệ | POST `/api/auth/logout` | Refresh token bị vô hiệu hóa, lần refresh sau trả 401 | P0 |
| AUTH-012 | First change | Tài khoản firstLogin | POST `/api/auth/first-change-password` mật khẩu mới hợp lệ | Mật khẩu đổi thành công, firstLogin tắt | P0 |
| AUTH-013 | First change validate | Mật khẩu mới quá ngắn | POST first-change-password | Trả 400, không đổi mật khẩu | P0 |
| AUTH-014 | Change password | STUDENT/ADMIN đã đăng nhập | POST `/api/auth/change-password` với currentPassword đúng | Đổi mật khẩu thành công, gửi email thông báo tiếng Việt có dấu | P0 |
| AUTH-015 | Change password | currentPassword sai | POST change-password | Trả 400/401, không đổi mật khẩu | P0 |
| AUTH-016 | Forgot password | Email tồn tại | POST `/api/auth/forgot-password` | Tạo reset token, gửi mail link đặt lại mật khẩu | P0 |
| AUTH-017 | Forgot password | Email không tồn tại | POST forgot-password | Trả response chung, không tiết lộ email tồn tại hay không | P1 |
| AUTH-018 | Forgot limit | Cùng user đã gọi 2 lần trong tháng | POST forgot-password lần 3 | Trả 429 hoặc 400 theo thiết kế, không gửi mail mới | P0 |
| AUTH-019 | Reset password | Token hợp lệ, chưa dùng, chưa hết hạn | POST `/api/auth/reset-password` | Đổi mật khẩu, token chuyển used/revoked, gửi mail thông báo | P0 |
| AUTH-020 | Reset password | Token đã dùng | POST reset-password | Trả 400, không đổi mật khẩu | P0 |
| AUTH-021 | Reset password | Token hết hạn | POST reset-password | Trả 400/401, không đổi mật khẩu | P0 |
| AUTH-022 | Internal register | INTERNAL | POST `/api/auth/internal/register` với username mới | Tạo tài khoản STUDENT, hash mật khẩu, gửi mail tài khoản ban đầu | P0 |
| AUTH-023 | Internal register duplicate | Username đã tồn tại | POST internal/register | Không tạo trùng, trả lỗi hoặc xử lý idempotent theo contract | P0 |
| AUTH-024 | Bulk register nhỏ | 10 sinh viên hợp lệ | POST `/api/auth/internal/bulk-register` | Tạo đủ tài khoản, trả số tạo mới/bỏ qua/lỗi | P0 |
| AUTH-025 | Bulk register lớn | 5.000-10.000 sinh viên | POST bulk-register hoặc qua job import | Không timeout; mail được đưa vào queue/batch; kết quả có tiến độ | P0 |
| AUTH-026 | Bulk register duplicate | File có MSSV trùng tài khoản cũ | Bulk register | Không tạo trùng; trả danh sách skipped | P1 |
| AUTH-027 | Mail nội dung | Có cấu hình SMTP/Mailgun hợp lệ | Tạo account/reset/lock/unlock/change password | Email tiếng Việt có dấu, không lỗi font, không lộ hash | P0 |
| AUTH-028 | Mail lỗi provider | Provider mail trả lỗi tạm thời | Trigger gửi mail | Có retry/log lỗi; API chính không lưu dữ liệu nửa vời | P1 |
| AUTH-029 | Revoke | ADMIN gọi internal revoke username | POST `/api/auth/internal/revoke/{username}` | Tài khoản chuyển inactive/locked, gửi mail khóa tài khoản | P0 |
| AUTH-030 | Unlock | ADMIN gọi internal unlock username | POST `/api/auth/internal/unlock/{username}` | Tài khoản active lại, gửi mail mở khóa | P0 |
| AUTH-031 | Reset by admin | ADMIN gọi reset password nội bộ | POST `/api/auth/internal/reset-password/{username}` | Sinh mật khẩu mới, gửi mail, mật khẩu cũ không dùng được | P0 |
| AUTH-032 | Bảo mật DB | Sau tạo/đổi mật khẩu | Kiểm tra DB | Password được hash, không lưu plaintext | P0 |
| AUTH-033 | Bảo mật log | Gọi login/reset/bulk register | Kiểm tra log | Không log password, token reset, refresh token | P1 |
## 5. User Service

| ID | Nhóm | Điều kiện | Bước kiểm thử | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| USER-001 | List | ADMIN | GET `/api/users?page=0&size=10` | Trả danh sách phân trang, totalElements đúng | P0 |
| USER-002 | List size | ADMIN | GET size 10, 20, 50, 100 | Trả đúng số lượng tối đa theo size | P1 |
| USER-003 | Search keyword | Có sinh viên `DH52201258` | GET `/api/users?keyword=DH52201258` | Chỉ trả sinh viên phù hợp MSSV/họ tên/lớp/khoa | P0 |
| USER-004 | Filter khoa | Có nhiều khoa | GET list filter faculty | Chỉ trả sinh viên thuộc khoa chọn | P1 |
| USER-005 | Filter lớp | Có nhiều lớp | GET list filter class | Chỉ trả sinh viên thuộc lớp chọn | P1 |
| USER-006 | Filter trạng thái | Có nhiều trạng thái | GET list status `STUDYING` | Chỉ trả sinh viên đang học | P1 |
| USER-007 | Get by id | ID tồn tại | GET `/api/users/{id}` | Trả profile đầy đủ, gồm lớp/khoa/niên khóa/nhóm | P0 |
| USER-008 | Get by id | ID không tồn tại | GET `/api/users/{id}` | Trả 404 | P0 |
| USER-009 | Get profile | MSSV tồn tại | GET `/api/users/profile/{studentId}` | Trả thông tin dùng cho service khác | P0 |
| USER-010 | Get profile | MSSV không tồn tại | GET profile | Trả 404, service gọi ngoài xử lý được | P0 |
| USER-011 | Student groups | Có dữ liệu nhóm | GET `/api/users/student-groups` | Trả các nhóm Đầu khóa/Giữa khóa/Cuối khóa đúng code | P1 |
| USER-012 | Create manual | Payload hợp lệ, email rỗng | POST `/api/users` | Tạo sinh viên, tự sinh email `MSSV@student.edu.vn`, gọi auth tạo account | P0 |
| USER-013 | Create manual | Email nhập tay hợp lệ | POST user | Lưu email đó, gửi mail account về đúng email | P0 |
| USER-014 | Create validate | Thiếu MSSV | POST user | Trả 400 | P0 |
| USER-015 | Create validate | Thiếu họ tên | POST user | Trả 400 | P0 |
| USER-016 | Create validate | Email sai định dạng | POST user | Trả 400 | P0 |
| USER-017 | Create duplicate | MSSV đã tồn tại | POST user | Trả 409/400, không tạo profile/account trùng | P0 |
| USER-018 | Create class | Chọn lớp còn chỗ | POST user | Sinh viên nằm đúng lớp, lớp tăng sĩ số | P0 |
| USER-019 | Create class full | Chọn CLASS_FULL 120 sinh viên | POST user | Trả 400, không vượt 120 sinh viên/lớp | P0 |
| USER-020 | Update | Profile tồn tại | PUT `/api/users/{id}` đổi họ tên/sđt/email | Cập nhật đúng, giữ MSSV duy nhất | P0 |
| USER-021 | Update class | Chuyển sang lớp còn chỗ | PUT user | Cập nhật lớp mới, lớp cũ giảm sĩ số logic | P0 |
| USER-022 | Update class full | Chuyển sang lớp đủ 120 | PUT user | Trả 400, không đổi lớp | P0 |
| USER-023 | Delete | Sinh viên tồn tại | DELETE `/api/users/{id}` | Xóa hoặc inactive theo thiết kế, tài khoản auth bị revoke nếu có tích hợp | P0 |
| USER-024 | Bulk class | Chọn nhiều studentIds và classId còn chỗ | PATCH `/api/users/bulk/class` | Chuyển tất cả sinh viên được chọn, không vượt 120 | P0 |
| USER-025 | Bulk class capacity | 30 sinh viên chuyển vào lớp còn 100 chỗ | PATCH bulk/class | Trả 400 vì vượt 120, không chuyển partial ngoài thiết kế | P0 |
| USER-026 | Bulk status | Chọn nhiều sinh viên | PATCH `/api/users/bulk/status` sang `SUSPENDED` | Cập nhật trạng thái đủ danh sách, gọi auth khóa nếu nghiệp vụ yêu cầu | P0 |
| USER-027 | Bulk status invalid | Status không thuộc enum | PATCH bulk/status | Trả 400 | P0 |
| USER-028 | Bulk group by students | Chọn 1 hoặc nhiều sinh viên | PATCH `/api/users/bulk/group` scope STUDENTS | Cập nhật đúng nhóm cho sinh viên đã chọn | P0 |
| USER-029 | Bulk group by class | Chọn lớp | PATCH bulk/group scope CLASS | Cập nhật nhóm cho toàn bộ sinh viên trong lớp | P0 |
| USER-030 | Bulk group by academic year | Chọn niên khóa | PATCH bulk/group scope ACADEMIC_YEAR | Cập nhật nhóm cho sinh viên thuộc niên khóa | P0 |
| USER-031 | Bulk group empty | Không chọn sinh viên/lớp/niên khóa | PATCH bulk/group | Trả 400 với thông báo rõ | P0 |
| USER-032 | Contact update | STUDENT | PATCH `/api/users/me/contacts` đổi phone/email liên hệ | Chỉ cập nhật profile của chính sinh viên | P0 |
| USER-033 | Contact security | STUDENT gửi studentId người khác | PATCH me/contacts | Không cập nhật người khác | P0 |
| USER-034 | Import template | ADMIN | GET `/api/users/import/template` | Tải file mẫu đúng cấu trúc file đầu khóa/giữa-cuối khóa, có dấu tiếng Việt | P1 |
| USER-035 | Import sync small | File Excel 20 dòng hợp lệ | POST `/api/users/import` | Tạo sinh viên, tự tạo khoa/lớp/niên khóa thiếu, gọi auth gửi account | P0 |
| USER-036 | Import job large | File 5.000-10.000 dòng | POST `/api/users/import/jobs` | Tạo job, trả jobId ngay, không timeout | P0 |
| USER-037 | Import progress | Job đang chạy | GET `/api/users/import/jobs/{jobId}` | Trả processed/total/success/failed/status để FE hiển thị progress | P0 |
| USER-038 | Import duplicate rows | File có MSSV trùng trong file | Import | Không tạo trùng; trả lỗi theo dòng hoặc skipped | P0 |
| USER-039 | Import duplicate DB | File có MSSV đã tồn tại DB | Import | Cập nhật/bỏ qua theo thiết kế, không tạo trùng | P0 |
| USER-040 | Import missing org | File có lớp/khoa/niên khóa mới | Import | Tự tạo khoa/lớp/niên khóa còn thiếu trước khi lưu sinh viên | P0 |
| USER-041 | Import invalid email | Email sai định dạng | Import | Dòng lỗi được ghi nhận, job vẫn xử lý dòng khác nếu thiết kế cho phép | P1 |
| USER-042 | Import invalid MSSV | MSSV rỗng hoặc sai format | Import | Dòng lỗi, không tạo tài khoản | P0 |
| USER-043 | Import mail queue | File 10.000 dòng | Import | Email account được đưa vào queue/batch, không chỉ gửi được 100 mail đầu | P0 |
| ORG-001 | Faculty list | ADMIN | GET `/api/users/faculties` | Trả danh sách khoa có phân trang/lọc nếu hỗ trợ | P0 |
| ORG-002 | Faculty create | Code/name hợp lệ | POST `/api/users/faculties` | Tạo khoa active | P0 |
| ORG-003 | Faculty duplicate | Code đã tồn tại | POST faculties | Trả 409/400 | P0 |
| ORG-004 | Faculty update | ID tồn tại | PUT `/api/users/faculties/{id}` | Cập nhật name/status | P0 |
| ORG-005 | Faculty delete unused | Khoa chưa được lớp/sinh viên dùng | DELETE faculties/{id} | Xóa thành công | P1 |
| ORG-006 | Faculty delete used | Khoa đang có lớp/sinh viên | DELETE faculties/{id} | Trả 400/409, không mất dữ liệu liên quan | P0 |
| ORG-007 | Faculty import | Excel khoa hợp lệ | POST `/api/users/faculties/import` | Tạo/cập nhật khoa, trả thống kê | P1 |
| ORG-008 | Academic year list | ADMIN | GET `/api/users/academic-years` | Trả danh sách niên khóa | P0 |
| ORG-009 | Academic year create | Name, startYear hợp lệ | POST academic-years | Tạo niên khóa | P0 |
| ORG-010 | Academic year validate | endYear nhỏ hơn startYear hoặc name rỗng | POST academic-years | Trả 400 | P0 |
| ORG-011 | Academic year duplicate | Trùng name/startYear | POST academic-years | Trả 409/400 | P0 |
| ORG-012 | Academic year update/delete/import | Dữ liệu hợp lệ | PUT, DELETE, POST import | Thực hiện đúng, không xóa niên khóa đang được lớp dùng | P1 |
| ORG-013 | Class list | ADMIN | GET `/api/users/classes` | Trả danh sách lớp kèm khoa/niên khóa/sĩ số | P0 |
| ORG-014 | Class create | Code, faculty, academicYear hợp lệ | POST `/api/users/classes` | Tạo lớp active | P0 |
| ORG-015 | Class validate | Thiếu khoa hoặc niên khóa không tồn tại | POST classes | Trả 400/404 | P0 |
| ORG-016 | Class duplicate | Code đã tồn tại | POST classes | Trả 409/400 | P0 |
| ORG-017 | Class update | ID tồn tại | PUT classes/{id} | Cập nhật code/faculty/year/status | P0 |
| ORG-018 | Class delete used | Lớp đang có sinh viên | DELETE classes/{id} | Trả 400/409, không mất liên kết sinh viên | P0 |
| ORG-019 | Class import | Excel lớp hợp lệ | POST `/api/users/classes/import` | Tạo lớp, tự liên kết khoa/niên khóa đã có hoặc báo lỗi rõ | P1 |
## 6. Notification Service

| ID | Nhóm | Điều kiện | Bước kiểm thử | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| NOTI-001 | Admin list | ADMIN | GET `/api/notifications?page=0&size=10` | Trả danh sách phân trang | P0 |
| NOTI-002 | Admin filter priority | Có NORMAL và URGENT | GET filter priority URGENT | Chỉ trả thông báo cấp bách | P1 |
| NOTI-003 | Admin filter target | Có target ALL/FACULTY/CLASS/USER | GET filter target | Trả đúng target | P1 |
| NOTI-004 | Admin filter status | Có DRAFT/PUBLISHED/REVOKED/EXPIRED | GET filter status | Trả đúng trạng thái | P1 |
| NOTI-005 | Admin search | Có title/content chứa keyword | GET search keyword | Tìm theo tiêu đề, nội dung hoặc targetId | P1 |
| NOTI-006 | Create all | ADMIN | POST `/api/notifications` targetType ALL status PUBLISHED | Tạo thông báo toàn trường | P0 |
| NOTI-007 | Create faculty | ADMIN | POST targetType FACULTY targetId khoa | Chỉ lưu khi targetId hợp lệ hoặc không rỗng | P0 |
| NOTI-008 | Create class | ADMIN | POST targetType CLASS targetId lớp | Chỉ lưu khi targetId hợp lệ hoặc không rỗng | P0 |
| NOTI-009 | Create user | ADMIN | POST targetType USER targetId MSSV | Chỉ lưu khi targetId hợp lệ hoặc không rỗng | P0 |
| NOTI-010 | Create validate title | Title rỗng | POST notification | Trả 400 | P0 |
| NOTI-011 | Create validate content | Content HTML rỗng sau khi strip | POST notification | Trả 400 | P0 |
| NOTI-012 | Create validate dates | endDate nhỏ hơn startDate | POST notification | Trả 400 | P0 |
| NOTI-013 | HTML content | Content có heading, list, link, ảnh | POST rồi GET | Lưu và trả nguyên HTML an toàn, không lỗi font tiếng Việt | P0 |
| NOTI-014 | XSS sanitize | Content có script hoặc event handler nguy hiểm | POST/GET | Script bị chặn hoặc sanitize theo policy, không chạy ở frontend | P0 |
| NOTI-015 | Update | Notification tồn tại | PUT `/api/notifications/{id}` | Cập nhật title/content/priority/target/time/status | P0 |
| NOTI-016 | Update not found | ID không tồn tại | PUT notification | Trả 404 | P0 |
| NOTI-017 | Revoke | Notification PUBLISHED | DELETE `/api/notifications/{id}` | Chuyển REVOKED hoặc xóa theo thiết kế, sinh viên không còn thấy | P0 |
| NOTI-018 | Student my all | STUDENT_01 | GET `/api/notifications/my` | Nhận thông báo ALL đang PUBLISHED và trong thời gian hiển thị | P0 |
| NOTI-019 | Student my faculty | STUDENT_01 thuộc CNTT | GET my | Nhận FACULTY CNTT, không nhận khoa khác | P0 |
| NOTI-020 | Student my class | STUDENT_01 lớp D22_TH04 | GET my | Nhận CLASS D22_TH04, không nhận lớp khác | P0 |
| NOTI-021 | Student my user | STUDENT_01 | GET my | Nhận USER DH52201258, không nhận của sinh viên khác | P0 |
| NOTI-022 | Student expired | Notification hết hạn | GET my | Không trả thông báo EXPIRED hoặc hết thời gian | P0 |
| NOTI-023 | Mark read | STUDENT_01 | POST `/api/notifications/{id}/read` | Tạo read record, trả thành công | P0 |
| NOTI-024 | Mark read idempotent | Gọi mark read 2 lần | POST read lần 2 | Không tạo trùng, vẫn trả thành công hoặc 204 | P0 |
| NOTI-025 | Mark read unauthorized target | STUDENT không thuộc target | POST read | Trả 403/404, không tạo read record | P0 |
| NOTI-026 | Dashboard sort | Có nhiều thông báo | Lấy top 3 cho dashboard student | Sắp URGENT trước NORMAL, sau đó theo thời gian mới nhất | P1 |
| NOTI-027 | Image upload jpeg/png/webp | ADMIN | POST `/api/notifications/images/upload` multipart | Lưu vào `public/notification/{year}`, trả URL công khai | P0 |
| NOTI-028 | Image upload creates folder | Folder năm hiện tại chưa tồn tại | Upload ảnh | Tự tạo folder năm và lưu file | P0 |
| NOTI-029 | Image upload invalid type | Upload .exe hoặc text | POST upload | Trả 415/400 | P0 |
| NOTI-030 | Image upload oversized | File vượt giới hạn | POST upload | Trả 413/400, không lưu file | P1 |
| NOTI-031 | Image upload filename | File tên có dấu hoặc ký tự đặc biệt | POST upload | Đổi tên an toàn, tránh path traversal | P0 |
| NOTI-032 | Drag/drop | FE kéo thả nhiều ảnh vào TinyMCE | Upload từng ảnh | Tất cả ảnh hợp lệ được chèn URL đúng vào content | P1 |

## 7. Certification Service

| ID | Nhóm | Điều kiện | Bước kiểm thử | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| CERT-001 | Form types list | ADMIN/STUDENT | GET `/api/certifications/form-types` | Trả đúng 3 loại NVQS, KHAC, VAY_VON đang dùng | P0 |
| CERT-002 | Form type detail | ID tồn tại | GET `/api/certifications/form-types/{id}` | Trả chi tiết form type | P1 |
| CERT-003 | Form type create blocked | Yêu cầu hiện tại không cần thêm loại | POST form-types nếu route còn mở | Route bị 403 hoặc chỉ ADMIN dùng được theo policy | P1 |
| CERT-004 | Form type inactive | Form type inactive | Student tạo đơn | Trả 400, không tạo đơn | P0 |
| CERT-005 | Create NVQS | STUDENT_01, FORM_NVQS | POST `/api/certifications/requests` | Tạo đơn PENDING, metadata đúng, tự lấy thông tin student | P0 |
| CERT-006 | Create VAY_VON | STUDENT_01 | POST request có đủ trường năm/học kỳ/lý do | Tạo đơn PENDING, không báo thiếu reason sai | P0 |
| CERT-007 | Create KHAC | STUDENT_01 | POST request reason hợp lệ | Tạo đơn PENDING | P0 |
| CERT-008 | Create validate reason | Form yêu cầu reason nhưng rỗng | POST request | Trả 400 với thông báo thân thiện | P0 |
| CERT-009 | Create validate phone | contactPhone sai định dạng | POST request | Trả 400 | P1 |
| CERT-010 | Create proof optional | Tạo đơn chưa cần minh chứng | POST request không file | Thành công nếu form cho phép | P1 |
| CERT-011 | My requests | STUDENT_01 có nhiều đơn | GET `/api/certifications/requests/my-requests` | Chỉ trả đơn của STUDENT_01, phân trang đúng | P0 |
| CERT-012 | My detail owned | STUDENT_01 | GET `/my-requests/{id}` của chính mình | Trả chi tiết đơn | P0 |
| CERT-013 | My detail other student | STUDENT_01 xem đơn STUDENT_02 | GET my detail | Trả 403/404 | P0 |
| CERT-014 | Cancel pending | Đơn PENDING của STUDENT_01 | PUT `/my-requests/{id}/cancel` | Chuyển CANCELLED | P0 |
| CERT-015 | Cancel completed | Đơn COMPLETED | PUT cancel | Trả 400, không đổi trạng thái | P0 |
| CERT-016 | Upload proof needs info | Đơn NEEDS_INFO | PUT `/my-requests/{id}/proof` với file hợp lệ | Lưu file, cập nhật proofFileUrl, admin xem được | P0 |
| CERT-017 | Upload proof wrong status | Đơn PENDING/COMPLETED | PUT proof | Trả 400, không lưu file | P0 |
| CERT-018 | File upload image/pdf | File hợp lệ | POST `/api/certifications/files/upload` | Lưu vào thư mục theo năm học, trả URL | P0 |
| CERT-019 | File upload creates folder | Folder năm học chưa tồn tại | Upload file | Tự tạo folder | P0 |
| CERT-020 | File invalid type | File nguy hiểm | Upload | Trả 415/400 | P0 |
| CERT-021 | File path traversal | fileName chứa `../` | GET file | Trả 400/404, không đọc ngoài thư mục upload | P0 |
| CERT-022 | Admin list | ADMIN | GET `/api/certifications/requests?page=0&size=10` | Trả tất cả đơn phân trang | P0 |
| CERT-023 | Admin list filter | Có nhiều status/type/date | GET list với filter | Trả đúng filter | P1 |
| CERT-024 | Admin detail | ADMIN | GET `/api/certifications/requests/{id}` | Trả chi tiết, metadata, link proof | P0 |
| CERT-025 | Admin status PROCESSING | Đơn PENDING | PUT `/{id}/status` PROCESSING | Trạng thái đổi PROCESSING | P0 |
| CERT-026 | Admin status NEEDS_INFO | Đơn đang xử lý | PUT status NEEDS_INFO kèm note | Sinh viên thấy cần bổ sung minh chứng | P0 |
| CERT-027 | Admin status COMPLETED | Có ngày hẹn trả | PUT status COMPLETED | Lưu appointmentDate/adminNote | P0 |
| CERT-028 | Admin status invalid transition | CANCELLED sang COMPLETED nếu không cho phép | PUT status | Trả 400 | P1 |
| CERT-029 | Bulk status | Chọn nhiều đơn | PUT `/api/certifications/requests/bulk/status` | Cập nhật trạng thái, note, ngày hẹn hàng loạt | P0 |
| CERT-030 | Bulk status empty | requestIds rỗng | PUT bulk/status | Trả 400 | P0 |
| CERT-031 | Bulk print | Chọn nhiều đơn completed/processing | Gọi luồng in FE/API nếu có | Sinh PDF/print đúng mẫu từng loại đơn | P1 |
| CERT-032 | NVQS blocked fields | STUDENT nhập vào phần xác nhận của trường | Submit form | Các field xác nhận trường bị readonly, dữ liệu student không ghi đè | P0 |
## 8. Activity Service

| ID | Nhóm | Điều kiện | Bước kiểm thử | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| ACT-001 | List | ADMIN/STUDENT | GET `/api/activities?page=0&size=10` | Trả danh sách phân trang, filter nếu có | P0 |
| ACT-002 | Detail | Activity tồn tại | GET `/api/activities/{id}` | Trả activity, checkers, registrations/statistics nếu service trả | P0 |
| ACT-003 | Detail not found | ID không tồn tại | GET detail | Trả 404 | P0 |
| ACT-004 | Create limited | ADMIN | POST activity participationType LIMITED, capacity, googleFormUrl | Lưu capacity/form, status phù hợp theo thời gian | P0 |
| ACT-005 | Create open | ADMIN | POST activity participationType OPEN có nhập capacity/form | Service bỏ capacity/form hoặc không yêu cầu, lưu OPEN | P0 |
| ACT-006 | Create validate title | title rỗng | POST activity | Trả 400 | P0 |
| ACT-007 | Create validate time | endTime nhỏ hơn startTime | POST activity | Trả 400 | P0 |
| ACT-008 | Create validate capacity | LIMITED capacity <= 0 | POST activity | Trả 400 | P0 |
| ACT-009 | Create validate form | LIMITED thiếu googleFormUrl nếu nghiệp vụ bắt buộc | POST activity | Trả 400 hoặc lưu nếu optional theo contract | P1 |
| ACT-010 | Update limited to open | Activity LIMITED có registrations | PUT đổi OPEN | Xóa/ẩn registration requirement, checkin tự do vẫn hoạt động | P1 |
| ACT-011 | Update open to limited | Activity OPEN | PUT đổi LIMITED cần capacity/form | Validate đủ dữ liệu trước khi lưu | P1 |
| ACT-012 | Patch status | ADMIN | PATCH `/{id}/status` UPCOMING/ONGOING/COMPLETED | Cập nhật trạng thái | P0 |
| ACT-013 | Delete | Activity chưa có dữ liệu phụ thuộc | DELETE `/{id}` | Xóa thành công | P1 |
| ACT-014 | Delete with registrations | Activity có checkin/registrations | DELETE | Không mất dữ liệu bất ngờ; xóa cascade hoặc từ chối theo thiết kế | P1 |
| ACT-015 | Import registrations limited | Activity LIMITED, file hợp lệ | POST `/{id}/registrations/import` | Import danh sách tham gia, bỏ trùng, trả thống kê | P0 |
| ACT-016 | Import registrations open | Activity OPEN | POST import | Trả 400 vì hoạt động tự do không cần danh sách đăng ký | P0 |
| ACT-017 | Import invalid student | File có MSSV không tồn tại user-service | Import | Dòng lỗi, không thêm sinh viên đó | P0 |
| ACT-018 | Import capacity exceed | File vượt capacity | Import | Trả lỗi hoặc chỉ import tối đa theo contract, không vượt capacity | P0 |
| ACT-019 | Get registrations | Activity LIMITED | GET `/{id}/registrations` | Trả danh sách, trạng thái điểm danh, thời gian điểm danh | P0 |
| ACT-020 | Add registration manual | Activity LIMITED, sinh viên tồn tại | POST `/{id}/registrations` | Thêm sinh viên vào danh sách | P0 |
| ACT-021 | Add registration duplicate | Sinh viên đã có trong activity | POST registrations | Không tạo trùng, trả 409/400 | P0 |
| ACT-022 | Add registration invalid student | MSSV/name không tồn tại hoặc không khớp user-service | POST registrations | Trả 400/404, không thêm | P0 |
| ACT-023 | Remove registration | Registration tồn tại | DELETE `/{activityId}/registrations/{registrationId}` | Gỡ sinh viên khỏi danh sách | P0 |
| ACT-024 | Remove checked registration | Sinh viên đã điểm danh | DELETE registration | Theo policy: từ chối hoặc gỡ kèm audit rõ ràng | P1 |
| ACT-025 | Add checker | Sinh viên tồn tại | POST `/{id}/checkers` | Cấp quyền quét mã cho sinh viên | P0 |
| ACT-026 | Add checker invalid | MSSV/name không tồn tại hoặc không khớp | POST checkers | Trả 400/404 | P0 |
| ACT-027 | Get checker me | STUDENT checker có activity chưa kết thúc | GET `/api/activities/checker/me` | Trả các activity được phân quyền, chưa hết hạn | P0 |
| ACT-028 | Get checker me none | STUDENT không có quyền hoặc activity đã kết thúc | GET checker/me | Trả danh sách rỗng, không popup lỗi | P0 |
| ACT-029 | Remove checker | Checker tồn tại | DELETE `/{activityId}/checkers/{checkerId}` | Gỡ quyền quét mã | P0 |
| ACT-030 | Checkin limited valid | Checker hợp lệ, activity ONGOING, student nằm trong registrations | POST `/{id}/checkin` | Đánh dấu checkedInAt, không tạo trùng | P0 |
| ACT-031 | Checkin limited not registered | Student không trong registrations | POST checkin | Trả 403/400, không điểm danh | P0 |
| ACT-032 | Checkin open valid | Activity OPEN, student tồn tại user-service | POST checkin | Tự tạo registration nếu chưa có và đánh dấu điểm danh | P0 |
| ACT-033 | Checkin duplicate | Student đã điểm danh | POST checkin lần 2 | Idempotent hoặc trả thông báo đã điểm danh, không tăng số lượng | P0 |
| ACT-034 | Checkin unauthorized checker | Người quét không được phân quyền | POST checkin | Trả 403 | P0 |
| ACT-035 | Checkin outside time | Activity UPCOMING/COMPLETED | POST checkin | Trả 400/403 | P0 |
| ACT-036 | QR payload invalid | QR thiếu MSSV hoặc sai format | POST checkin | Trả 400, thông báo rõ | P0 |

## 9. Exam Service

| ID | Nhóm | Điều kiện | Bước kiểm thử | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| EXAM-001 | Admin list | ADMIN | GET `/api/exams?page=0&size=10` | Trả danh sách kỳ thi phân trang | P0 |
| EXAM-002 | Admin list filter | Có ACTIVE/INACTIVE, keyword | GET list filter | Trả đúng filter | P1 |
| EXAM-003 | Detail | Exam tồn tại | GET `/api/exams/{id}` | Trả cấu hình, câu hỏi count, targets đầy đủ classes/students | P0 |
| EXAM-004 | Detail targets load | Exam có nhiều target windows | GET detail | Load đúng từng khung giờ, studentGroupCode, faculty, classes, students, targetMode | P0 |
| EXAM-005 | Create basic | ADMIN | POST `/api/exams` title, description, duration, questionCount, status | Tạo exam | P0 |
| EXAM-006 | Create validate title | Title rỗng | POST exam | Trả 400 | P0 |
| EXAM-007 | Create validate duration | durationMins <= 0 | POST exam | Trả 400 | P0 |
| EXAM-008 | Create validate question count | questionCount <= 0 | POST exam | Trả 400 | P0 |
| EXAM-009 | Create target class | TargetMode CLASS, group, faculty, classes, time | POST exam | Lưu normalized target, bảng class liên kết đúng | P0 |
| EXAM-010 | Create target student | TargetMode STUDENT, students, time | POST exam | Lưu target students đúng, không cần classes | P0 |
| EXAM-011 | Create target both | TargetMode BOTH, classes và students | POST exam | Lưu cả class list và student list | P0 |
| EXAM-012 | Create target time invalid | target endTime nhỏ hơn startTime | POST exam | Trả 400 | P0 |
| EXAM-013 | Create target duplicate class same exam | Cùng class đã có ở khung giờ khác cùng exam | POST/PUT | Trả 400 hoặc xử lý theo policy, không cho trùng nếu yêu cầu hiện tại | P0 |
| EXAM-014 | Create target duplicate student same exam | Cùng student đã chọn ở khung giờ khác cùng exam | POST/PUT | Trả 400 hoặc bỏ trùng theo policy | P0 |
| EXAM-015 | Update config | Exam tồn tại | PUT `/api/exams/{id}` đổi cấu hình | Cập nhật đúng, giữ câu hỏi/attempt nếu không ảnh hưởng | P0 |
| EXAM-016 | Update targets add | Thêm target window mới | PUT exam | Lưu target mới, reload thấy target mới | P0 |
| EXAM-017 | Update targets remove class | Bỏ một lớp khỏi target và lưu | PUT exam rồi GET detail/my | Lớp bị bỏ không còn trong DB và sinh viên lớp đó không thấy kỳ thi | P0 |
| EXAM-018 | Update targets remove student | Bỏ student cụ thể khỏi target | PUT exam rồi GET detail/my | Student bị bỏ không còn thấy kỳ thi nếu không nằm target khác | P0 |
| EXAM-019 | Update targets replace all | Thay toàn bộ target windows | PUT exam | Orphan target/classes/students cũ bị xóa, DB không còn dữ liệu cũ | P0 |
| EXAM-020 | Patch status | ADMIN | PATCH `/{id}/status` ACTIVE/INACTIVE | Cập nhật trạng thái | P0 |
| EXAM-021 | Delete inactive | Exam INACTIVE chưa có attempt | DELETE `/{id}` | Xóa thành công | P1 |
| EXAM-022 | Delete with attempts | Exam có attempt | DELETE | Không mất kết quả bất ngờ; từ chối hoặc soft delete theo policy | P1 |
| EXAM-023 | Get questions | Exam có câu hỏi | GET `/{id}/questions` | Trả câu hỏi kèm options, đáp án đúng chỉ admin thấy | P0 |
| EXAM-024 | Add question | Payload câu hỏi + 4 options + 1 đúng | POST `/{id}/questions` | Thêm câu hỏi, options đúng thứ tự | P0 |
| EXAM-025 | Question validate options | Không đủ options hoặc không có đáp án đúng | POST question | Trả 400 | P0 |
| EXAM-026 | Update question | Câu hỏi tồn tại | PUT `/{examId}/questions/{questionId}` | Cập nhật content/options/isCorrect | P0 |
| EXAM-027 | Delete question | Câu hỏi tồn tại | DELETE question | Xóa question và options, question count cập nhật | P0 |
| EXAM-028 | Import questions | Excel hợp lệ | POST `/{id}/questions/import` | Import đủ câu hỏi/options/correct answer | P0 |
| EXAM-029 | Import questions invalid answer | Đáp án đúng không thuộc A-D | Import | Dòng lỗi hoặc file bị từ chối rõ | P0 |
| EXAM-030 | Import question duplicate | File có câu hỏi trùng | Import | Theo policy: bỏ trùng hoặc cho phép nhưng không gây lỗi DB | P2 |
| EXAM-031 | Admin attempts list | Có attempt | GET `/api/exams/attempts` | Trả danh sách lượt nộp, phân trang/filter | P1 |
| EXAM-032 | Admin exam attempts | Exam có attempt | GET `/{id}/attempts` | Trả kết quả sinh viên của kỳ thi đó | P1 |
| EXAM-033 | Student my eligible class | STUDENT_01 thuộc class target, thời gian chưa đến | GET `/api/exams/my` | Thấy kỳ thi với trạng thái sắp mở hoặc chưa thể làm | P0 |
| EXAM-034 | Student my eligible student | STUDENT_01 được chọn trực tiếp | GET my | Thấy kỳ thi dù không thuộc lớp target | P0 |
| EXAM-035 | Student my not eligible | STUDENT không thuộc bất kỳ target | GET my | Không thấy kỳ thi | P0 |
| EXAM-036 | Student my inactive | Exam INACTIVE | GET my | Không trả kỳ thi | P0 |
| EXAM-037 | Start valid | Exam ACTIVE, đúng target, trong target time, đủ câu hỏi | POST `/{id}/start` | Tạo attempt STARTED, trả câu hỏi đã bốc, không lộ đáp án đúng | P0 |
| EXAM-038 | Start before time | Chưa đến giờ của target | POST start | Trả 400/403, không tạo attempt | P0 |
| EXAM-039 | Start after time | Đã quá giờ đóng target | POST start | Trả 400/403 | P0 |
| EXAM-040 | Start not enough questions | questionCount lớn hơn câu hỏi khả dụng | POST start | Trả 400, không tạo attempt | P0 |
| EXAM-041 | Start duplicate | Attempt đang STARTED | POST start lần 2 | Trả attempt hiện tại hoặc từ chối theo policy, không bốc đề mới | P0 |
| EXAM-042 | State | Attempt STARTED | GET `/{id}/state` | Trả câu hỏi đã bốc, answers đã lưu, thời gian còn lại | P0 |
| EXAM-043 | Save answer | Question thuộc attempt | PUT `/{id}/answers` | Lưu hoặc cập nhật câu trả lời | P0 |
| EXAM-044 | Save answer invalid question | Question không thuộc attempt | PUT answers | Trả 400/403 | P0 |
| EXAM-045 | Violation | Attempt STARTED | POST `/{id}/violations` | Tăng violationCount, lưu lý do nếu có | P0 |
| EXAM-046 | Submit valid | Đã trả lời đủ câu | POST `/{id}/submit` | Chấm điểm, status SUBMITTED, submittedAt, correctCount/score đúng | P0 |
| EXAM-047 | Submit unanswered | Còn câu chưa trả lời | POST submit | Trả 400, thông báo cần làm đủ câu hỏi | P0 |
| EXAM-048 | Submit timeout | Quá thời lượng hoặc quá endTime | POST submit | Theo policy: auto submit hoặc từ chối rõ; không ghi sai điểm | P0 |
| EXAM-049 | Submit duplicate | Attempt đã SUBMITTED | POST submit lần 2 | Không chấm lại, trả kết quả cũ hoặc 400 | P0 |
| EXAM-050 | Result owned | STUDENT_01 đã nộp | GET `/{id}/result` | Trả điểm của chính sinh viên | P0 |
| EXAM-051 | Result not submitted | Attempt chưa nộp | GET result | Trả 400/404 | P1 |
| EXAM-052 | Result unauthorized | STUDENT xem kết quả người khác | GET result | Không thể xem | P0 |
| EXAM-053 | BCNF schema | DB có exam_targets/classes/students | Sau create/update targets | Không còn lưu CSV student_ids/student_names; mỗi class/student là một dòng quan hệ chuẩn | P0 |
## 10. Luồng tích hợp liên service

| ID | Luồng | Điều kiện | Bước kiểm thử | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| INT-001 | User import -> Auth -> Mail | File 5.000 sinh viên | Import bằng user-service | User profile được tạo, auth account được tạo/bỏ qua đúng, mail được queue/gửi đủ | P0 |
| INT-002 | User create manual -> Auth | ADMIN tạo 1 sinh viên | POST `/api/users` | Auth-service tạo account và gửi mail tài khoản ban đầu | P0 |
| INT-003 | User status -> Auth lock | ADMIN chuyển sinh viên SUSPENDED | Bulk status | Tài khoản bị khóa, sinh viên nhận email khóa tài khoản | P0 |
| INT-004 | Notification target class -> User profile | STUDENT đổi lớp | Tạo notification CLASS lớp cũ, sau đó đổi lớp sinh viên | Sinh viên chỉ nhận notification đúng lớp hiện tại theo contract | P1 |
| INT-005 | Activity registration -> User profile | Thêm sinh viên vào hoạt động | POST registration/checker | Activity-service xác minh MSSV và họ tên từ user-service trước khi thêm | P0 |
| INT-006 | Activity checkin open -> User profile | QR MSSV tồn tại | POST checkin OPEN | Tự tạo registration và điểm danh; MSSV không tồn tại bị từ chối | P0 |
| INT-007 | Exam eligibility -> User profile | Kỳ thi target class/group/faculty | Student GET `/api/exams/my` | Chỉ student đúng lớp/khoa/nhóm hoặc được chọn trực tiếp thấy kỳ thi | P0 |
| INT-008 | Certification create -> User profile | STUDENT tạo đơn | POST request | Certification lấy đúng thông tin sinh viên/lớp/khoa để render đơn | P0 |
| INT-009 | Gateway token expired -> Frontend refresh | Access expired, refresh valid | FE gọi API protected | FE gọi refresh, gán accessToken mới, request retry thành công | P0 |
| INT-010 | Gateway refresh expired -> Logout | Access expired, refresh expired | FE gọi API protected | FE logout, xóa session/cookie, điều hướng login | P0 |
| INT-011 | Notification upload -> FE render | TinyMCE upload ảnh | Tạo thông báo rồi student xem | Ảnh hiển thị từ `/notification/{year}/...`, content không lỗi font | P0 |
| INT-012 | Certification proof -> Admin view | Student bổ sung minh chứng | Admin mở chi tiết đơn | Link minh chứng mở được, đúng file, không path traversal | P0 |
| INT-013 | Exam target update -> Student visibility | Admin bỏ lớp khỏi kỳ thi | Student lớp đó refresh `/api/exams/my` | Kỳ thi biến mất ngay hoặc sau cache TTL hợp lý | P0 |
| INT-014 | Activity checker visibility -> Student UI | Checker hết quyền hoặc activity kết thúc | Student refresh dashboard | Sidebar/dashboard ẩn nút quét, không hiện popup lỗi | P0 |
| INT-015 | Bulk mail resilience | Provider mail lỗi 1 phần | Import lớn | Dữ liệu chính vẫn nhất quán; mail failed có retry/log/trạng thái | P1 |

## 11. Test bảo mật và phân quyền chung

| ID | Nhóm | Điều kiện | Bước kiểm thử | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| SEC-001 | Không token | ANON | Gọi tất cả endpoint ngoài login/forgot/reset/public file nếu có | Protected endpoints trả 401 | P0 |
| SEC-002 | Sai role | STUDENT | Gọi endpoint tạo/sửa/xóa admin của user, notification, exam, activity, certification | Trả 403 | P0 |
| SEC-003 | Cross-student access | STUDENT_01 | Gọi endpoint dữ liệu riêng STUDENT_02 | Trả 403/404 | P0 |
| SEC-004 | SQL injection keyword | Keyword chứa `' OR 1=1 --` | Gọi list/search tất cả service | Không lỗi DB, không trả dữ liệu ngoài filter | P0 |
| SEC-005 | XSS content | Nội dung có `<script>` | Tạo notification/cert note nếu có HTML | Nội dung được sanitize hoặc render an toàn | P0 |
| SEC-006 | Path traversal upload/download | File name `../../secret` | Upload/download file chứng minh/notification | Không đọc/ghi ngoài thư mục public/upload | P0 |
| SEC-007 | Multipart abuse | Upload file giả MIME | Upload image/pdf | Validate magic bytes hoặc content type đủ an toàn theo policy | P1 |
| SEC-008 | Rate limit forgot password | Gọi liên tục forgot-password | 3+ lần/tháng/user | Bị giới hạn, không spam mail | P0 |
| SEC-009 | Token storage | Frontend sau login | Kiểm tra storage | Refresh token ưu tiên HttpOnly cookie; nếu chưa có thì ghi nhận debt bảo mật | P1 |
| SEC-010 | Sensitive logs | Chạy test lỗi login/import/mail | Kiểm tra log | Không lộ password/token/mail reset link đầy đủ | P1 |

## 12. Test hiệu năng và độ ổn định

| ID | Nhóm | Điều kiện | Bước kiểm thử | Kết quả mong đợi | Ưu tiên |
| --- | --- | --- | --- | --- | --- |
| PERF-001 | User import 5k | File Excel 5.000 dòng hợp lệ | Chạy import job | API tạo job dưới 3 giây, job hoàn tất không timeout, progress cập nhật đều | P0 |
| PERF-002 | User import 10k | File 10.000 dòng | Chạy import job | Không crash, không duplicate, không mất dòng, mail queue xử lý dần | P0 |
| PERF-003 | Bulk mail throughput | 10.000 email | Theo dõi queue/send | Có batch/concurrency/retry, không vượt rate limit provider | P1 |
| PERF-004 | List pagination | 10.000 sinh viên | GET page size 100 | Response trong ngưỡng chấp nhận, query dùng index | P1 |
| PERF-005 | Notification my | 5.000 notifications mixed target | STUDENT GET my | Response đúng và nhanh nhờ filter/index | P1 |
| PERF-006 | Exam start concurrency | 100 sinh viên start cùng lúc | POST start đồng thời | Không trùng attempt bất thường, câu hỏi bốc đủ, không deadlock | P0 |
| PERF-007 | Exam submit concurrency | Nhiều submit cùng lúc | POST submit | Mỗi attempt chấm đúng một lần | P0 |
| PERF-008 | Activity checkin concurrency | 10 checker quét cùng MSSV | POST checkin đồng thời | Chỉ một registration/checkin hợp lệ, không tăng đếm trùng | P0 |
| PERF-009 | Certification bulk update | 1.000 đơn | PUT bulk/status | Cập nhật đủ, không timeout dài | P1 |
| PERF-010 | Gateway resilience | Một service restart | Gọi route liên tục | Gateway phục hồi sau khi service register lại | P1 |

## 13. Checklist automation đề xuất

| Lớp test | Công cụ đề xuất | Nên áp dụng cho |
| --- | --- | --- |
| Unit test | JUnit 5, Mockito | Service logic, validate nghiệp vụ, mapper, token/mail helper |
| Controller slice | Spring MockMvc/WebTestClient | Status code, request validation, auth header mapping |
| Integration test | Testcontainers PostgreSQL/Redis, SpringBootTest | Repository, transaction, cascade/orphanRemoval, import job |
| Contract/API | Postman Collection + Newman | Toàn bộ endpoint public/protected/internal |
| E2E frontend | Playwright | Login/refresh/logout, dashboard, CRUD admin, student exam/activity/certification |
| File/import | Apache POI + Multipart Mock | Excel import/template, upload/download proof/notification image |
| Performance smoke | k6/JMeter | Import 5k-10k, exam concurrency, checkin concurrency |

## 14. Definition of Done cho bộ test

- Mỗi service có test P0 pass ở unit hoặc integration level.
- Mỗi endpoint có ít nhất 1 test thành công, 1 test validate lỗi và 1 test phân quyền nếu là protected endpoint.
- Các luồng import/upload có test file hợp lệ, sai định dạng, quá lớn và path traversal.
- Các luồng dùng HTML/TinyMCE có test tiếng Việt có dấu, ảnh, link và XSS.
- Các luồng liên service có test khi service ngoài trả lỗi 404, 400, timeout và unavailable.
- Các thay đổi DB như exam targets phải có integration test chứng minh lưu dạng quan hệ chuẩn, reload lại vẫn đúng dữ liệu.
- Frontend regression tối thiểu phải đi qua login, refresh token, admin CRUD chính, student dashboard, student notification, exam start/submit, activity checkin và certification request.