package com.curafamilia.auth.service;

import com.curafamilia.auth.config.JpaUtil;
import com.curafamilia.auth.dto.SeniorProfileDto;
import com.curafamilia.auth.entity.User;
import com.curafamilia.auth.entity.UserProfile;
import com.curafamilia.auth.exception.ApiException;
import com.curafamilia.auth.realtime.RealtimeEventBus;
import com.curafamilia.auth.repository.SeniorProfileRepository;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.security.SeniorAccessResolver;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;
import jakarta.ws.rs.core.Response;

public class SeniorProfileService {
    private final SeniorAccessResolver seniorAccessResolver = new SeniorAccessResolver();

    public SeniorProfileDto getProfile(AuthenticatedUser actor, Long requestedSeniorId) {
        EntityManager entityManager = JpaUtil.createEntityManager();
        try {
            Long seniorId = seniorAccessResolver.resolveAccessibleSeniorId(entityManager, actor, requestedSeniorId);
            // Validate user exists
            User user = entityManager.find(User.class, seniorId);
            if (user == null || !"senior".equalsIgnoreCase(user.getRole().name())) {
                throw new ApiException(Response.Status.NOT_FOUND, "Senior user not found.");
            }

            SeniorProfileRepository repository = new SeniorProfileRepository(entityManager);
            UserProfile profile = repository.findBySeniorId(seniorId)
                    .orElse(new UserProfile()); // Return empty profile layout if none exists yet

            return mapToDto(seniorId, profile);
        } finally {
            entityManager.close();
        }
    }

    public SeniorProfileDto saveProfile(AuthenticatedUser actor, Long requestedSeniorId, SeniorProfileDto dto) {
        if (dto == null) {
            throw new ApiException(Response.Status.BAD_REQUEST, "Profile data is required.");
        }

        EntityManager entityManager = JpaUtil.createEntityManager();
        EntityTransaction transaction = entityManager.getTransaction();

        try {
            Long seniorId = seniorAccessResolver.resolveAccessibleSeniorId(entityManager, actor, requestedSeniorId);
            // Validate user exists
            User user = entityManager.find(User.class, seniorId);
            if (user == null || !"senior".equalsIgnoreCase(user.getRole().name())) {
                throw new ApiException(Response.Status.NOT_FOUND, "Senior user not found.");
            }

            SeniorProfileRepository repository = new SeniorProfileRepository(entityManager);
            
            // Get existing or create new
            UserProfile profile = repository.findBySeniorId(seniorId).orElse(new UserProfile());
            profile.setUserId(seniorId);
            
            // Map DTO values to Entity
            mapToEntity(dto, profile);

            transaction.begin();
            // merge behaves exactly like ON DUPLICATE KEY UPDATE
            UserProfile savedProfile = repository.save(profile);
            transaction.commit();

            SeniorProfileDto response = mapToDto(seniorId, savedProfile);
            RealtimeEventBus.publish("profile:updated", seniorId, actor, response);
            return response;
        } catch (Exception e) {
            if (transaction != null && transaction.isActive()) {
                transaction.rollback();
            }
            throw e;
        } finally {
            entityManager.close();
        }
    }

    private void mapToEntity(SeniorProfileDto dto, UserProfile profile) {
        if (dto.getDateOfBirth() != null) profile.setDateOfBirth(dto.getDateOfBirth());
        if (dto.getCity() != null) profile.setCity(dto.getCity());
        if (dto.getChronicDiseases() != null) profile.setChronicDiseases(dto.getChronicDiseases());
        if (dto.getBloodType() != null) profile.setBloodType(dto.getBloodType());
        if (dto.getAllergies() != null) profile.setAllergies(dto.getAllergies());
        if (dto.getMainDoctorName() != null) profile.setMainDoctorName(dto.getMainDoctorName());
        if (dto.getEmergencyContactName() != null) profile.setEmergencyContactName(dto.getEmergencyContactName());
        if (dto.getEmergencyContactPhone() != null) profile.setEmergencyContactPhone(dto.getEmergencyContactPhone());
        if (dto.getEmergencyContactRelation() != null) profile.setEmergencyContactRelation(dto.getEmergencyContactRelation());
        if (dto.getSpecialNote() != null) profile.setSpecialNote(dto.getSpecialNote());
        
        if (dto.getPreferredLanguage() != null) profile.setPreferredLanguage(dto.getPreferredLanguage());
        if (dto.getTimezone() != null) profile.setTimezone(dto.getTimezone());
        if (dto.getAudioRemindersEnabled() != null) profile.setAudioRemindersEnabled(dto.getAudioRemindersEnabled());
        if (dto.getTextSize() != null) profile.setTextSize(dto.getTextSize());
        if (dto.getNotificationsEnabled() != null) profile.setNotificationsEnabled(dto.getNotificationsEnabled());
    }

    private SeniorProfileDto mapToDto(Long seniorId, UserProfile profile) {
        SeniorProfileDto dto = new SeniorProfileDto();
        dto.setSeniorId(seniorId);
        dto.setDateOfBirth(profile.getDateOfBirth());
        dto.setCity(profile.getCity());
        dto.setChronicDiseases(profile.getChronicDiseases());
        dto.setBloodType(profile.getBloodType());
        dto.setAllergies(profile.getAllergies());
        dto.setMainDoctorName(profile.getMainDoctorName());
        dto.setEmergencyContactName(profile.getEmergencyContactName());
        dto.setEmergencyContactPhone(profile.getEmergencyContactPhone());
        dto.setEmergencyContactRelation(profile.getEmergencyContactRelation());
        dto.setSpecialNote(profile.getSpecialNote());
        dto.setPreferredLanguage(profile.getPreferredLanguage());
        dto.setTimezone(profile.getTimezone());
        dto.setAudioRemindersEnabled(profile.getAudioRemindersEnabled());
        dto.setTextSize(profile.getTextSize());
        dto.setNotificationsEnabled(profile.getNotificationsEnabled());
        return dto;
    }
}
