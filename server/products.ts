/**
 * RE Lead Doctor subscription plans.
 * Prices are created dynamically in Stripe if not found.
 * The lookup_key is used to find existing prices.
 */

export interface PlanConfig {
  name: string;
  key: "starter" | "growth" | "dominator";
  priceAud: number; // cents
  displayPrice: string;
  lookupKey: string;
  features: string[];
}

export const PLANS: PlanConfig[] = [
  {
    name: "Starter",
    key: "starter",
    priceAud: 29700, // $297.00
    displayPrice: "$297",
    lookupKey: "re_lead_doctor_starter_monthly",
    features: [
      "1 Agency Profile",
      "5 Website Audits / month",
      "10 AI Chat Sessions / month",
      "3 Campaigns / month",
      "5 Suburb Pages / month",
      "Email Support",
    ],
  },
  {
    name: "Growth",
    key: "growth",
    priceAud: 49700, // $497.00
    displayPrice: "$497",
    lookupKey: "re_lead_doctor_growth_monthly",
    features: [
      "3 Agency Profiles",
      "Unlimited Website Audits",
      "Unlimited AI Chat Sessions",
      "10 Campaigns / month",
      "20 Suburb Pages / month",
      "Priority Support",
      "Campaign Performance Insights",
    ],
  },
  {
    name: "Dominator",
    key: "dominator",
    priceAud: 99700, // $997.00
    displayPrice: "$997",
    lookupKey: "re_lead_doctor_dominator_monthly",
    features: [
      "Unlimited Agency Profiles",
      "Unlimited Website Audits",
      "Unlimited AI Chat Sessions",
      "Unlimited Campaigns",
      "Unlimited Suburb Pages",
      "Dedicated Account Manager",
      "White-label Reports",
      "API Access",
    ],
  },
];

export function getPlanByKey(key: string): PlanConfig | undefined {
  return PLANS.find((p) => p.key === key);
}
