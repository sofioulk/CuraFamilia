package com.curafamilia.auth.exception;

import com.curafamilia.auth.dto.MessageResponse;
import jakarta.json.bind.JsonbException;
import jakarta.json.stream.JsonParsingException;
import jakarta.ws.rs.ProcessingException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

@Provider
public class GenericExceptionMapper implements ExceptionMapper<Exception> {
    @Override
    public Response toResponse(Exception exception) {
        if (isJsonDeserializationFailure(exception)) {
            return buildJsonResponse(
                    Response.Status.BAD_REQUEST,
                    resolveJsonErrorMessage(exception)
            );
        }

        if (exception instanceof WebApplicationException webApplicationException) {
            Response webResponse = webApplicationException.getResponse();
            Response.StatusType status = webResponse != null ? webResponse.getStatusInfo() : Response.Status.INTERNAL_SERVER_ERROR;
            String message = webApplicationException.getMessage();
            if (message == null || message.isBlank()) {
                message = status.getReasonPhrase();
            }
            return buildJsonResponse(status, message);
        }

        exception.printStackTrace();
        String message = exception.getMessage();
        Throwable cause = exception.getCause();
        if ((message == null || message.isBlank()) && cause != null) {
            message = cause.getMessage();
        }
        if (message == null || message.isBlank()) {
            message = "Une erreur serveur est survenue.";
        }
        return buildJsonResponse(Response.Status.INTERNAL_SERVER_ERROR, message);
    }

    private Response buildJsonResponse(Response.StatusType status, String message) {
        return Response.status(status)
                .type(MediaType.APPLICATION_JSON)
                .entity(new MessageResponse(message))
                .build();
    }

    private boolean isJsonDeserializationFailure(Throwable exception) {
        return findCause(exception, JsonParsingException.class) != null
                || findCause(exception, JsonbException.class) != null
                || hasEntityDeserializationProcessingFailure(exception);
    }

    private boolean hasEntityDeserializationProcessingFailure(Throwable exception) {
        ProcessingException processingException = findCause(exception, ProcessingException.class);
        if (processingException == null) {
            return false;
        }

        String message = processingException.getMessage();
        return message != null && message.toLowerCase().contains("deserializing object from entity stream");
    }

    private String resolveJsonErrorMessage(Throwable exception) {
        IllegalArgumentException illegalArgumentException = findCause(exception, IllegalArgumentException.class);
        if (illegalArgumentException != null
                && illegalArgumentException.getMessage() != null
                && !illegalArgumentException.getMessage().isBlank()) {
            return illegalArgumentException.getMessage();
        }
        return "Le corps JSON est invalide ou ne correspond pas au format attendu.";
    }

    private <T extends Throwable> T findCause(Throwable exception, Class<T> expectedType) {
        Throwable current = exception;
        while (current != null) {
            if (expectedType.isInstance(current)) {
                return expectedType.cast(current);
            }
            current = current.getCause();
        }
        return null;
    }
}
