package com.curafamilia.auth.service;

import com.curafamilia.auth.config.JpaUtil;
import com.curafamilia.auth.dto.SeniorProfileApiResponse;
import com.curafamilia.auth.dto.SeniorProfileDto;
import com.curafamilia.auth.dto.SeniorProfileUpdateRequest;
import com.curafamilia.auth.entity.User;
import com.curafamilia.auth.entity.UserProfile;
import com.curafamilia.auth.entity.UserRole;
import com.curafamilia.auth.exception.ApiException;
import com.curafamilia.auth.realtime.RealtimeEventBus;
import com.curafamilia.auth.repository.SeniorProfileRepository;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.security.SeniorAccessResolver;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;
import jakarta.ws.rs.core.Response;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

public class SeniorApiService {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private final SeniorAccessResolver seniorAccessResolver = new SeniorAccessResolver();

    public SeniorProfileApiResponse getSeniorProfile(AuthenticatedUser actor, Long requestedSeniorId) {
        EntityManager entityManager = JpaUtil.createEntityManager();
        try {
            Long seniorId = seniorAccessResolver.resolveAccessibleSeniorId(entityManager, actor, requestedSeniorId);

            User senior = entityManager.find(User.class, seniorId);
            if (senior == null || senior.getRole() != UserRole.senior || !Boolean.TRUE.equals(senior.getActive())) {
                throw new ApiException(Response.Status.NOT_FOUND, "Senior not found.");
            }

            SeniorProfileRepository profileRepository = new SeniorProfileRepository(entityManager);
            UserProfile profile = profileRepository.findBySeniorId(seniorId).orElse(new UserProfile());
            return mapResponse(senior, profile);
        } finally {
            entityManager.close();
        }
    }

    public SeniorProfileApiResponse updateSeniorProfile(AuthenticatedUser actor, Long requestedSeniorId, SeniorProfileUpdateRequest request) {
        if (request == null) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Request body is required.");
        }

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();

        try {
            Long seniorId = seniorAccessResolver.resolveAccessibleSeniorId(entityManager, actor, requestedSeniorId);

            User senior = entityManager.find(User.class, seniorId);
            if (senior == null || senior.getRole() != UserRole.senior || !Boolean.TRUE.equals(senior.getActive())) {
                throw new ApiException(Response.Status.NOT_FOUND, "Senior not found.");
            }

            SeniorProfileRepository profileRepository = new SeniorProfileRepository(entityManager);
            UserProfile profile = profileRepository.findBySeniorId(seniorId).orElse(new UserProfile());
            profile.setUserId(seniorId);

            transaction.begin();
            applyUserUpdates(request, senior);
            entityManager.merge(senior);
            applyProfileUpdates(request, profile);
            UserProfile savedProfile = profileRepository.save(profile);
            transaction.commit();

            SeniorProfileApiResponse response = mapResponse(senior, savedProfile);
            RealtimeEventBus.publish("profile:updated", seniorId, actor, response);
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

    private void applyUserUpdates(SeniorProfileUpdateRequest request, User senior) {
        if (request.getAge() != null) {
            if (request.getAge() < 0 || request.getAge() > 130) {
                throw new ApiException(Response.Status.BAD_REQUEST, "age must be between 0 and 130.");
            }
            senior.setAge(request.getAge());
        }
        if (request.getCity() != null) {
            senior.setCity(normalizeOptional(request.getCity()));
        }
        if (request.getMedicalCondition() != null) {
            senior.setMedicalCondition(normalizeOptional(request.getMedicalCondition()));
        }
        if (request.getBloodType() != null) {
            senior.setBloodType(normalizeOptional(request.getBloodType()));
        }
        if (request.getAllergies() != null) {
            senior.setAllergies(normalizeOptional(request.getAllergies()));
        }
        if (request.getEmergencyContactName() != null) {
            senior.setEmergencyContactName(normalizeOptional(request.getEmergencyContactName()));
        }
        if (request.getEmergencyContactPhone() != null) {
            senior.setEmergencyContactPhone(normalizeOptional(request.getEmergencyContactPhone()));
        }
        if (request.getEmergencyContactRelation() != null) {
            senior.setEmergencyContactRelation(normalizeOptional(request.getEmergencyContactRelation()));
        }
    }

    private void applyProfileUpdates(SeniorProfileUpdateRequest request, UserProfile profile) {
        if (request.getDateOfBirth() != null) {
            profile.setDateOfBirth(parseOptionalDate(request.getDateOfBirth()));
        }
        if (request.getCity() != null) {
            profile.setCity(normalizeOptional(request.getCity()));
        }
        if (request.getChronicDiseases() != null) {
            profile.setChronicDiseases(normalizeOptional(request.getChronicDiseases()));
        }
        if (request.getBloodType() != null) {
            profile.setBloodType(normalizeOptional(request.getBloodType()));
        }
        if (request.getAllergies() != null) {
            profile.setAllergies(normalizeOptional(request.getAllergies()));
        }
        if (request.getMainDoctorName() != null) {
            profile.setMainDoctorName(normalizeOptional(request.getMainDoctorName()));
        }
        if (request.getEmergencyContactName() != null) {
            profile.setEmergencyContactName(normalizeOptional(request.getEmergencyContactName()));
        }
        if (request.getEmergencyContactPhone() != null) {
            profile.setEmergencyContactPhone(normalizeOptional(request.getEmergencyContactPhone()));
        }
        if (request.getEmergencyContactRelation() != null) {
            profile.setEmergencyContactRelation(normalizeOptional(request.getEmergencyContactRelation()));
        }
        if (request.getSpecialNote() != null) {
            profile.setSpecialNote(normalizeOptional(request.getSpecialNote()));
        }
    }

    private SeniorProfileApiResponse mapResponse(User senior, UserProfile profile) {
        SeniorProfileDto profileDto = new SeniorProfileDto();
        profileDto.setSeniorId(senior.getId());
        profileDto.setDateOfBirth(profile.getDateOfBirth());
        profileDto.setCity(profile.getCity());
        profileDto.setChronicDiseases(profile.getChronicDiseases());
        profileDto.setBloodType(profile.getBloodType());
        profileDto.setAllergies(profile.getAllergies());
        profileDto.setMainDoctorName(profile.getMainDoctorName());
        profileDto.setEmergencyContactName(profile.getEmergencyContactName());
        profileDto.setEmergencyContactPhone(profile.getEmergencyContactPhone());
        profileDto.setEmergencyContactRelation(profile.getEmergencyContactRelation());
        profileDto.setSpecialNote(profile.getSpecialNote());
        profileDto.setPreferredLanguage(profile.getPreferredLanguage());
        profileDto.setTimezone(profile.getTimezone());
        profileDto.setAudioRemindersEnabled(profile.getAudioRemindersEnabled());
        profileDto.setTextSize(profile.getTextSize());
        profileDto.setNotificationsEnabled(profile.getNotificationsEnabled());

        return new SeniorProfileApiResponse(
                senior.getId(),
                senior.getName(),
                senior.getEmail(),
                senior.getAge(),
                senior.getCity(),
                senior.getMedicalCondition(),
                senior.getBloodType(),
                senior.getAllergies(),
                senior.getEmergencyContactName(),
                senior.getEmergencyContactPhone(),
                senior.getEmergencyContactRelation(),
                profileDto
        );
    }

    private void validateSeniorId(Long seniorId) {
        if (seniorId == null || seniorId <= 0) {
            throw new ApiException(Response.Status.BAD_REQUEST, "seniorId is required.");
        }
    }

    private LocalDate parseOptionalDate(String value) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            return null;
        }
        try {
            return LocalDate.parse(normalized, DATE_FORMATTER);
        } catch (DateTimeParseException exception) {
            throw new ApiException(Response.Status.BAD_REQUEST, "dateOfBirth must use YYYY-MM-DD format.");
        }
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void rollback(EntityTransaction transaction) {
        if (transaction != null && transaction.isActive()) {
            transaction.rollback();
        }
    }
}
