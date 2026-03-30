package com.curafamilia.auth.service;

import com.curafamilia.auth.config.JpaUtil;
import com.curafamilia.auth.dto.MedicationCrudResponse;
import com.curafamilia.auth.dto.MedicationDto;
import com.curafamilia.auth.dto.MedicationWriteRequest;
import com.curafamilia.auth.exception.ApiException;
import com.curafamilia.auth.realtime.RealtimeEventBus;
import com.curafamilia.auth.repository.MedicationCrudRepository;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.security.SeniorAccessResolver;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;
import jakarta.ws.rs.core.Response;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

public class MedicationCrudService {
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private final SeniorAccessResolver seniorAccessResolver = new SeniorAccessResolver();
    private final AccessControlService accessControlService = new AccessControlService();

    public MedicationCrudResponse createMedication(AuthenticatedUser actor, MedicationWriteRequest request) {
        if (request == null) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Request body is required.");
        }

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();
        try {
            Long seniorId = seniorAccessResolver.resolveAccessibleSeniorId(entityManager, actor, request.getSeniorId());
            MedicationCrudRepository repository = new MedicationCrudRepository(entityManager);

            LocalTime scheduledTime = parseTime(request.getTime());
            String name = requireText(request.getName(), "name");
            String dosage = requireText(request.getDosage(), "dosage");
            String frequency = normalizeOptional(request.getFrequency(), "Tous les jours");
            String period = normalizeOptional(request.getPeriod(), "ponctuel");
            String instruction = normalizeOptional(request.getInstruction(), null);
            boolean active = request.getActive() == null || request.getActive();

            transaction.begin();
            Long medicationId = repository.insertMedication(
                    seniorId,
                    name,
                    dosage,
                    scheduledTime,
                    frequency,
                    period,
                    instruction,
                    active
            );
            transaction.commit();

            MedicationCrudRepository.MedicationProjection medication = repository.findMedicationById(medicationId)
                    .orElseThrow(() -> new ApiException(Response.Status.INTERNAL_SERVER_ERROR, "Medication creation failed."));
            MedicationCrudResponse response = new MedicationCrudResponse("Medication creee.", toDto(medication));
            RealtimeEventBus.publish("medication:added", seniorId, actor, response.getMedication());
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

    public MedicationCrudResponse updateMedication(AuthenticatedUser actor, Long medicationId, MedicationWriteRequest request) {
        if (medicationId == null || medicationId <= 0) {
            throw new ApiException(Response.Status.BAD_REQUEST, "medicationId is required.");
        }
        if (request == null) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Request body is required.");
        }

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();
        try {
            MedicationCrudRepository repository = new MedicationCrudRepository(entityManager);
            MedicationCrudRepository.MedicationProjection existing = repository.findMedicationById(medicationId)
                    .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "Medication not found."));

            accessControlService.assertActorCanAccessSenior(entityManager, actor, existing.getSeniorId());

            LocalTime scheduledTime = hasText(request.getTime()) ? parseTime(request.getTime()) : existing.getScheduledTime();
            String name = hasText(request.getName()) ? request.getName().trim() : existing.getName();
            String dosage = hasText(request.getDosage()) ? request.getDosage().trim() : existing.getDosage();
            String frequency = hasText(request.getFrequency()) ? request.getFrequency().trim() : existing.getFrequency();
            String period = hasText(request.getPeriod()) ? request.getPeriod().trim() : existing.getPeriod();
            String instruction = request.getInstruction() == null ? existing.getInstruction() : normalizeOptional(request.getInstruction(), null);
            boolean active = request.getActive() == null ? existing.isActive() : request.getActive();

            transaction.begin();
            repository.updateMedication(medicationId, name, dosage, scheduledTime, frequency, period, instruction, active);
            transaction.commit();

            MedicationCrudRepository.MedicationProjection saved = repository.findMedicationById(medicationId)
                    .orElseThrow(() -> new ApiException(Response.Status.INTERNAL_SERVER_ERROR, "Medication update failed."));
            MedicationCrudResponse response = new MedicationCrudResponse("Medication mise a jour.", toDto(saved));
            RealtimeEventBus.publish("medication:updated", existing.getSeniorId(), actor, response.getMedication());
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

    public MedicationCrudResponse deleteMedication(AuthenticatedUser actor, Long medicationId) {
        if (medicationId == null || medicationId <= 0) {
            throw new ApiException(Response.Status.BAD_REQUEST, "medicationId is required.");
        }

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();
        try {
            MedicationCrudRepository repository = new MedicationCrudRepository(entityManager);
            MedicationCrudRepository.MedicationProjection existing = repository.findMedicationById(medicationId)
                    .orElseThrow(() -> new ApiException(Response.Status.NOT_FOUND, "Medication not found."));

            accessControlService.assertActorCanAccessSenior(entityManager, actor, existing.getSeniorId());

            transaction.begin();
            repository.softDeleteMedication(medicationId);
            transaction.commit();

            MedicationCrudRepository.MedicationProjection deleted = repository.findMedicationById(medicationId)
                    .orElse(existing);
            MedicationCrudResponse response = new MedicationCrudResponse("Medication supprimee.", toDto(deleted));
            RealtimeEventBus.publish("medication:deleted", existing.getSeniorId(), actor, response.getMedication());
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

    private MedicationDto toDto(MedicationCrudRepository.MedicationProjection medication) {
        return new MedicationDto(
                medication.getId(),
                medication.getSeniorId(),
                medication.getName(),
                medication.getDosage(),
                formatTime(medication.getScheduledTime()),
                medication.getFrequency(),
                medication.getPeriod(),
                medication.getInstruction(),
                medication.isActive()
        );
    }

    private LocalTime parseTime(String value) {
        if (!hasText(value)) {
            throw new ApiException(Response.Status.BAD_REQUEST, "time is required in HH:mm format.");
        }
        try {
            return LocalTime.parse(value.trim(), TIME_FORMATTER);
        } catch (DateTimeParseException exception) {
            throw new ApiException(Response.Status.BAD_REQUEST, "time must be HH:mm.");
        }
    }

    private String formatTime(LocalTime value) {
        if (value == null) {
            return null;
        }
        return value.format(TIME_FORMATTER);
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
