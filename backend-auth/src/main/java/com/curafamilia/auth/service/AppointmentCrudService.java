package com.curafamilia.auth.service;

import com.curafamilia.auth.config.JpaUtil;
import com.curafamilia.auth.dto.AppointmentCrudResponse;
import com.curafamilia.auth.dto.AppointmentDto;
import com.curafamilia.auth.dto.AppointmentWriteRequest;
import com.curafamilia.auth.exception.ApiException;
import com.curafamilia.auth.realtime.RealtimeEventBus;
import com.curafamilia.auth.repository.AppointmentCrudRepository;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.security.SeniorAccessResolver;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;
import jakarta.ws.rs.core.Response;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.Set;

public class AppointmentCrudService {
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final Set<String> VALID_STATUSES = Set.of("scheduled", "done", "cancelled");
    private final SeniorAccessResolver seniorAccessResolver = new SeniorAccessResolver();
    private final AccessControlService accessControlService = new AccessControlService();

    public AppointmentCrudResponse createAppointment(AuthenticatedUser actor, AppointmentWriteRequest request) {
        if (request == null) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Request body is required.");
        }

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();
        try {
            Long seniorId = seniorAccessResolver.resolveAccessibleSeniorId(entityManager, actor, request.getSeniorId());

            AppointmentCrudRepository repository = new AppointmentCrudRepository(entityManager);
            String specialty = requireText(request.getSpecialty(), "specialty");
            LocalDateTime appointmentAt = parseDateTime(request.getAppointmentAt(), "appointmentAt");
            String doctorName = normalizeOptional(request.getDoctorName(), null);
            String notes = normalizeOptional(request.getNotes(), null);
            String status = normalizeStatus(request.getStatus(), "scheduled");

            transaction.begin();
            Long appointmentId = repository.insertAppointment(
                    seniorId,
                    specialty,
                    appointmentAt,
                    doctorName,
                    notes,
                    status
            );
            transaction.commit();

            AppointmentCrudRepository.AppointmentProjection appointment = repository.findById(appointmentId)
                    .orElseThrow(() -> new ApiException(Response.Status.INTERNAL_SERVER_ERROR, "Appointment creation failed."));
            AppointmentCrudResponse response = new AppointmentCrudResponse("Rendez-vous cree.", toDto(appointment));
            RealtimeEventBus.publish("appointment:created", seniorId, actor, response.getAppointment());
            return response;
        } catch (ApiException exception) {
            rollback(transaction);
            throw exception;
        } catch (Exception exception) {
            rollback(transaction);
            throw exception;
        } finally {
            entityManager.close();
        }
    }

    public AppointmentCrudResponse updateAppointment(AuthenticatedUser actor, Long appointmentId, AppointmentWriteRequest request) {
        if (appointmentId == null || appointmentId <= 0) {
            throw new ApiException(Response.Status.BAD_REQUEST, "appointmentId is required.");
        }
        if (request == null) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Request body is required.");
        }

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();
        try {
            AppointmentCrudRepository repository = new AppointmentCrudRepository(entityManager);
            AppointmentCrudRepository.AppointmentProjection existing = repository.findById(appointmentId)
                    .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "Appointment not found."));

            accessControlService.assertActorCanAccessSenior(entityManager, actor, existing.getSeniorId());

            String specialty = hasText(request.getSpecialty()) ? request.getSpecialty().trim() : existing.getSpecialty();
            LocalDateTime appointmentAt = hasText(request.getAppointmentAt())
                    ? parseDateTime(request.getAppointmentAt(), "appointmentAt")
                    : existing.getAppointmentAt();
            String doctorName = request.getDoctorName() == null ? existing.getDoctorName() : normalizeOptional(request.getDoctorName(), null);
            String notes = request.getNotes() == null ? existing.getNotes() : normalizeOptional(request.getNotes(), null);
            String status = request.getStatus() == null ? existing.getStatus() : normalizeStatus(request.getStatus(), existing.getStatus());

            transaction.begin();
            repository.updateAppointment(appointmentId, specialty, appointmentAt, doctorName, notes, status);
            transaction.commit();

            AppointmentCrudRepository.AppointmentProjection saved = repository.findById(appointmentId)
                    .orElseThrow(() -> new ApiException(Response.Status.INTERNAL_SERVER_ERROR, "Appointment update failed."));
            AppointmentCrudResponse response = new AppointmentCrudResponse("Rendez-vous mis a jour.", toDto(saved));
            RealtimeEventBus.publish("appointment:updated", existing.getSeniorId(), actor, response.getAppointment());
            return response;
        } catch (ApiException exception) {
            rollback(transaction);
            throw exception;
        } catch (Exception exception) {
            rollback(transaction);
            throw exception;
        } finally {
            entityManager.close();
        }
    }

    public AppointmentCrudResponse deleteAppointment(AuthenticatedUser actor, Long appointmentId) {
        if (appointmentId == null || appointmentId <= 0) {
            throw new ApiException(Response.Status.BAD_REQUEST, "appointmentId is required.");
        }

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();
        try {
            AppointmentCrudRepository repository = new AppointmentCrudRepository(entityManager);
            AppointmentCrudRepository.AppointmentProjection existing = repository.findById(appointmentId)
                    .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "Appointment not found."));

            accessControlService.assertActorCanAccessSenior(entityManager, actor, existing.getSeniorId());

            transaction.begin();
            repository.deleteAppointment(appointmentId);
            transaction.commit();

            AppointmentCrudResponse response = new AppointmentCrudResponse("Rendez-vous supprime.", toDto(existing));
            RealtimeEventBus.publish("appointment:deleted", existing.getSeniorId(), actor, response.getAppointment());
            return response;
        } catch (ApiException exception) {
            rollback(transaction);
            throw exception;
        } catch (Exception exception) {
            rollback(transaction);
            throw exception;
        } finally {
            entityManager.close();
        }
    }

    private AppointmentDto toDto(AppointmentCrudRepository.AppointmentProjection appointment) {
        return new AppointmentDto(
                appointment.getId(),
                appointment.getSeniorId(),
                appointment.getSpecialty(),
                formatDateTime(appointment.getAppointmentAt()),
                appointment.getDoctorName(),
                appointment.getNotes(),
                appointment.getStatus()
        );
    }

    private String normalizeStatus(String value, String fallback) {
        String normalized = normalizeOptional(value, fallback);
        if (!hasText(normalized)) {
            normalized = "scheduled";
        }
        normalized = normalized.toLowerCase(Locale.ROOT);
        if (!VALID_STATUSES.contains(normalized)) {
            throw new ApiException(Response.Status.BAD_REQUEST, "status must be one of: scheduled, done, cancelled.");
        }
        return normalized;
    }

    private LocalDateTime parseDateTime(String value, String fieldName) {
        if (!hasText(value)) {
            throw new ApiException(Response.Status.BAD_REQUEST, fieldName + " is required.");
        }
        try {
            return LocalDateTime.parse(value.trim(), DateTimeFormatter.ISO_DATE_TIME);
        } catch (DateTimeParseException firstException) {
            try {
                return OffsetDateTime.parse(value.trim(), DateTimeFormatter.ISO_DATE_TIME).toLocalDateTime();
            } catch (DateTimeParseException secondException) {
                throw new ApiException(Response.Status.BAD_REQUEST, fieldName + " must be ISO datetime.");
            }
        }
    }

    private String formatDateTime(LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return value.format(DATE_TIME_FORMATTER);
    }

    private String requireText(String value, String fieldName) {
        if (!hasText(value)) {
            throw new ApiException(Response.Status.BAD_REQUEST, fieldName + " is required.");
        }
        return value.trim();
    }

    private String normalizeOptional(String value, String fallback) {
        if (!hasText(value)) {
            return fallback;
        }
        return value.trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private void rollback(EntityTransaction transaction) {
        if (transaction != null && transaction.isActive()) {
            transaction.rollback();
        }
    }
}
