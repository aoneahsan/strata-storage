# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.1.x   | :white_check_mark: |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### Where to Report

Send security reports to:
- **Primary**: Create a private security advisory on [GitHub Security](https://github.com/aoneahsan/strata-storage/security/advisories/new)
- **Alternative**: Contact [@aoneahsan](https://github.com/aoneahsan) directly

### What to Include

Please provide:
- Description of the vulnerability
- Steps to reproduce the issue
- Possible impact of the vulnerability
- Suggested fix (if any)

### Response Time

- **Initial Response**: Within 48 hours
- **Status Update**: Within 5 business days
- **Resolution**: Typically within 30 days (critical issues faster)

## Security Measures

### Built-in Security Features

Strata Storage implements several security measures:

1. **Encryption Support**
   - AES-GCM encryption for sensitive data
   - Web Crypto API integration
   - Secure key derivation

2. **Input Validation**
   - All inputs are validated and sanitized
   - Protection against injection attacks
   - Type checking with TypeScript

3. **Secure Storage Options**
   - iOS Keychain integration
   - Android Encrypted SharedPreferences
   - Secure cookie flags

4. **Data Isolation**
   - Namespace separation
   - Origin-based isolation in browsers
   - App-specific storage on mobile

### Security Best Practices for Users

When using Strata Storage:

1. **Always encrypt sensitive data**
```typescript
await storage.set('sensitive', data, {
  encrypt: true,
  storage: 'secure'
});
```

2. **Use appropriate storage types**
- `secure` for credentials and tokens
- `memory` for temporary sensitive data
- `localStorage` only for non-sensitive data

3. **Set proper TTL for sensitive data**
```typescript
await storage.set('session', data, {
  ttl: 1800000, // 30 minutes
  encrypt: true
});
```

4. **Validate data on retrieval**
```typescript
const data = await storage.get('user-input');
if (data && isValidData(data)) {
  // Use data
}
```

5. **Clear sensitive data on logout**
```typescript
await storage.clear({ tags: ['auth', 'session'] });
```

## Known Security Considerations

### Web Platform
- LocalStorage is not encrypted by default
- Cookies require proper flags (HttpOnly, Secure, SameSite)
- IndexedDB data is accessible via DevTools

### Mobile Platforms
- iOS Keychain requires device passcode
- Android SharedPreferences need encryption for sensitive data
- Filesystem storage needs proper permissions

### Cross-Platform
- Data synced across devices needs end-to-end encryption
- Network transmission requires HTTPS
- Cloud sync requires authentication

## Security Audit

Last security audit: Not yet conducted
Next planned audit: Upon reaching 1000+ weekly downloads

## Dependencies

Strata Storage has **ZERO runtime dependencies**, which:
- Eliminates supply chain attacks
- Reduces security vulnerability surface
- Ensures no transitive dependency risks

Development dependencies are regularly updated and audited.

## Compliance

Strata Storage helps with compliance for:
- **GDPR**: Data encryption and TTL support for right to erasure
- **CCPA**: Clear data deletion methods
- **HIPAA**: Encryption capabilities for PHI (with proper implementation)
- **PCI DSS**: Secure storage options for payment data

**Note**: Compliance is the responsibility of the implementing application.

## Security Headers (Web)

When using Strata Storage in web applications, implement these headers:
```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Vulnerability Disclosure Policy

We follow responsible disclosure:
1. Security issues are fixed in private
2. Patches are released without details
3. Full disclosure after 30 days or when majority update
4. Credit given to reporters (unless requested otherwise)

## Security Updates

Subscribe to security updates:
- Watch the repository for releases
- Check [GitHub Security Advisories](https://github.com/aoneahsan/strata-storage/security/advisories)
- Follow [@aoneahsan](https://github.com/aoneahsan) for announcements

---

**Thank you for helping keep Strata Storage secure!**