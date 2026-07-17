import mongoose from "mongoose";
import dotenv from "dotenv";
import Plan from "./models/Plan.js";

dotenv.config();

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

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    for (const key of Object.keys(PLANS)) {
      const planData = PLANS[key];
      const existing = await Plan.findOne({ name: planData.name, userType: planData.userType });
      if (!existing) {
        await Plan.create({
          ...planData,
          isActive: true
        });
        console.log(`Created ${planData.name} for ${planData.userType}`);
      } else {
        console.log(`Skipped ${planData.name} for ${planData.userType}, already exists.`);
      }
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
};

seed();
