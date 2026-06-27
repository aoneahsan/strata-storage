#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the StrataStorage plugin and its methods with the Capacitor
// bridge. Without this macro block the @objc Swift methods are NOT exposed
// to the JavaScript layer and every call would fail with "method not
// implemented". The method names and the parameter list below MUST match
// the @objc func names in StrataStoragePlugin.swift and the JS plugin
// contract in src/plugin/definitions.ts.
CAP_PLUGIN(StrataStoragePlugin, "StrataStorage",
    CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(get, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(set, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(remove, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clear, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(keys, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(size, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(query, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(cleanupExpired, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getUserDefaults, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setUserDefaults, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getKeychain, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setKeychain, CAPPluginReturnPromise);
)
