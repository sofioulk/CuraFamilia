package com.curafamilia.auth.dto;

import java.time.LocalDate;

public class SeniorProfileDto {
    private Long seniorId;
    private LocalDate dateOfBirth;
    private String city;
    private String chronicDiseases;
    private String bloodType;
    private String allergies;
    private String mainDoctorName;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelation;
    private String specialNote;
    private String preferredLanguage;
    private String timezone;
    private Boolean audioRemindersEnabled;
    private String textSize;
    private Boolean notificationsEnabled;

    // Getters and Setters
    public Long getSeniorId() { return seniorId; }
    public void setSeniorId(Long seniorId) { this.seniorId = seniorId; }

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
}
