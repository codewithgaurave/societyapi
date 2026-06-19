// middleware/requireSubscription.js
import Subscription from "../models/Subscription.js";

/**
 * requireSubscription(allowedPlans)
 * allowedPlans: array of plan names that are allowed, e.g. ['basic','pro','premium']
 * Pass null/empty to just require ANY active subscription (not free-only)
 *
 * Usage:
 *   router.post("/", requireAuth, requireSubscription(['basic','pro','premium']), handler)
 */
export const requireSubscription = (allowedPlans = null) => async (req, res, next) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let subscription = await Subscription.findOne({ user: userId, status: "active" }).lean();

    // ✅ Auto-assign free subscription if none exists (instead of blocking with 403)
    if (!subscription) {
      const User = (await import("../models/User.js")).default;
      const user = await User.findById(userId).lean();
      if (!user) return res.status(404).json({ message: "User not found" });

      subscription = await Subscription.create({
        user: userId,
        plan: "free",
        userType: user.role,
        status: "active",
        price: 0,
      });
      console.log(`✅ Auto-assigned free subscription to user ${userId} (role: ${user.role})`);
    }

    // Check expiry (free has no expiry)
    if (subscription.plan !== "free" && subscription.endDate && new Date() > new Date(subscription.endDate)) {
      return res.status(403).json({
        message: "Your subscription has expired. Please renew to continue.",
        code: "SUBSCRIPTION_EXPIRED",
        currentPlan: subscription.plan,
      });
    }

    // If specific plans required, check
    if (allowedPlans && allowedPlans.length > 0) {
      if (!allowedPlans.includes(subscription.plan)) {
        return res.status(403).json({
          message: `This feature requires one of these plans: ${allowedPlans.join(", ")}. Your current plan: ${subscription.plan}.`,
          code: "PLAN_UPGRADE_REQUIRED",
          currentPlan: subscription.plan,
          requiredPlans: allowedPlans,
        });
      }
    }

    // Attach subscription to request for use in controllers
    req.subscription = subscription;
    next();
  } catch (err) {
    console.error("requireSubscription error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Shorthand middlewares for common checks
 */

// Society Service: starter or above
export const requireServicePlan = requireSubscription(["starter", "basic", "pro", "premium"]);

// Society Service: pro or premium only
export const requireProPlan = requireSubscription(["pro", "premium"]);

// Society Service: premium only
export const requirePremiumPlan = requireSubscription(["premium"]);

// Society Member: any plan (free or plus)
export const requireMemberPlan = requireSubscription(["free", "plus"]);

// Society Member: plus only
export const requirePlusPlan = requireSubscription(["plus"]);
