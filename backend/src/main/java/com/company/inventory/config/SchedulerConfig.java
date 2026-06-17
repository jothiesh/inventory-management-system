package com.company.inventory.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/**
 * Advanced Scheduler Configuration
 * 
 * Features:
 * - Thread pool for concurrent scheduled tasks
 * - Configurable pool size
 * - Named threads for easy debugging
 * - Graceful shutdown handling
 */
@Configuration
@EnableScheduling
@Slf4j
public class SchedulerConfig {

    /**
     * Configure task scheduler with thread pool
     * @return Configured TaskScheduler
     */
    @Bean
    public TaskScheduler taskScheduler() {
        log.info("Initializing ThreadPoolTaskScheduler thread pool orchestration configuration layer.");
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        
        // Set pool size (number of concurrent scheduled tasks)
        int poolSize = 5;
        log.debug("Configuring scheduler concurrent core pool dimensions boundary size: {}", poolSize);
        scheduler.setPoolSize(poolSize);
        
        // Set thread name prefix for easy identification in logs
        String threadPrefix = "inventory-scheduler-";
        log.debug("Configuring scheduler identity runtime naming convention prefix to: '{}'", threadPrefix);
        scheduler.setThreadNamePrefix(threadPrefix);
        
        // Wait for tasks to complete on shutdown
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        
        // Timeout for waiting (in seconds)
        int awaitTerminationSeconds = 60;
        scheduler.setAwaitTerminationSeconds(awaitTerminationSeconds);
        log.trace("Scheduler graceful lifecycle parameters applied. Termination ceiling timeout: {}s", awaitTerminationSeconds);
        
        // Initialize the scheduler
        scheduler.initialize();
        log.info("ThreadPoolTaskScheduler cluster initialized successfully and spawned inside container execution loops.");
        
        return scheduler;
    }
}