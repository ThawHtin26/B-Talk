package com.btalk.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.SignatureException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import com.btalk.entity.User;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.UUID;

@Component
public class JwtTokenUtils {
    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;
    
    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    public String generateToken(User user) {
        try {
            Map<String, Object> claims = new HashMap<>();
            claims.put("userId", user.getUserId().toString());
            claims.put("email", user.getEmail());
            claims.put("tokenType", "access");
            
            String token = createToken(claims, user.getEmail(), expiration);
            
            // Validate the generated token
            if (token == null || token.split("\\.").length != 3) {
                throw new IllegalStateException("Failed to generate valid JWT token");
            }
            
            return token;
        } catch (Exception e) {
            throw new RuntimeException("Token generation failed", e);
        }
    }

    public String generateRefreshToken(User user) {
        try {
            Map<String, Object> claims = new HashMap<>();
            claims.put("userId", user.getUserId().toString());
            claims.put("email", user.getEmail());
            claims.put("tokenType", "refresh");
            
            String token = createToken(claims, user.getEmail(), refreshExpiration);
            
            // Validate the generated token
            if (token == null || token.split("\\.").length != 3) {
                throw new IllegalStateException("Failed to generate valid refresh JWT token");
            }
            
            return token;
        } catch (Exception e) {
            throw new RuntimeException("Refresh token generation failed", e);
        }
    }

    public Claims extractAllClaims(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(getSignKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (ExpiredJwtException e) {
            throw new ExpiredJwtException(e.getHeader(), e.getClaims(), "JWT token has expired");
        } catch (MalformedJwtException e) {
            throw new MalformedJwtException("Invalid JWT token format", e);
        } catch (SignatureException e) {
            throw new SignatureException("Invalid JWT signature", e);
        } catch (UnsupportedJwtException e) {
            throw new UnsupportedJwtException("Unsupported JWT token", e);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("JWT token is empty or null", e);
        } catch (Exception e) {
            throw new RuntimeException("Token parsing failed", e);
        }
    }

    private String createToken(Map<String, Object> claims, String subject, long expirationTime) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expirationTime))
                .signWith(getSignKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    private Key getSignKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String extractTokenType(String token) {
        return extractClaim(token, claims -> claims.get("tokenType", String.class));
    }

    public UUID extractUserId(String token) {
        String userIdStr = extractClaim(token, claims -> claims.get("userId", String.class));
        return UUID.fromString(userIdStr);
    }


    public Boolean validateToken(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            final String tokenType = extractTokenType(token);
            return (username.equals(userDetails.getUsername()) && 
                    !isTokenExpired(token) && 
                    "access".equals(tokenType));
        } catch (Exception e) {
            return false;
        }
    }

    public Boolean validateRefreshToken(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            final String tokenType = extractTokenType(token);
            return (username.equals(userDetails.getUsername()) && 
                    !isTokenExpired(token) && 
                    "refresh".equals(tokenType));
        } catch (Exception e) {
            return false;
        }
    }

    public Boolean isTokenExpired(String token) {
        try {
            return extractExpiration(token).before(new Date());
        } catch (Exception e) {
            return true;
        }
    }
}
