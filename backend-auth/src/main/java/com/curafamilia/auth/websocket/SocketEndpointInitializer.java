package com.curafamilia.auth.websocket;

import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.websocket.DeploymentException;
import jakarta.websocket.server.ServerContainer;

public class SocketEndpointInitializer implements ServletContextListener {
    @Override
    public void contextInitialized(ServletContextEvent sce) {
        ServletContext context = sce.getServletContext();
        Object attribute = context.getAttribute(ServerContainer.class.getName());
        if (!(attribute instanceof ServerContainer serverContainer)) {
            throw new IllegalStateException("WebSocket ServerContainer not available.");
        }

        try {
            serverContainer.addEndpoint(FamilyEventsSocketEndpoint.class);
        } catch (DeploymentException exception) {
            throw new IllegalStateException("Failed to register WebSocket endpoint.", exception);
        }
    }
}
