package com.authservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.ThreadPoolExecutor;

@Configuration
public class MailAsyncConfig {

    @Bean(name = "accountEmailTaskExecutor")
    public ThreadPoolTaskExecutor accountEmailTaskExecutor(
            @Value("${app.mail.worker-count:1}") int workerCount,
            @Value("${app.mail.queue-capacity:20000}") int queueCapacity
    ) {
        int safeWorkerCount = Math.max(1, workerCount);

        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(safeWorkerCount);
        executor.setMaxPoolSize(safeWorkerCount);
        executor.setQueueCapacity(Math.max(1000, queueCapacity));
        executor.setThreadNamePrefix("account-mail-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        return executor;
    }
}
