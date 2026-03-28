package com.curafamilia.auth.dto;

import java.util.List;

public class AssistantConversationResponse {
    private String message;
    private ConversationData conversation;

    public AssistantConversationResponse() {
    }

    public AssistantConversationResponse(String message, ConversationData conversation) {
        this.message = message;
        this.conversation = conversation;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public ConversationData getConversation() {
        return conversation;
    }

    public void setConversation(ConversationData conversation) {
        this.conversation = conversation;
    }

    public static class ConversationData {
        private Long seniorId;
        private Long sessionId;
        private String date;
        private String status;
        private MessageItem latestUserMessage;
        private MessageItem latestBotMessage;
        private List<MessageItem> messages;
        private List<String> quickReplies;
        private DailySummary summary;

        public ConversationData() {
        }

        public ConversationData(Long seniorId, Long sessionId, String date, String status,
                                MessageItem latestUserMessage, MessageItem latestBotMessage,
                                List<MessageItem> messages, List<String> quickReplies,
                                DailySummary summary) {
            this.seniorId = seniorId;
            this.sessionId = sessionId;
            this.date = date;
            this.status = status;
            this.latestUserMessage = latestUserMessage;
            this.latestBotMessage = latestBotMessage;
            this.messages = messages;
            this.quickReplies = quickReplies;
            this.summary = summary;
        }

        public Long getSeniorId() {
            return seniorId;
        }

        public void setSeniorId(Long seniorId) {
            this.seniorId = seniorId;
        }

        public Long getSessionId() {
            return sessionId;
        }

        public void setSessionId(Long sessionId) {
            this.sessionId = sessionId;
        }

        public String getDate() {
            return date;
        }

        public void setDate(String date) {
            this.date = date;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public MessageItem getLatestUserMessage() {
            return latestUserMessage;
        }

        public void setLatestUserMessage(MessageItem latestUserMessage) {
            this.latestUserMessage = latestUserMessage;
        }

        public MessageItem getLatestBotMessage() {
            return latestBotMessage;
        }

        public void setLatestBotMessage(MessageItem latestBotMessage) {
            this.latestBotMessage = latestBotMessage;
        }

        public List<MessageItem> getMessages() {
            return messages;
        }

        public void setMessages(List<MessageItem> messages) {
            this.messages = messages;
        }

        public List<String> getQuickReplies() {
            return quickReplies;
        }

        public void setQuickReplies(List<String> quickReplies) {
            this.quickReplies = quickReplies;
        }

        public DailySummary getSummary() {
            return summary;
        }

        public void setSummary(DailySummary summary) {
            this.summary = summary;
        }
    }

    public static class MessageItem {
        private Long id;
        private String sender;
        private String message;
        private String intent;
        private String createdAt;

        public MessageItem() {
        }

        public MessageItem(Long id, String sender, String message, String intent, String createdAt) {
            this.id = id;
            this.sender = sender;
            this.message = message;
            this.intent = intent;
            this.createdAt = createdAt;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getSender() {
            return sender;
        }

        public void setSender(String sender) {
            this.sender = sender;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public String getIntent() {
            return intent;
        }

        public void setIntent(String intent) {
            this.intent = intent;
        }

        public String getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(String createdAt) {
            this.createdAt = createdAt;
        }
    }

    public static class DailySummary {
        private String mood;
        private String pain;
        private Boolean medicationTopic;
        private Boolean appointmentTopic;
        private Boolean needsAttention;
        private String summaryText;

        public DailySummary() {
        }

        public DailySummary(String mood, String pain, Boolean medicationTopic, Boolean appointmentTopic,
                            Boolean needsAttention, String summaryText) {
            this.mood = mood;
            this.pain = pain;
            this.medicationTopic = medicationTopic;
            this.appointmentTopic = appointmentTopic;
            this.needsAttention = needsAttention;
            this.summaryText = summaryText;
        }

        public String getMood() {
            return mood;
        }

        public void setMood(String mood) {
            this.mood = mood;
        }

        public String getPain() {
            return pain;
        }

        public void setPain(String pain) {
            this.pain = pain;
        }

        public Boolean getMedicationTopic() {
            return medicationTopic;
        }

        public void setMedicationTopic(Boolean medicationTopic) {
            this.medicationTopic = medicationTopic;
        }

        public Boolean getAppointmentTopic() {
            return appointmentTopic;
        }

        public void setAppointmentTopic(Boolean appointmentTopic) {
            this.appointmentTopic = appointmentTopic;
        }

        public Boolean getNeedsAttention() {
            return needsAttention;
        }

        public void setNeedsAttention(Boolean needsAttention) {
            this.needsAttention = needsAttention;
        }

        public String getSummaryText() {
            return summaryText;
        }

        public void setSummaryText(String summaryText) {
            this.summaryText = summaryText;
        }
    }
}
