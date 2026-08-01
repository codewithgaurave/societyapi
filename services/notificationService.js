// services/notificationService.js
import admin from "firebase-admin";

// Initialize Firebase Admin (use service account from env)
let firebaseInitialized = false;

const initFirebase = () => {
  if (firebaseInitialized) return;
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
    if (!serviceAccount.project_id) {
      console.warn("⚠️ Firebase service account not configured. Notifications disabled.");
      return;
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log("✅ Firebase Admin initialized");
  } catch (err) {
    console.error("❌ Firebase init error:", err.message);
  }
};

initFirebase();

// Helper: sanitize data payload values to String
const sanitizeData = (data = {}) => {
  const sanitized = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== null && val !== undefined) {
      sanitized[key] = String(val);
    }
  }
  return sanitized;
};

// Send notification to single token
export const sendNotification = async (fcmToken, title, body, data = {}) => {
  if (!firebaseInitialized || !fcmToken) return false;
  try {
    const stringData = sanitizeData(data);
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: stringData,
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default", badge: 1 } } },
    });
    console.log(`📲 Single Notification Sent to: ${fcmToken.substring(0, 15)}...`);
    return true;
  } catch (err) {
    console.error("❌ sendNotification error:", err.message);
    return false;
  }
};

// Send notification to multiple tokens
export const sendMulticastNotification = async (fcmTokens, title, body, data = {}) => {
  if (!firebaseInitialized || !fcmTokens?.length) {
    console.log("⚠️ sendMulticastNotification skipped: Firebase not init or 0 tokens.");
    return;
  }
  const validTokens = fcmTokens.filter((t) => t && typeof t === "string" && t.trim().length > 0);
  if (!validTokens.length) {
    console.log("⚠️ sendMulticastNotification skipped: No valid FCM tokens.");
    return;
  }

  try {
    const stringData = sanitizeData(data);
    const response = await admin.messaging().sendEachForMulticast({
      tokens: validTokens,
      notification: { title, body },
      data: stringData,
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default", badge: 1 } } },
    });
    console.log(`📲 FCM Multicast Sent: ${response.successCount} succeeded, ${response.failureCount} failed out of ${validTokens.length} tokens.`);
  } catch (err) {
    console.error("❌ sendMulticastNotification error:", err.message);
  }
};
