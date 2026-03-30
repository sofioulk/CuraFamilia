package com.curafamilia.auth.dto;

public class HealthScoreResponse {
    private Long seniorId;
    private Integer score;
    private String status;
    private String formula;
    private Breakdown breakdown;

    public HealthScoreResponse() {
    }

    public HealthScoreResponse(Long seniorId, Integer score, String status, String formula, Breakdown breakdown) {
        this.seniorId = seniorId;
        this.score = score;
        this.status = status;
        this.formula = formula;
        this.breakdown = breakdown;
    }

    public Long getSeniorId() { return seniorId; }
    public void setSeniorId(Long seniorId) { this.seniorId = seniorId; }
    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getFormula() { return formula; }
    public void setFormula(String formula) { this.formula = formula; }
    public Breakdown getBreakdown() { return breakdown; }
    public void setBreakdown(Breakdown breakdown) { this.breakdown = breakdown; }

    public static class Breakdown {
        private Double adherencePercentage;
        private Double checkinCompletionPercentage;
        private Double averageMoodScore;
        private Double moodPercentage;
        private Double sosSafetyPercentage;

        public Breakdown() {
        }

        public Breakdown(Double adherencePercentage, Double checkinCompletionPercentage,
                         Double averageMoodScore, Double moodPercentage, Double sosSafetyPercentage) {
            this.adherencePercentage = adherencePercentage;
            this.checkinCompletionPercentage = checkinCompletionPercentage;
            this.averageMoodScore = averageMoodScore;
            this.moodPercentage = moodPercentage;
            this.sosSafetyPercentage = sosSafetyPercentage;
        }

        public Double getAdherencePercentage() { return adherencePercentage; }
        public void setAdherencePercentage(Double adherencePercentage) { this.adherencePercentage = adherencePercentage; }
        public Double getCheckinCompletionPercentage() { return checkinCompletionPercentage; }
        public void setCheckinCompletionPercentage(Double checkinCompletionPercentage) { this.checkinCompletionPercentage = checkinCompletionPercentage; }
        public Double getAverageMoodScore() { return averageMoodScore; }
        public void setAverageMoodScore(Double averageMoodScore) { this.averageMoodScore = averageMoodScore; }
        public Double getMoodPercentage() { return moodPercentage; }
        public void setMoodPercentage(Double moodPercentage) { this.moodPercentage = moodPercentage; }
        public Double getSosSafetyPercentage() { return sosSafetyPercentage; }
        public void setSosSafetyPercentage(Double sosSafetyPercentage) { this.sosSafetyPercentage = sosSafetyPercentage; }
    }
}
