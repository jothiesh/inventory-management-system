package com.company.inventory.security;

import com.company.inventory.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

/**
 * Custom UserDetails implementation for Spring Security
 * Wraps the User entity and provides authentication information
 */
@Data
@AllArgsConstructor
public class CustomUserDetails implements UserDetails {

    private Long userId;
    private String username;
    private String password;
    private String fullName;
    private User.UserRole role;
    private String email;
    private boolean isActive;

    /**
     * Create from User entity
     */
    public static CustomUserDetails fromUser(User user) {
        return new CustomUserDetails(
                user.getUserId(),
                user.getUsername(),
                user.getPasswordHash(),
                user.getFullName(),
                user.getRole(),
                user.getEmail(),
                user.getIsActive()
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Return user role as authority
        return Collections.singletonList(
                new SimpleGrantedAuthority(role.name())
        );
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return isActive;
    }

    /**
     * Check if user is owner
     */
    public boolean isOwner() {
        return role == User.UserRole.OWNER;
    }

    /**
     * Check if user is manager
     */
    public boolean isManager() {
        return role == User.UserRole.STORE_MANAGER;
    }
}