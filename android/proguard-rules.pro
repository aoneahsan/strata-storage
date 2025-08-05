# Add project specific ProGuard rules here.

# Keep StrataStorage plugin classes
-keep class com.stratastorage.** { *; }
-keep class com.strata.storage.** { *; }

# Keep Capacitor classes
-keep class com.getcapacitor.** { *; }

# Keep security crypto classes for encrypted storage
-keep class androidx.security.crypto.** { *; }