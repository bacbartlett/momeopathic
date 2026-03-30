import { Platform } from "react-native";
import { getStorage } from "@/lib/storage";

const FINGERPRINT_KEY = "device_fingerprint";

export async function getDeviceFingerprint(): Promise<string> {
  const storage = getStorage();
  const existing = await storage.getItem(FINGERPRINT_KEY);
  if (existing) {
    return existing;
  }

  let fingerprint: string;

  if (Platform.OS === "web") {
    // Web fallback: use Web Crypto API
    const rawFingerprint = `web:${navigator.userAgent}:${Date.now()}:${Math.random()}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(rawFingerprint);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    fingerprint = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } else {
    // Native: use expo-application and expo-crypto
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Application = require("expo-application");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Crypto = require("expo-crypto");

    const appId = Application.applicationId ?? "unknown-app";
    const androidId =
      Platform.OS === "android" ? (Application.getAndroidId() ?? "") : "";
    const iosId =
      Platform.OS === "ios"
        ? ((await Application.getIosIdForVendorAsync()) ?? "")
        : "";

    const rawFingerprint = `${appId}:${androidId}:${iosId}:${Date.now()}:${Math.random()}`;
    fingerprint = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawFingerprint,
    );
  }

  await storage.setItem(FINGERPRINT_KEY, fingerprint);

  return fingerprint;
}

export async function clearDeviceFingerprint(): Promise<void> {
  const storage = getStorage();
  await storage.removeItem(FINGERPRINT_KEY);
}
