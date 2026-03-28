package com.curafamilia.auth.repository;

import com.curafamilia.auth.entity.User;
import jakarta.persistence.EntityManager;
import java.util.Optional;

public class UserRepository {
    private final EntityManager entityManager;

    public UserRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public Optional<User> findByEmail(String email) {
        return entityManager.createQuery("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email)", User.class)
                .setParameter("email", email)
                .getResultStream()
                .findFirst();
    }

    public User save(User user) {
        entityManager.persist(user);
        return user;
    }
}
