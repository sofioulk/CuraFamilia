package com.curafamilia.auth.dto;

import java.util.List;

public class FamilyDashboardResponse {
    private Long seniorId;
    private Hero hero;
    private Kpis kpis;
    private List<TimelineItem> timeline;
    private List<MoodStripItem> moodStrip;
    private AiSummary aiSummary;

    public FamilyDashboardResponse() {
    }

    public FamilyDashboardResponse(Long seniorId, Hero hero, Kpis kpis,
                                   List<TimelineItem> timeline, List<MoodStripItem> moodStrip,
                                   AiSummary aiSummary) {
        this.seniorId = seniorId;
        this.hero = hero;
        this.kpis = kpis;
        this.timeline = timeline;
        this.moodStrip = moodStrip;
        this.aiSummary = aiSummary;
    }

    public Long getSeniorId() { return seniorId; }
    public void setSeniorId(Long seniorId) { this.seniorId = seniorId; }
    public Hero getHero() { return hero; }
    public void setHero(Hero hero) { this.hero = hero; }
    public Kpis getKpis() { return kpis; }
    public void setKpis(Kpis kpis) { this.kpis = kpis; }
    public List<TimelineItem> getTimeline() { return timeline; }
    public void setTimeline(List<TimelineItem> timeline) { this.timeline = timeline; }
    public List<MoodStripItem> getMoodStrip() { return moodStrip; }
    public void setMoodStrip(List<MoodStripItem> moodStrip) { this.moodStrip = moodStrip; }
    public AiSummary getAiSummary() { return aiSummary; }
    public void setAiSummary(AiSummary aiSummary) { this.aiSummary = aiSummary; }

    public static class Hero {
        private String name;
        private Integer age;
        private String city;
        private String medicalCondition;
        private String bloodType;
        private String nextAppointmentAt;
        private String activeSosStatus;
        private String currentMoodLabel;

        public Hero() {
        }

        public Hero(String name, Integer age, String city, String medicalCondition, String bloodType,
                    String nextAppointmentAt, String activeSosStatus, String currentMoodLabel) {
            this.name = name;
            this.age = age;
            this.city = city;
            this.medicalCondition = medicalCondition;
            this.bloodType = bloodType;
            this.nextAppointmentAt = nextAppointmentAt;
            this.activeSosStatus = activeSosStatus;
            this.currentMoodLabel = currentMoodLabel;
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public Integer getAge() { return age; }
        public void setAge(Integer age) { this.age = age; }
        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }
        public String getMedicalCondition() { return medicalCondition; }
        public void setMedicalCondition(String medicalCondition) { this.medicalCondition = medicalCondition; }
        public String getBloodType() { return bloodType; }
        public void setBloodType(String bloodType) { this.bloodType = bloodType; }
        public String getNextAppointmentAt() { return nextAppointmentAt; }
        public void setNextAppointmentAt(String nextAppointmentAt) { this.nextAppointmentAt = nextAppointmentAt; }
        public String getActiveSosStatus() { return activeSosStatus; }
        public void setActiveSosStatus(String activeSosStatus) { this.activeSosStatus = activeSosStatus; }
        public String getCurrentMoodLabel() { return currentMoodLabel; }
        public void setCurrentMoodLabel(String currentMoodLabel) { this.currentMoodLabel = currentMoodLabel; }
    }

    public static class Kpis {
        private Double adherence7dPercentage;
        private Integer checkins7dCount;
        private Integer healthScore;
        private Integer activeMedicationsCount;
        private Integer activeSosCount;

        public Kpis() {
        }

        public Kpis(Double adherence7dPercentage, Integer checkins7dCount, Integer healthScore,
                    Integer activeMedicationsCount, Integer activeSosCount) {
            this.adherence7dPercentage = adherence7dPercentage;
            this.checkins7dCount = checkins7dCount;
            this.healthScore = healthScore;
            this.activeMedicationsCount = activeMedicationsCount;
            this.activeSosCount = activeSosCount;
        }

        public Double getAdherence7dPercentage() { return adherence7dPercentage; }
        public void setAdherence7dPercentage(Double adherence7dPercentage) { this.adherence7dPercentage = adherence7dPercentage; }
        public Integer getCheckins7dCount() { return checkins7dCount; }
        public void setCheckins7dCount(Integer checkins7dCount) { this.checkins7dCount = checkins7dCount; }
        public Integer getHealthScore() { return healthScore; }
        public void setHealthScore(Integer healthScore) { this.healthScore = healthScore; }
        public Integer getActiveMedicationsCount() { return activeMedicationsCount; }
        public void setActiveMedicationsCount(Integer activeMedicationsCount) { this.activeMedicationsCount = activeMedicationsCount; }
        public Integer getActiveSosCount() { return activeSosCount; }
        public void setActiveSosCount(Integer activeSosCount) { this.activeSosCount = activeSosCount; }
    }

    public static class TimelineItem {
        private String type;
        private String title;
        private String subtitle;
        private String occurredAt;
        private String status;

        public TimelineItem() {
        }

        public TimelineItem(String type, String title, String subtitle, String occurredAt, String status) {
            this.type = type;
            this.title = title;
            this.subtitle = subtitle;
            this.occurredAt = occurredAt;
            this.status = status;
        }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getSubtitle() { return subtitle; }
        public void setSubtitle(String subtitle) { this.subtitle = subtitle; }
        public String getOccurredAt() { return occurredAt; }
        public void setOccurredAt(String occurredAt) { this.occurredAt = occurredAt; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    public static class MoodStripItem {
        private String date;
        private Double moodScore;
        private String moodLabel;

        public MoodStripItem() {
        }

        public MoodStripItem(String date, Double moodScore, String moodLabel) {
            this.date = date;
            this.moodScore = moodScore;
            this.moodLabel = moodLabel;
        }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public Double getMoodScore() { return moodScore; }
        public void setMoodScore(Double moodScore) { this.moodScore = moodScore; }
        public String getMoodLabel() { return moodLabel; }
        public void setMoodLabel(String moodLabel) { this.moodLabel = moodLabel; }
    }

    public static class AiSummary {
        private String generatedAt;
        private String source;
        private String text;

        public AiSummary() {
        }

        public AiSummary(String generatedAt, String source, String text) {
            this.generatedAt = generatedAt;
            this.source = source;
            this.text = text;
        }

        public String getGeneratedAt() { return generatedAt; }
        public void setGeneratedAt(String generatedAt) { this.generatedAt = generatedAt; }
        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }
        public String getText() { return text; }
        public void setText(String text) { this.text = text; }
    }
}
