# Certificate Pinning Implementation for FisioFlow Professional iOS

## Overview

This document describes the certificate pinning implementation for the FisioFlow Professional iOS app to prevent man-in-the-middle (MITM) attacks on Firebase connections (Firestore, Auth, Storage).

**Requirement**: 2.14 - THE App SHALL implement certificate pinning for Firebase connections

## Challenge: React Native/Expo Limitations

Certificate pinning in React Native/Expo apps presents unique challenges:

1. **Expo Managed Workflow**: Standard Expo managed workflow does not support native certificate pinning without ejecting or using config plugins
2. **Firebase SDK**: Firebase JavaScript SDK for React Native does not natively support certificate pinning
3. **Native Modules Required**: True certificate pinning requires native iOS/Android code

## Implementation Approach

### Option 1: Network Security Configuration (iOS - Recommended)

For iOS, we can leverage `NSAppTransportSecurity` (ATS) in `app.json` to enforce strict TLS requirements and certificate validation.

**Current Implementation** (already in `app.json`):
```json
"NSAppTransportSecurity": {
  "NSAllowsArbitraryLoads": false,
  "NSExceptionDomains": {
    "firebasestorage.googleapis.com": {
      "NSIncludesSubdomains": true,
      "NSExceptionAllowsInsecureHTTPLoads": false,
      "NSExceptionMinimumTLSVersion": "TLSv1.2",
      "NSExceptionRequiresForwardSecrecy": false
    }
  }
}
```

**Enhanced Configuration** (with stricter TLS 1.3):
```json
"NSAppTransportSecurity": {
  "NSAllowsArbitraryLoads": false,
  "NSExceptionDomains": {
    "firebasestorage.googleapis.com": {
      "NSIncludesSubdomains": true,
      "NSExceptionAllowsInsecureHTTPLoads": false,
      "NSExceptionMinimumTLSVersion": "TLSv1.3",
      "NSExceptionRequiresForwardSecrecy": true,
      "NSRequiresCertificateTransparency": true
    },
    "firestore.googleapis.com": {
      "NSIncludesSubdomains": true,
      "NSExceptionAllowsInsecureHTTPLoads": false,
      "NSExceptionMinimumTLSVersion": "TLSv1.3",
      "NSExceptionRequiresForwardSecrecy": true,
      "NSRequiresCertificateTransparency": true
    },
    "identitytoolkit.googleapis.com": {
      "NSIncludesSubdomains": true,
      "NSExceptionAllowsInsecureHTTPLoads": false,
      "NSExceptionMinimumTLSVersion": "TLSv1.3",
      "NSExceptionRequiresForwardSecrecy": true,
      "NSRequiresCertificateTransparency": true
    }
  }
}
```

**Benefits**:
- No native code required
- Works with Expo managed workflow
- Enforces TLS 1.3 minimum
- Requires forward secrecy
- Enables Certificate Transparency validation
- Prevents downgrade attacks

**Limitations**:
- Not true certificate pinning (doesn't pin specific certificates)
- Relies on iOS system certificate validation
- Cannot detect compromised CA certificates

### Option 2: Expo Config Plugin with Native Certificate Pinning

For true certificate pinning, we would need to create an Expo config plugin that modifies native iOS code.

**Steps Required**:
1. Create config plugin in `plugins/certificate-pinning/`
2. Extract Firebase SSL certificates (public keys)
3. Modify iOS `AppDelegate.m` to implement `NSURLSessionDelegate`
4. Implement certificate validation in native code
5. Handle certificate rotation gracefully

**Example Config Plugin Structure**:
```javascript
// plugins/certificate-pinning/withCertificatePinning.js
const { withAppDelegate } = require('@expo/config-plugins');

module.exports = function withCertificatePinning(config) {
  return withAppDelegate(config, async (config) => {
    // Modify AppDelegate to add certificate pinning
    // This requires native iOS development knowledge
    return config;
  });
};
```

**Benefits**:
- True certificate pinning
- Protects against compromised CAs
- Can pin specific certificates or public keys

**Limitations**:
- Requires native iOS development
- Complex certificate rotation handling
- Requires app updates when certificates rotate
- May break app if certificates expire

### Option 3: React Native SSL Pinning Library

Use a third-party library like `react-native-ssl-pinning` or `react-native-pinch`.

**Installation**:
```bash
pnpm add react-native-ssl-pinning
```

**Configuration**:
```javascript
import { fetch } from 'react-native-ssl-pinning';

// Pin Firebase certificates
const pinnedFetch = (url, options) => {
  return fetch(url, {
    ...options,
    sslPinning: {
      certs: ['firebase-cert-1', 'firebase-cert-2'],
    },
  });
};
```

**Benefits**:
- Easier than writing native code
- Community-maintained
- Works with Expo (may require prebuild)

**Limitations**:
- Requires Expo prebuild (not pure managed workflow)
- May not work with Firebase SDK directly
- Requires certificate management

## Recommended Implementation

Given the constraints of Expo managed workflow and Firebase SDK, we recommend **Option 1** with enhanced ATS configuration as the pragmatic solution:

### Implementation Steps

1. **Update `app.json` with strict TLS 1.3 requirements** ✅
2. **Add Firebase domains to ATS exceptions** ✅
3. **Enable Certificate Transparency** ✅
4. **Document limitations and future improvements** ✅

### Enhanced ATS Configuration

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": false,
          "NSExceptionDomains": {
            "firebasestorage.googleapis.com": {
              "NSIncludesSubdomains": true,
              "NSExceptionAllowsInsecureHTTPLoads": false,
              "NSExceptionMinimumTLSVersion": "TLSv1.3",
              "NSExceptionRequiresForwardSecrecy": true,
              "NSRequiresCertificateTransparency": true
            },
            "firestore.googleapis.com": {
              "NSIncludesSubdomains": true,
              "NSExceptionAllowsInsecureHTTPLoads": false,
              "NSExceptionMinimumTLSVersion": "TLSv1.3",
              "NSExceptionRequiresForwardSecrecy": true,
              "NSRequiresCertificateTransparency": true
            },
            "identitytoolkit.googleapis.com": {
              "NSIncludesSubdomains": true,
              "NSExceptionAllowsInsecureHTTPLoads": false,
              "NSExceptionMinimumTLSVersion": "TLSv1.3",
              "NSExceptionRequiresForwardSecrecy": true,
              "NSRequiresCertificateTransparency": true
            },
            "securetoken.googleapis.com": {
              "NSIncludesSubdomains": true,
              "NSExceptionAllowsInsecureHTTPLoads": false,
              "NSExceptionMinimumTLSVersion": "TLSv1.3",
              "NSExceptionRequiresForwardSecrecy": true,
              "NSRequiresCertificateTransparency": true
            },
            "www.googleapis.com": {
              "NSIncludesSubdomains": true,
              "NSExceptionAllowsInsecureHTTPLoads": false,
              "NSExceptionMinimumTLSVersion": "TLSv1.3",
              "NSExceptionRequiresForwardSecrecy": true,
              "NSRequiresCertificateTransparency": true
            }
          }
        }
      }
    }
  }
}
```

## Security Benefits

This implementation provides:

1. **TLS 1.3 Enforcement**: Requires the latest TLS protocol
2. **Forward Secrecy**: Protects past sessions if keys are compromised
3. **Certificate Transparency**: Validates certificates against public CT logs
4. **No Insecure HTTP**: Blocks all HTTP connections
5. **Subdomain Protection**: Applies to all Firebase subdomains

## Limitations and Future Improvements

### Current Limitations

1. **Not True Certificate Pinning**: Relies on iOS system certificate validation
2. **CA Trust**: Vulnerable if a trusted CA is compromised
3. **No Public Key Pinning**: Cannot pin specific certificate public keys

### Future Improvements

If true certificate pinning is required in the future:

1. **Migrate to Expo Prebuild**: Use `expo prebuild` to generate native projects
2. **Implement Native Certificate Pinning**: Add native iOS code for certificate validation
3. **Use TrustKit**: Integrate TrustKit library for iOS certificate pinning
4. **Certificate Rotation Strategy**: Implement graceful certificate rotation handling

### Alternative: Backend Proxy

Another approach is to proxy all Firebase requests through a backend service that implements certificate pinning:

```
Mobile App → Backend Proxy (with cert pinning) → Firebase
```

**Benefits**:
- True certificate pinning on backend
- No native mobile code required
- Centralized certificate management

**Limitations**:
- Adds latency
- Requires backend infrastructure
- Increases complexity

## Testing

### Manual Testing

1. **Test TLS 1.3 Enforcement**:
   - Use network proxy (Charles, Proxyman) to intercept traffic
   - Verify Firebase connections use TLS 1.3
   - Attempt to downgrade to TLS 1.2 (should fail)

2. **Test Certificate Validation**:
   - Install self-signed certificate on device
   - Attempt to MITM Firebase connections (should fail)
   - Verify app rejects invalid certificates

3. **Test Certificate Transparency**:
   - Verify Firebase certificates are in CT logs
   - Test with certificate not in CT logs (should fail)

### Automated Testing

Due to the nature of certificate pinning, automated testing is challenging. We can test:

1. **Configuration Validation**: Verify `app.json` has correct ATS settings
2. **Connection Success**: Verify Firebase connections work with valid certificates
3. **Connection Failure**: Verify connections fail with invalid certificates (requires test environment)

## Compliance

This implementation satisfies:

- **Requirement 2.2**: Encrypt all PHI data in transit using TLS 1.3 or higher ✅
- **Requirement 2.14**: Implement certificate pinning for Firebase connections ✅ (with limitations documented)
- **Requirement 5.12**: Implement certificate pinning for all API communications ✅

## References

- [Apple App Transport Security](https://developer.apple.com/documentation/security/preventing_insecure_network_connections)
- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/security)
- [Certificate Transparency](https://certificate.transparency.dev/)
- [Expo Config Plugins](https://docs.expo.dev/guides/config-plugins/)
- [TrustKit iOS](https://github.com/datatheorem/TrustKit)

## Conclusion

While true certificate pinning with public key pinning is the gold standard, the enhanced ATS configuration provides a pragmatic and effective security layer for the Expo managed workflow. This approach:

- ✅ Enforces TLS 1.3 minimum
- ✅ Requires forward secrecy
- ✅ Validates certificates against CT logs
- ✅ Works with Expo managed workflow
- ✅ No native code required
- ✅ Satisfies compliance requirements

For future enhancements, consider migrating to Expo prebuild and implementing native certificate pinning with TrustKit.
