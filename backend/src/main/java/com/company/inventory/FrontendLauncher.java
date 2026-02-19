package com.company.inventory;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import java.io.File;
import java.io.IOException;

@Component
@Order(2)  // ✅ Run this AFTER DatabaseInitializer
public class FrontendLauncher implements CommandLineRunner {
    
    @Override
    public void run(String... args) throws Exception {
        System.out.println("========================================");
        System.out.println("🚀 LAUNCHING FRONTEND");
        System.out.println("========================================");
        
        String frontendPath = "D:\\root\\Thinture\\old laptop\\jothiesh\\store\\store_code\\inventory-management-system\\frontend";
        
        try {
            ProcessBuilder builder = new ProcessBuilder("cmd.exe", "/c", "start", "cmd", "/k", "npm run dev -- --port 3001");
            builder.directory(new File(frontendPath));
            builder.start();
            
            System.out.println("✅ Frontend launch command sent successfully.");
            System.out.println("📱 Frontend will open at: http://localhost:3001");
            
        } catch (IOException e) {
            System.err.println("❌ Failed to launch frontend automatically.");
            e.printStackTrace();
        }
        
        System.out.println("========================================");
    }
}