package com.authservice.service;

import jakarta.mail.internet.InternetAddress;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;

@Slf4j
@Service
@RequiredArgsConstructor
public class AccountEmailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${app.mail.from:no-reply@stu.edu.vn}")
    private String fromAddress;

    @Value("${app.mail.from-name:Cong sinh vien STU}")
    private String fromName;

    @Value("${app.mail.send-delay-ms:1000}")
    private long sendDelayMs;

    @Value("${app.mail.max-retries:2}")
    private int maxRetries;

    @Value("${app.mail.retry-delay-ms:5000}")
    private long retryDelayMs;

    @Async("accountEmailTaskExecutor")
    public void sendInitialPasswordEmail(String email, String username, String rawPassword) {
        sendPlainTextEmail(
                email,
                username,
                "Thông báo tài khoản đăng nhập cổng CTSV STU",
                buildCredentialBody(
                        "Tài khoản của bạn đã được tạo trên hệ thống Quản lý Công tác Sinh viên STU.",
                        username,
                        rawPassword
                )
        );
    }

    @Async("accountEmailTaskExecutor")
    public void sendResetPasswordEmail(String email, String username, String rawPassword) {
        sendPlainTextEmail(
                email,
                username,
                "Cấp phát lại mật khẩu cổng CTSV STU",
                buildCredentialBody(
                        "Mật khẩu của bạn vừa được quản trị viên cấp phát lại.",
                        username,
                        rawPassword
                )
        );
    }

    @Async("accountEmailTaskExecutor")
    public void sendForgotPasswordEmail(String email, String username, String resetLink, long expiresMinutes) {
        String body = "Xin chào,\n\n"
                + "Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản " + username + ".\n"
                + "Vui lòng bấm vào liên kết bên dưới để tạo mật khẩu mới:\n\n"
                + resetLink + "\n\n"
                + "Liên kết này chỉ dùng được một lần và sẽ hết hạn sau " + expiresMinutes + " phút.\n"
                + "Mỗi tài khoản chỉ được yêu cầu quên mật khẩu tối đa 2 lần trong một tháng.\n"
                + "Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ Phòng Công tác Sinh viên.\n\n"
                + "Trân trọng,\n"
                + "Hệ thống Quản lý Công tác Sinh viên STU.";

        sendPlainTextEmail(email, username, "Yêu cầu đặt lại mật khẩu cổng CTSV STU", body);
    }

    @Async("accountEmailTaskExecutor")
    public void sendPasswordChangedEmail(String email, String username) {
        String body = "Xin chào,\n\n"
                + "Mật khẩu của tài khoản " + username + " vừa được thay đổi thành công trên hệ thống Quản lý Công tác Sinh viên STU.\n"
                + "Vì lý do bảo mật, hệ thống đã đăng xuất các phiên đăng nhập hiện tại. Vui lòng đăng nhập lại bằng mật khẩu mới.\n"
                + "Nếu bạn không thực hiện thay đổi này, hãy dùng chức năng quên mật khẩu ngay và liên hệ Phòng Công tác Sinh viên để được hỗ trợ.\n\n"
                + "Trân trọng,\n"
                + "Hệ thống Quản lý Công tác Sinh viên STU.";

        sendPlainTextEmail(email, username, "Thông báo thay đổi mật khẩu cổng CTSV STU", body);
    }

    @Async("accountEmailTaskExecutor")
    public void sendAccountLockedEmail(String email, String username) {
        String body = "Xin chào,\n\n"
                + "Tài khoản " + username + " của bạn đã được quản trị viên khóa trên hệ thống Quản lý Công tác Sinh viên STU.\n"
                + "Trong thời gian tài khoản bị khóa, bạn sẽ không thể đăng nhập hoặc sử dụng các chức năng trong hệ thống.\n"
                + "Nếu bạn cần hỗ trợ, vui lòng liên hệ Phòng Công tác Sinh viên để được kiểm tra.\n\n"
                + "Trân trọng,\n"
                + "Hệ thống Quản lý Công tác Sinh viên STU.";

        sendPlainTextEmail(email, username, "Thông báo khóa tài khoản cổng CTSV STU", body);
    }

    @Async("accountEmailTaskExecutor")
    public void sendAccountUnlockedEmail(String email, String username) {
        String body = "Xin chào,\n\n"
                + "Tài khoản " + username + " của bạn đã được quản trị viên mở khóa.\n"
                + "Bạn có thể đăng nhập lại vào hệ thống Quản lý Công tác Sinh viên STU bằng tài khoản hiện tại.\n"
                + "Nếu bạn vẫn không đăng nhập được, vui lòng sử dụng chức năng quên mật khẩu hoặc liên hệ Phòng Công tác Sinh viên.\n\n"
                + "Trân trọng,\n"
                + "Hệ thống Quản lý Công tác Sinh viên STU.";

        sendPlainTextEmail(email, username, "Thông báo mở khóa tài khoản cổng CTSV STU", body);
    }

    private void sendPlainTextEmail(String email, String username, String subject, String body) {
        if (!StringUtils.hasText(email)) {
            log.warn("Skip account email for {} because recipient email is empty.", username);
            return;
        }

        if (!mailEnabled) {
            log.info("Mail sending is disabled. Skip account email for {} to {}.", username, email);
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Skip account email for {} because JavaMailSender is not configured.", username);
            return;
        }

        int attempts = Math.max(1, maxRetries + 1);
        for (int attempt = 1; attempt <= attempts; attempt++) {
            try {
                waitBeforeSend();
                var message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
                if (StringUtils.hasText(fromName)) {
                    helper.setFrom(new InternetAddress(fromAddress, fromName, StandardCharsets.UTF_8.name()));
                } else {
                    helper.setFrom(fromAddress);
                }
                helper.setTo(email.trim());
                helper.setSubject(subject);
                helper.setText(body, false);
                mailSender.send(message);
                log.info("Account email sent for {} to {}.", username, email);
                return;
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                log.warn("Account email sending interrupted for {} to {}.", username, email);
                return;
            } catch (Exception ex) {
                if (attempt >= attempts) {
                    log.error("Could not send account email for {} to {} after {} attempt(s).", username, email, attempts, ex);
                    return;
                }

                log.warn("Could not send account email for {} to {} on attempt {}/{}. Retrying.",
                        username, email, attempt, attempts, ex);
                waitBeforeRetry(username, email);
            }
        }
    }

    private void waitBeforeSend() throws InterruptedException {
        if (sendDelayMs > 0) {
            Thread.sleep(sendDelayMs);
        }
    }

    private void waitBeforeRetry(String username, String email) {
        if (retryDelayMs <= 0) {
            return;
        }

        try {
            Thread.sleep(retryDelayMs);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.warn("Account email retry interrupted for {} to {}.", username, email);
        }
    }

    private String buildCredentialBody(String intro, String username, String rawPassword) {
        return intro + "\n\n"
                + "Thông tin đăng nhập của bạn:\n"
                + "- Tên đăng nhập: " + username + "\n"
                + "- Mật khẩu tạm thời: " + rawPassword + "\n\n"
                + "Vui lòng đăng nhập và đổi mật khẩu trong lần sử dụng đầu tiên.\n"
                + "Nếu bạn không yêu cầu tài khoản này, vui lòng liên hệ Phòng Công tác Sinh viên.\n\n"
                + "Trân trọng,\n"
                + "Hệ thống Quản lý Công tác Sinh viên STU.";
    }
}
