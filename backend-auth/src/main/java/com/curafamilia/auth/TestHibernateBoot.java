package com.curafamilia.auth;

import com.curafamilia.auth.config.JpaUtil;

public class TestHibernateBoot {
    public static void main(String[] args) {
        try {
            System.out.println("Starting Hibernate Boot Test...");
            JpaUtil.createEntityManager();
            System.out.println("Success! Hibernate booted correctly.");
            System.exit(0);
        } catch (Throwable t) {
            System.err.println("HIBERNATE CRASHED! FULL STACK TRACE:");
            t.printStackTrace(System.err);
            
            Throwable cause = t.getCause();
            while (cause != null) {
                System.err.println("--- CAUSED BY ---");
                cause.printStackTrace(System.err);
                cause = cause.getCause();
            }
            System.exit(1);
        }
    }
}
