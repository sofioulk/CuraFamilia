package com.curafamilia.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_profiles")
public class UserProfile {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(length = 100)
    private String city;

    @Column(name = "chronic_diseases", columnDefinition = "TEXT")
    private String chronicDiseases;

    @Column(name = "blood_type", columnDefinition = "ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-')")
    private String bloodType;

    @Column(columnDefinition = "TEXT")
    private String allergies;

    @Column(name = "main_doctor_name", length = 120)
    private String mainDoctorName;

    @Column(name = "emergency_contact_name", length = 120)
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone", length = 30)
    private String emergencyContactPhone;

    @Column(name = "emergency_contact_relation", length = 60)
    private String emergencyContactRelation;

    @Column(name = "special_note", length = 255)
    private String specialNote;

    @Column(name = "preferred_language", length = 10, nullable = false)
    private String preferredLanguage = "fr";

    @Column(length = 64, nullable = false)
    private String timezone = "Africa/Casablanca";

    @Column(name = "audio_reminders_enabled", nullable = false)
    private Boolean audioRemindersEnabled = true;

    @Column(name = "text_size", columnDefinition = "ENUM('small','medium','large')", nullable = false)
    private String textSize = "large";

    @Column(name = "notifications_enabled", nullable = false)
    private Boolean notificationsEnabled = true;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    // Getters and Setters
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getChronicDiseases() { return chronicDiseases; }
    public void setChronicDiseases(String chronicDiseases) { this.chronicDiseases = chronicDiseases; }

    public String getBloodType() { return bloodType; }
    public void setBloodType(String bloodType) { this.bloodType = bloodType; }

    public String getAllergies() { return allergies; }
    public void setAllergies(String allergies) { this.allergies = allergies; }

    public String getMainDoctorName() { return mainDoctorName; }
    public void setMainDoctorName(String mainDoctorName) { this.mainDoctorName = mainDoctorName; }

    public String getEmergencyContactName() { return emergencyContactName; }
    public void setEmergencyContactName(String emergencyContactName) { this.emergencyContactName = emergencyContactName; }

    public String getEmergencyContactPhone() { return emergencyContactPhone; }
    public void setEmergencyContactPhone(String emergencyContactPhone) { this.emergencyContactPhone = emergencyContactPhone; }

    public String getEmergencyContactRelation() { return emergencyContactRelation; }
    public void setEmergencyContactRelation(String emergencyContactRelation) { this.emergencyContactRelation = emergencyContactRelation; }

    public String getSpecialNote() { return specialNote; }
    public void setSpecialNote(String specialNote) { this.specialNote = specialNote; }

    public String getPreferredLanguage() { return preferredLanguage; }
    public void setPreferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public Boolean getAudioRemindersEnabled() { return audioRemindersEnabled; }
    public void setAudioRemindersEnabled(Boolean audioRemindersEnabled) { this.audioRemindersEnabled = audioRemindersEnabled; }

    public String getTextSize() { return textSize; }
    public void setTextSize(String textSize) { this.textSize = textSize; }

    public Boolean getNotificationsEnabled() { return notificationsEnabled; }
    public void setNotificationsEnabled(Boolean notificationsEnabled) { this.notificationsEnabled = notificationsEnabled; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
