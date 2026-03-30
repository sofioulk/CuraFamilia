package com.curafamilia.auth.dto;

public class SeniorProfileApiResponse {
    private Long seniorId;
    private String name;
    private String email;
    private Integer age;
    private String city;
    private String medicalCondition;
    private String bloodType;
    private String allergies;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelation;
    private SeniorProfileDto profile;

    public SeniorProfileApiResponse() {
    }

    public SeniorProfileApiResponse(Long seniorId, String name, String email, Integer age, String city,
                                    String medicalCondition, String bloodType, String allergies,
                                    String emergencyContactName, String emergencyContactPhone,
                                    String emergencyContactRelation, SeniorProfileDto profile) {
        this.seniorId = seniorId;
        this.name = name;
        this.email = email;
        this.age = age;
        this.city = city;
        this.medicalCondition = medicalCondition;
        this.bloodType = bloodType;
        this.allergies = allergies;
        this.emergencyContactName = emergencyContactName;
        this.emergencyContactPhone = emergencyContactPhone;
        this.emergencyContactRelation = emergencyContactRelation;
        this.profile = profile;
    }

    public Long getSeniorId() {
        return seniorId;
    }

    public void setSeniorId(Long seniorId) {
        this.seniorId = seniorId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getMedicalCondition() {
        return medicalCondition;
    }

    public void setMedicalCondition(String medicalCondition) {
        this.medicalCondition = medicalCondition;
    }

    public String getBloodType() {
        return bloodType;
    }

    public void setBloodType(String bloodType) {
        this.bloodType = bloodType;
    }

    public String getAllergies() {
        return allergies;
    }

    public void setAllergies(String allergies) {
        this.allergies = allergies;
    }

    public String getEmergencyContactName() {
        return emergencyContactName;
    }

    public void setEmergencyContactName(String emergencyContactName) {
        this.emergencyContactName = emergencyContactName;
    }

    public String getEmergencyContactPhone() {
        return emergencyContactPhone;
    }

    public void setEmergencyContactPhone(String emergencyContactPhone) {
        this.emergencyContactPhone = emergencyContactPhone;
    }

    public String getEmergencyContactRelation() {
        return emergencyContactRelation;
    }

    public void setEmergencyContactRelation(String emergencyContactRelation) {
        this.emergencyContactRelation = emergencyContactRelation;
    }

    public SeniorProfileDto getProfile() {
        return profile;
    }

    public void setProfile(SeniorProfileDto profile) {
        this.profile = profile;
    }
}
