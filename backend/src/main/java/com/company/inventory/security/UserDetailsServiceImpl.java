package com.company.inventory.security;

import com.company.inventory.entity.User;
import com.company.inventory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Collections;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        log.debug("Security credentials subsystem fetching user details matrix matching query string name identifier token: '{}'", username);
        
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    log.error("Security core lookup boundary error: Username profile node record index not found matching value: '{}'", username);
                    return new UsernameNotFoundException("User not found: " + username);
                });

        log.trace("User profile record matched successfully. Resolving internal security system mappings wrapper structure.");
        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPasswordHash(),
                user.getIsActive(),
                true,
                true,
                true,
                getAuthorities(user)
        );
    }

    private Collection<? extends GrantedAuthority> getAuthorities(User user) {
        String roleName = user.getRole() != null ? user.getRole().name() : "ROLE_USER";
        log.trace("Mapping corporate role authorizations string structures to spring framework security tokens: [{}]", roleName);
        return Collections.singletonList(new SimpleGrantedAuthority(roleName));
    }
}