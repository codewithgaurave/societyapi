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

    const subscription = await Subscription.findOne({ user: userId, status: "active" }).lean();

    // No subscription at all
    if (!subscription) {
      return res.status(403).json({
        message: "Subscription required. Please activate a plan to continue.",
        code: "NO_SUBSCRIPTION",
      });
    }

    // Check expiry (basic has no expiry since durationDays: 0)
    if (!["free", "basic"].includes(subscription.plan) && subscription.endDate && new Date() > new Date(subscription.endDate)) {
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

// Society Service: basic or above (basic is free default)
export const requireServicePlan = requireSubscription(["basic", "pro", "premium"]);

// Society Service: pro or premium only
export const requireProPlan = requireSubscription(["pro", "premium"]);

// Society Service: premium only
export const requirePremiumPlan = requireSubscription(["premium"]);

// Society Member: any plan (free or plus)
export const requireMemberPlan = requireSubscription(["free", "plus"]);

// Society Member: plus only
export const requirePlusPlan = requireSubscription(["plus"]);
