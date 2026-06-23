// controllers/subscriptionController.js
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const getRazorpay = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const cachedPlans = {};

const getOrCreateRazorpayPlanId = async (planDetails) => {
  let razorpayPlanId = cachedPlans[planDetails.name];
  if (!razorpayPlanId) {
    try {
      const response = await getRazorpay().plans.all({ count: 100 });
      const existingPlan = response.items?.find(
        (p) => p.item?.name === planDetails.displayName && p.item?.amount === planDetails.price * 100
      );
      if (existingPlan) {
        razorpayPlanId = existingPlan.id;
      } else {
        const newPlan = await getRazorpay().plans.create({
          period: "monthly",
          interval: 1,
          item: {
            name: planDetails.displayName,
            amount: planDetails.price * 100,
            currency: "INR",
            description: `${planDetails.displayName} Subscription Plan`,
          },
        });
        razorpayPlanId = newPlan.id;
      }
      cachedPlans[planDetails.name] = razorpayPlanId;
    } catch (e) {
      console.error("Error in getOrCreateRazorpayPlanId:", e);
      throw e;
    }
  }
  return razorpayPlanId;
};

// ✅ Plan definitions
const PLANS = {
  // Worker plans
  free_service: {
    name: "free", displayName: "Free", price: 0, durationDays: 0,
    userType: "society service",
    features: ["Business Profile Listing"],
    limits: { needsPerMonth: 5, templatesAllowed: 0, tatkalEnabled: false, priorityListing: false, verifiedBadge: false, featuredInTatkal: false, analyticsEnabled: false, whatsappLeads: false }
  },
  starter: {
    name: "starter", displayName: "Starter", price: 49, durationDays: 30,
    userType: "society service",
    features: ["Business Profile Listing", "Contact Visibility", "Basic Search Presence", "1 Custom Service Template"],
    limits: { needsPerMonth: -1, templatesAllowed: 1, tatkalEnabled: false, priorityListing: false, verifiedBadge: false, featuredInTatkal: false, analyticsEnabled: false, whatsappLeads: false }
  },
  basic: {
    name: "basic", displayName: "Basic", price: 99, durationDays: 30,
    userType: "society service",
    features: ["Business Profile Listing", "Contact Visibility", "Basic Search Presence", "Unlimited Needs View", "Tatkal ON/OFF", "3 Service Templates"],
    limits: { needsPerMonth: -1, templatesAllowed: 3, tatkalEnabled: true, priorityListing: false, verifiedBadge: false, featuredInTatkal: false, analyticsEnabled: false, whatsappLeads: false }
  },
  pro: {
    name: "pro", displayName: "Pro", price: 199, durationDays: 30,
    userType: "society service",
    features: ["Business Profile Listing", "Contact Visibility", "Priority Listing", "Verified Badge", "Unlimited Needs View", "Tatkal ON/OFF", "5 Service Templates"],
    limits: { needsPerMonth: -1, templatesAllowed: 5, tatkalEnabled: true, priorityListing: true, verifiedBadge: true, featuredInTatkal: false, analyticsEnabled: false, whatsappLeads: false }
  },
  premium: {
    name: "premium", displayName: "Premium", price: 499, durationDays: 30,
    userType: "society service",
    features: ["Business Profile Listing", "Contact Visibility", "Top Priority Listing", "Featured Business Tag", "Verified Badge", "Unlimited Needs View", "Tatkal ON/OFF", "Unlimited Service Templates", "Visibility Boost", "Priority Support"],
    limits: { needsPerMonth: -1, templatesAllowed: -1, tatkalEnabled: true, priorityListing: true, verifiedBadge: true, featuredInTatkal: true, analyticsEnabled: true, whatsappLeads: true }
  },
  // Member plans
  free_member: {
    name: "free", displayName: "Free", price: 0, durationDays: 0,
    userType: "society member",
    features: ["Post 3 needs/month", "Basic worker search"],
    limits: { needsPerMonth: 3, directWorkerContact: false }
  },
  plus: {
    name: "plus", displayName: "Plus", price: 49, durationDays: 30,
    userType: "society member",
    features: ["Unlimited needs posting", "Priority response", "Direct worker contact"],
    limits: { needsPerMonth: -1, directWorkerContact: true }
  },
};

// ✅ Get all plans for a user type
export const getPlans = async (req, res) => {
  try {
    const { userType } = req.query;
    if (!userType) return res.status(400).json({ message: "userType required" });

    const plans = Object.values(PLANS).filter(p => p.userType === userType);
    return res.json({ plans });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get current subscription of logged-in user
export const getMySubscription = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let subscription = await Subscription.findOne({ user: userId, status: "active" }).lean();

    // If no subscription, auto-assign basic (free) for society service, free for member
    if (!subscription) {
      const user = await User.findById(userId).lean();
      if (!user) return res.status(404).json({ message: "User not found" });

      const defaultPlan = "free";
      subscription = await Subscription.create({
        user: userId,
        plan: defaultPlan,
        userType: user.role,
        status: "active",
        price: 0,
      });
    }

    // Check if expired (free is no-expiry, skip it)
    if (subscription.plan !== "free" && subscription.endDate && new Date() > new Date(subscription.endDate)) {
      await Subscription.findByIdAndUpdate(subscription._id, { status: "expired" });
      // Downgrade to free for both service and member
      const fallbackPlan = "free";
      subscription = await Subscription.create({
        user: userId,
        plan: fallbackPlan,
        userType: subscription.userType,
        status: "active",
        price: 0,
      });
    }

    // Get plan details
    const planKey = subscription.plan === "free"
      ? (subscription.userType === "society service" ? "free_service" : "free_member")
      : subscription.plan;
    const planDetails = PLANS[planKey] || PLANS["free_service"];

    return res.json({ subscription, planDetails });
  } catch (err) {
    console.error("getMySubscription error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Upgrade subscription (after payment)
export const upgradeSubscription = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { plan, paymentId, orderId } = req.body;
    if (!plan) return res.status(400).json({ message: "plan is required" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    // Validate plan for user type
    const planKey = plan === "free"
      ? (user.role === "society service" ? "free_service" : "free_member")
      : plan;
    const planDetails = PLANS[planKey];
    if (!planDetails) return res.status(400).json({ message: "Invalid plan" });
    if (planDetails.userType !== user.role) return res.status(400).json({ message: "Plan not available for your role" });

    // Cancel existing active subscription
    await Subscription.updateMany({ user: userId, status: "active" }, { status: "cancelled" });

    // free has no expiry
    const endDate = (plan === "free") ? null : new Date(Date.now() + planDetails.durationDays * 24 * 60 * 60 * 1000);

    const subscription = await Subscription.create({
      user: userId,
      plan,
      userType: user.role,
      status: "active",
      startDate: new Date(),
      endDate,
      price: planDetails.price,
      paymentId: paymentId || null,
      orderId: orderId || null,
    });

    return res.status(201).json({
      message: `Subscription upgraded to ${planDetails.displayName} successfully`,
      subscription,
      planDetails,
    });
  } catch (err) {
    console.error("upgradeSubscription error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Check if user can post need (member limit check)
export const checkNeedLimit = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const subscription = await Subscription.findOne({ user: userId, status: "active" }).lean();
    if (!subscription) return res.json({ canPost: true, remaining: 3 });

    const planKey = subscription.plan === "free" ? "free_member" : subscription.plan;
    const planDetails = PLANS[planKey];
    const limit = planDetails?.limits?.needsPerMonth ?? 3;

    if (limit === -1) return res.json({ canPost: true, remaining: -1 });

    // Reset monthly count if needed
    const now = new Date();
    const resetDate = new Date(subscription.needsResetDate);
    let usedCount = subscription.needsUsedThisMonth;

    if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
      await Subscription.findByIdAndUpdate(subscription._id, { needsUsedThisMonth: 0, needsResetDate: now });
      usedCount = 0;
    }

    const remaining = limit - usedCount;
    return res.json({ canPost: remaining > 0, remaining, limit, used: usedCount });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Increment need count after posting
export const incrementNeedCount = async (userId) => {
  try {
    await Subscription.findOneAndUpdate(
      { user: userId, status: "active" },
      { $inc: { needsUsedThisMonth: 1 } }
    );
  } catch (err) {
    console.error("incrementNeedCount error:", err);
  }
};

// ✅ Admin: get all subscriptions
export const getAllSubscriptions = async (req, res) => {
  try {
    if (!req.user?.adminId) return res.status(403).json({ message: "Admins only" });
    const subs = await Subscription.find({}).populate("user", "fullName mobileNumber role").lean();
    return res.json({ subscriptions: subs });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Create Razorpay order
export const createOrder = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { plan } = req.body;
    if (!plan) return res.status(400).json({ message: "plan is required" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const planKey = plan === "free"
      ? (user.role === "society service" ? "free_service" : "free_member")
      : plan;
    const planDetails = PLANS[planKey];
    if (!planDetails) return res.status(400).json({ message: "Invalid plan" });
    if (planDetails.userType !== user.role) return res.status(400).json({ message: "Plan not available for your role" });
    if (planDetails.price === 0) return res.status(400).json({ message: "This plan is free, no payment required" });

    const order = await getRazorpay().orders.create({
      amount: planDetails.price * 100, // paise
      currency: "INR",
      receipt: `sub_${Date.now()}`,
      notes: { userId, plan, userType: user.role },
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      planDetails,
    });
  } catch (err) {
    console.error("createOrder error:", JSON.stringify(err?.error || err));
    return res.status(500).json({
      message: "Server error",
      detail: err?.error?.description || err?.message || String(err),
    });
  }
};

// ✅ Verify Razorpay payment & activate subscription
export const verifyPayment = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { razorpay_order_id, razorpay_subscription_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    if ((!razorpay_order_id && !razorpay_subscription_id) || !razorpay_payment_id || !razorpay_signature || !plan) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    // Verify signature
    let expectedSignature;
    if (razorpay_order_id) {
      expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
    } else {
      expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_subscription_id}|${razorpay_payment_id}`)
        .digest("hex");
    }

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const planDetails = PLANS[plan];
    if (!planDetails) return res.status(400).json({ message: "Invalid plan" });

    // Cancel existing active subscriptions
    await Subscription.updateMany({ user: userId, status: "active" }, { status: "cancelled" });

    const endDate = new Date(Date.now() + planDetails.durationDays * 24 * 60 * 60 * 1000);

    const subscription = await Subscription.create({
      user: userId,
      plan,
      userType: user.role,
      status: "active",
      startDate: new Date(),
      endDate,
      price: planDetails.price,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id || null,
      subscriptionId: razorpay_subscription_id || null,
    });

    return res.status(201).json({
      message: `Subscription activated: ${planDetails.displayName}`,
      subscription,
      planDetails,
    });
  } catch (err) {
    console.error("verifyPayment error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Create Razorpay Subscription (Autopay)
export const createSubscription = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { plan } = req.body;
    if (!plan) return res.status(400).json({ message: "plan is required" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const planKey = plan === "free"
      ? (user.role === "society service" ? "free_service" : "free_member")
      : plan;
    const planDetails = PLANS[planKey];
    if (!planDetails) return res.status(400).json({ message: "Invalid plan" });
    if (planDetails.userType !== user.role) return res.status(400).json({ message: "Plan not available for your role" });
    if (planDetails.price === 0) return res.status(400).json({ message: "This plan is free, no payment required" });

    const rzpPlanId = await getOrCreateRazorpayPlanId(planDetails);

    const subscription = await getRazorpay().subscriptions.create({
      plan_id: rzpPlanId,
      total_count: 12, // 1 year mandate
      quantity: 1,
      customer_notify: 1,
      notes: { userId, plan, userType: user.role },
    });

    return res.json({
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      planDetails,
    });
  } catch (err) {
    console.error("createSubscription error:", JSON.stringify(err?.error || err));
    return res.status(500).json({
      message: "Server error",
      detail: err?.error?.description || err?.message || String(err),
    });
  }
};

// ✅ Create Razorpay QR Code
export const createQRCode = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { plan } = req.body;
    if (!plan) return res.status(400).json({ message: "plan is required" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const planKey = plan === "free"
      ? (user.role === "society service" ? "free_service" : "free_member")
      : plan;
    const planDetails = PLANS[planKey];
    if (!planDetails) return res.status(400).json({ message: "Invalid plan" });
    if (planDetails.userType !== user.role) return res.status(400).json({ message: "Plan not available for your role" });
    if (planDetails.price === 0) return res.status(400).json({ message: "This plan is free, no payment required" });

    const qr = await getRazorpay().qrCode.create({
      type: "upi_qr",
      name: "HOODLY",
      usage: "single_use",
      fixed_amount: true,
      payment_amount: planDetails.price * 100, // paise
      description: `${planDetails.displayName} Plan - ${user.fullName}`,
      notes: { userId, plan, userType: user.role },
    });

    return res.json({
      qrCodeId: qr.id,
      qrImageUrl: qr.image_url,
      qrString: qr.payment_code,
      amount: planDetails.price,
      keyId: process.env.RAZORPAY_KEY_ID,
      planDetails,
    });
  } catch (err) {
    console.error("createQRCode error:", JSON.stringify(err?.error || err));
    return res.status(500).json({
      message: "Server error",
      detail: err?.error?.description || err?.message || String(err),
    });
  }
};

// ✅ Verify Razorpay QR Code payment & activate subscription
export const verifyQRCodePayment = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { qrCodeId, plan } = req.body;
    if (!qrCodeId || !plan) {
      return res.status(400).json({ message: "Missing QR Code ID or plan" });
    }

    const qr = await getRazorpay().qrCode.fetch(qrCodeId);
    if (!qr) {
      return res.status(404).json({ message: "QR Code not found" });
    }

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const planDetails = PLANS[plan];
    if (!planDetails) return res.status(400).json({ message: "Invalid plan" });

    const expectedAmount = planDetails.price * 100; // in paise
    const receivedAmount = qr.payments_amount_received || 0;

    if (receivedAmount < expectedAmount) {
      return res.status(400).json({
        message: "Payment not received yet",
        receivedAmount,
        expectedAmount,
      });
    }

    // Payment is verified! Get the last payment ID if available
    let paymentId = `qr_pay_${qrCodeId}`;
    try {
      const paymentsResponse = await getRazorpay().qrCode.fetchPayments(qrCodeId);
      if (paymentsResponse?.items && paymentsResponse.items.length > 0) {
        paymentId = paymentsResponse.items[0].id;
      }
    } catch (e) {
      console.warn("Could not fetch payments list for QR code, using placeholder ID:", e.message);
    }

    // Cancel existing active subscriptions
    await Subscription.updateMany({ user: userId, status: "active" }, { status: "cancelled" });

    const endDate = new Date(Date.now() + planDetails.durationDays * 24 * 60 * 60 * 1000);

    const subscription = await Subscription.create({
      user: userId,
      plan,
      userType: user.role,
      status: "active",
      startDate: new Date(),
      endDate,
      price: planDetails.price,
      paymentId: paymentId,
      orderId: qrCodeId, // Store QR code ID under orderId so we know how it was paid
    });

    return res.status(201).json({
      message: `Subscription activated: ${planDetails.displayName}`,
      subscription,
      planDetails,
    });
  } catch (err) {
    console.error("verifyQRCodePayment error:", err);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
};

export { PLANS };
