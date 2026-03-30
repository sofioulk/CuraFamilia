package com.curafamilia.auth.dto;

public class LinkedSeniorItem {
    private Long seniorId;
    private String name;
    private Integer age;
    private String city;
    private String medicalCondition;
    private String bloodType;
    private String linkedAt;

    public LinkedSeniorItem() {
    }

    public LinkedSeniorItem(Long seniorId, String name, Integer age, String city,
                            String medicalCondition, String bloodType, String linkedAt) {
        this.seniorId = seniorId;
        this.name = name;
        this.age = age;
        this.city = city;
        this.medicalCondition = medicalCondition;
        this.bloodType = bloodType;
        this.linkedAt = linkedAt;
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

    public String getLinkedAt() {
        return linkedAt;
    }

    public void setLinkedAt(String linkedAt) {
        this.linkedAt = linkedAt;
    }
}
