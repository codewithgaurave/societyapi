// controllers/subscriptionController.js
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";

// ✅ Plan definitions
const PLANS = {
  // Worker plans
  free_service: {
    name: "free", displayName: "Free", price: 0, durationDays: 0,
    userType: "society service",
    features: ["Basic profile listing", "View 5 needs/month", "Basic search visibility"],
    limits: { needsPerMonth: 5, templatesAllowed: 0, tatkalEnabled: false, priorityListing: false, verifiedBadge: false, featuredInTatkal: false, analyticsEnabled: false, whatsappLeads: false }
  },
  basic: {
    name: "basic", displayName: "Basic", price: 99, durationDays: 30,
    userType: "society service",
    features: ["Unlimited needs view", "Tatkal toggle ON/OFF", "3 service templates", "Standard listing"],
    limits: { needsPerMonth: -1, templatesAllowed: 3, tatkalEnabled: true, priorityListing: false, verifiedBadge: false, featuredInTatkal: false, analyticsEnabled: false, whatsappLeads: false }
  },
  pro: {
    name: "pro", displayName: "Pro", price: 199, durationDays: 30,
    userType: "society service",
    features: ["Everything in Basic", "Priority listing (top results)", "Unlimited templates", "Verified badge on profile"],
    limits: { needsPerMonth: -1, templatesAllowed: -1, tatkalEnabled: true, priorityListing: true, verifiedBadge: true, featuredInTatkal: false, analyticsEnabled: false, whatsappLeads: false }
  },
  premium: {
    name: "premium", displayName: "Premium", price: 499, durationDays: 30,
    userType: "society service",
    features: ["Everything in Pro", "Featured in Tatkal search", "Profile analytics", "Direct WhatsApp leads"],
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

    // If no subscription, create free plan
    if (!subscription) {
      const user = await User.findById(userId).lean();
      if (!user) return res.status(404).json({ message: "User not found" });

      subscription = await Subscription.create({
        user: userId,
        plan: "free",
        userType: user.role,
        status: "active",
        price: 0,
      });
    }

    // Check if expired
    if (subscription.plan !== "free" && subscription.endDate && new Date() > new Date(subscription.endDate)) {
      await Subscription.findByIdAndUpdate(subscription._id, { status: "expired" });
      // Create new free subscription
      subscription = await Subscription.create({
        user: userId,
        plan: "free",
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

    // Create new subscription
    const endDate = plan === "free" ? null : new Date(Date.now() + planDetails.durationDays * 24 * 60 * 60 * 1000);

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

export { PLANS };
