import * as Application from "expo-application";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const FINGERPRINT_KEY = "device_fingerprint";

export async function getDeviceFingerprint(): Promise<string> {
  const existing = await SecureStore.getItemAsync(FINGERPRINT_KEY);
  if (existing) {
    return existing;
  }

  const appId = Application.applicationId ?? "unknown-app";
  const androidId = Platform.OS === "android" ? (Application.getAndroidId() ?? "") : "";
  const iosId =
    Platform.OS === "ios" ? ((await Application.getIosIdForVendorAsync()) ?? "") : "";

  const rawFingerprint = `${appId}:${androidId}:${iosId}:${Date.now()}:${Math.random()}`;
  const fingerprint = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawFingerprint,
  );

  await SecureStore.setItemAsync(FINGERPRINT_KEY, fingerprint, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });

  return fingerprint;
}

export async function clearDeviceFingerprint(): Promise<void> {
  await SecureStore.deleteItemAsync(FINGERPRINT_KEY);
}
