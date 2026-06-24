import type {
  EffortTolerance,
  FeeTolerance,
  IncomeBracket,
  Persona,
  RewardPreference,
  TravelFrequency,
} from "../domain/types";

export interface QuestionOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

export interface PersonaQuestion<K extends keyof Persona = keyof Persona> {
  key: K;
  title: string;
  subtitle: string;
  options: QuestionOption<Persona[K]>[];
}

export const REWARD_QUESTION: PersonaQuestion<"rewardPreference"> = {
  key: "rewardPreference",
  title: "What kind of reward excites you most?",
  subtitle: "This shapes which cards we lean towards when values are close.",
  options: [
    {
      value: "cashback" as RewardPreference,
      label: "💵 Cash back",
      description: "Real money back into my statement. Simple and tangible.",
    },
    {
      value: "points" as RewardPreference,
      label: "🎁 Reward points",
      description: "Points for vouchers, gifts or statement redemption.",
    },
    {
      value: "miles" as RewardPreference,
      label: "✈️ Air miles",
      description: "Miles for flights and travel upgrades.",
    },
    {
      value: "flexible" as RewardPreference,
      label: "🤷 Whatever earns most",
      description: "I just want the best total value, no strong preference.",
    },
  ],
};

export const INCOME_QUESTION: PersonaQuestion<"incomeBracket"> = {
  key: "incomeBracket",
  title: "What's your annual income?",
  subtitle: "Used only to filter out cards you wouldn't qualify for.",
  options: [
    { value: "under36k" as IncomeBracket, label: "Below RM36k", description: "Under RM3,000/month." },
    { value: "36to60k" as IncomeBracket, label: "RM36k – RM60k", description: "RM3,000 – RM5,000/month." },
    { value: "60to100k" as IncomeBracket, label: "RM60k – RM100k", description: "RM5,000 – RM8,300/month." },
    { value: "over100k" as IncomeBracket, label: "Above RM100k", description: "More than RM8,300/month." },
  ],
};

export const FEE_QUESTION: PersonaQuestion<"feeTolerance"> = {
  key: "feeTolerance",
  title: "How do you feel about annual fees?",
  subtitle: "Some premium cards charge fees but return far more in rewards.",
  options: [
    { value: "noFee" as FeeTolerance, label: "No fees, please", description: "Strongly prefer fee-free or always-waived cards." },
    { value: "ifWorthIt" as FeeTolerance, label: "Fine if it pays off", description: "A fee is OK if the rewards clearly outweigh it." },
    { value: "premiumOk" as FeeTolerance, label: "Premium is fine", description: "I want the best perks even with a fee." },
  ],
};

export const TRAVEL_QUESTION: PersonaQuestion<"travelFrequency"> = {
  key: "travelFrequency",
  title: "How often do you travel or spend overseas?",
  subtitle: "Travel spend changes whether miles cards make sense for you.",
  options: [
    { value: "never" as TravelFrequency, label: "Rarely", description: "Mostly local, everyday spending." },
    { value: "sometimes" as TravelFrequency, label: "A few times a year", description: "Occasional trips or overseas shopping." },
    { value: "often" as TravelFrequency, label: "Frequently", description: "I fly often and value lounges & miles." },
  ],
};

export const EFFORT_QUESTION: PersonaQuestion<"effortTolerance"> = {
  key: "effortTolerance",
  title: "How many cards are you willing to juggle?",
  subtitle: "More cards can earn more, but mean more to manage.",
  options: [
    { value: "single" as EffortTolerance, label: "Just one", description: "Keep it simple — one card for everything." },
    { value: "multi" as EffortTolerance, label: "A few is fine", description: "I'll use 2–3 cards to maximise rewards." },
  ],
};

/** Ordered list of persona questions for the wizard. */
export const PERSONA_QUESTIONS: PersonaQuestion[] = [
  REWARD_QUESTION as PersonaQuestion,
  INCOME_QUESTION as PersonaQuestion,
  FEE_QUESTION as PersonaQuestion,
  TRAVEL_QUESTION as PersonaQuestion,
  EFFORT_QUESTION as PersonaQuestion,
];

export const DEFAULT_PERSONA: Persona = {
  rewardPreference: "flexible",
  incomeBracket: "36to60k",
  feeTolerance: "ifWorthIt",
  travelFrequency: "sometimes",
  effortTolerance: "multi",
};
