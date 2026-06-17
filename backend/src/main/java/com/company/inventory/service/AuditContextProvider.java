package com.company.inventory.service;

import com.company.inventory.entity.User;
import com.company.inventory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuditContextProvider {

    private final UserRepository userRepository;

    public String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return "system";
        }
        return auth.getName();
    }

    @Transactional(readOnly = true)
    public Long currentUserId() {
        try {
            String username = currentUsername();
            if ("system".equals(username)) {
                return null;
            }
            Optional<User> userOpt = userRepository.findByUsername(username);
            return userOpt.map(User::getUserId).orElse(null);
        } catch (Exception e) {
            log.error("Could not resolve current user ID", e);
            return null;
        }
    }

    @Transactional(readOnly = true)
    public User currentUser() {
        try {
            String username = currentUsername();
            if ("system".equals(username)) return null;
            return userRepository.findByUsername(username).orElse(null);
        } catch (Exception e) {
            log.error("Could not fetch current user", e);
            return null;
        }
    }

    public String currentUserRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null || auth.getAuthorities().isEmpty()) {
            return null;
        }
        return auth.getAuthorities().iterator().next().getAuthority();
    }

    public boolean isAuthenticated() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null
            && auth.isAuthenticated()
            && !"anonymousUser".equals(auth.getName());
    }

    // ─── Aliases for common method-name conventions ───
    public String getCurrentUsername()  { return currentUsername(); }
    public Long   getCurrentUserId()    { return currentUserId(); }
    public User   getCurrentUser()      { return currentUser(); }
    public String getCurrentUserRole()  { return currentUserRole(); }
}