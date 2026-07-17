const fs = require('fs');

let content = fs.readFileSync('controllers/serviceTemplateController.js', 'utf8');

content = content.replace(
  'import { PLANS } from "./subscriptionController.js";',
  'import { getPlanDetails } from "./subscriptionController.js";'
);

content = content.replace(
  `    const planKey = (subscription?.plan === "free" || !subscription)
      ? "free_service"
      : subscription.plan;
    const planDetails = PLANS[planKey] || PLANS["free_service"];`,
  `    const planDetails = await getPlanDetails(subscription?.plan || "free", "society service");`
);

fs.writeFileSync('controllers/serviceTemplateController.js', content);
console.log("Done");
