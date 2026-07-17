const fs = require('fs');

let content = fs.readFileSync('controllers/subscriptionController.js', 'utf8');

// 1. Add Plan import
content = content.replace('import Subscription from "../models/Subscription.js";', 'import Subscription from "../models/Subscription.js";\nimport Plan from "../models/Plan.js";');

// 2. Remove PLANS object and replace with getPlanDetails
const planDetailsRegex = /const PLANS = \{[\s\S]*?^\};\n/m;
const getPlanDetailsFunc = `
// ✅ Get Plan Details Helper
export const getPlanDetails = async (planName, userType) => {
  let plan = await Plan.findOne({ name: planName, userType }).lean();
  if (!plan) {
    // Fallback to free plan
    plan = await Plan.findOne({ name: "free", userType }).lean();
  }
  return plan;
};
`;
content = content.replace(planDetailsRegex, getPlanDetailsFunc);

// 3. Update getPlans
const getPlansRegex = /export const getPlans = async \(req, res\) => \{[\s\S]*?return res\.json\(\{ plans \}\);\n\s*\} catch \(err\) \{/m;
const getPlansReplacement = `export const getPlans = async (req, res) => {
  try {
    const { userType } = req.query;
    if (!userType) return res.status(400).json({ message: "userType required" });

    const plans = await Plan.find({ userType }).lean();
    return res.json({ plans });
  } catch (err) {`;
content = content.replace(getPlansRegex, getPlansReplacement);

// 4. Update getMySubscription
content = content.replace(
  `    const planKey = subscription.plan === "free"
      ? (subscription.userType === "society service" ? "free_service" : "free_member")
      : subscription.plan;
    const planDetails = PLANS[planKey] || PLANS["free_service"];`,
  `    const planDetails = await getPlanDetails(subscription.plan, subscription.userType);`
);

// 5. Update upgradeSubscription
content = content.replace(
  `    // Validate plan for user type
    const planKey = plan === "free"
      ? (user.role === "society service" ? "free_service" : "free_member")
      : plan;
    const planDetails = PLANS[planKey];`,
  `    // Validate plan for user type
    const planDetails = await getPlanDetails(plan, user.role);`
);

// 6. Update checkNeedLimit
content = content.replace(
  `    const planKey = subscription.plan === "free" ? "free_member" : subscription.plan;
    const planDetails = PLANS[planKey];`,
  `    const planDetails = await getPlanDetails(subscription.plan, subscription.userType);`
);

// 7. Update createOrder
content = content.replace(
  `    const planKey = plan === "free"
      ? (user.role === "society service" ? "free_service" : "free_member")
      : plan;
    const planDetails = PLANS[planKey];`,
  `    const planDetails = await getPlanDetails(plan, user.role);`
);

// 8. Update verifyPayment
content = content.replace(
  `    const planDetails = PLANS[plan];`,
  `    const planDetails = await getPlanDetails(plan, user.role);`
);

// 9. Update createSubscription
content = content.replace(
  `    const planKey = plan === "free"
      ? (user.role === "society service" ? "free_service" : "free_member")
      : plan;
    const planDetails = PLANS[planKey];`,
  `    const planDetails = await getPlanDetails(plan, user.role);`
);

// 10. Update createQRCode
content = content.replace(
  `    const planKey = plan === "free"
      ? (user.role === "society service" ? "free_service" : "free_member")
      : plan;
    const planDetails = PLANS[planKey];`,
  `    const planDetails = await getPlanDetails(plan, user.role);`
);

// 11. Update verifyQRCodePayment
content = content.replace(
  `    const planDetails = PLANS[plan];`,
  `    const planDetails = await getPlanDetails(plan, user.role);`
);

// 12. Remove export { PLANS };
content = content.replace('export { PLANS };', '');

fs.writeFileSync('controllers/subscriptionController.js', content);
console.log("Done");
