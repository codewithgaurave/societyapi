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

// Send notification to single token
export const sendNotification = async (fcmToken, title, body, data = {}) => {
  if (!firebaseInitialized || !fcmToken) return false;
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: { ...data },
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default", badge: 1 } } },
    });
    return true;
  } catch (err) {
    console.error("❌ sendNotification error:", err.message);
    return false;
  }
};

// Send notification to multiple tokens
export const sendMulticastNotification = async (fcmTokens, title, body, data = {}) => {
  if (!firebaseInitialized || !fcmTokens?.length) return;
  const validTokens = fcmTokens.filter(Boolean);
  if (!validTokens.length) return;

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens: validTokens,
      notification: { title, body },
      data: { ...data },
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default", badge: 1 } } },
    });
    console.log(`📲 Sent: ${response.successCount}/${validTokens.length} notifications`);
  } catch (err) {
    console.error("❌ sendMulticastNotification error:", err.message);
  }
};
