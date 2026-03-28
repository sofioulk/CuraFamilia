package com.curafamilia.auth.exception;

import com.curafamilia.auth.dto.MessageResponse;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

@Provider
public class ApiExceptionMapper implements ExceptionMapper<ApiException> {
    @Override
    public Response toResponse(ApiException exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            message = "Requete invalide.";
        }
        return Response.status(exception.getStatus())
                .type(MediaType.APPLICATION_JSON)
                .entity(new MessageResponse(message))
                .build();
    }
}
