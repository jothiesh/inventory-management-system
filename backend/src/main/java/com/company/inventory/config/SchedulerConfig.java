package com.company.inventory.config;

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
public class SchedulerConfig {

    /**
     * Configure task scheduler with thread pool
     * @return Configured TaskScheduler
     */
    @Bean
    public TaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        
        // Set pool size (number of concurrent scheduled tasks)
        scheduler.setPoolSize(5);
        
        // Set thread name prefix for easy identification in logs
        scheduler.setThreadNamePrefix("inventory-scheduler-");
        
        // Wait for tasks to complete on shutdown
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        
        // Timeout for waiting (in seconds)
        scheduler.setAwaitTerminationSeconds(60);
        
        // Initialize the scheduler
        scheduler.initialize();
        
        return scheduler;
    }
}