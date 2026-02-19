package com.company.inventory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties  // IMPORTANT: Enable this
public class InventoryManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(InventoryManagementApplication.class, args);
        System.out.println("===========================================");
        System.out.println("Inventory Management System Started!");
        System.out.println("Swagger UI: http://localhost:8080/swagger-ui.html");
        System.out.println("===========================================");
    }
}