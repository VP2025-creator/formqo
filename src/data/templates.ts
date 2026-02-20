import { Question, FormSettings } from "@/types/form";

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  icon: string;          // emoji
  estimatedTime: string; // "2 min"
  questions: Question[];
  settings: FormSettings;
  tags: string[];
}

export type TemplateCategory =
  | "Contact"
  | "Feedback"
  | "Research"
  | "HR"
  | "Events"
  | "Lead Gen";

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Contact",
  "Feedback",
  "Research",
  "HR",
  "Events",
  "Lead Gen",
];

const DEFAULT_SETTINGS: FormSettings = {
  primaryColor: "hsl(357 95% 22%)",
  showBranding: true,
  thankYouTitle: "Thanks for your response!",
  thankYouMessage: "We've received your submission and will be in touch shortly.",
};

export const FORM_TEMPLATES: FormTemplate[] = [
  // ── 1. Contact Us ──────────────────────────────────────────────────────────
  {
    id: "tpl-contact",
    title: "Contact Us",
    description: "A clean contact form that captures name, email, and message — ready to drop into any website.",
    category: "Contact",
    icon: "✉️",
    estimatedTime: "1 min",
    tags: ["contact", "support", "enquiry"],
    settings: {
      ...DEFAULT_SETTINGS,
      thankYouTitle: "Message sent!",
      thankYouMessage: "We'll get back to you within one business day.",
    },
    questions: [
      {
        id: "q1",
        type: "short_text",
        title: "Your full name",
        required: true,
        placeholder: "Jane Smith",
      },
      {
        id: "q2",
        type: "email",
        title: "Your email address",
        required: true,
        placeholder: "jane@company.com",
      },
      {
        id: "q3",
        type: "dropdown",
        title: "What's this about?",
        required: true,
        options: [
          { id: "o1", label: "General enquiry" },
          { id: "o2", label: "Sales" },
          { id: "o3", label: "Technical support" },
          { id: "o4", label: "Billing" },
          { id: "o5", label: "Press / Media" },
        ],
      },
      {
        id: "q4",
        type: "long_text",
        title: "How can we help?",
        required: true,
        placeholder: "Describe your question or request...",
      },
    ],
  },

  // ── 2. NPS Survey ─────────────────────────────────────────────────────────
  {
    id: "tpl-nps",
    title: "Net Promoter Score (NPS)",
    description: "Industry-standard NPS survey to measure customer loyalty and likelihood to recommend.",
    category: "Feedback",
    icon: "📊",
    estimatedTime: "1 min",
    tags: ["nps", "loyalty", "customer"],
    settings: {
      ...DEFAULT_SETTINGS,
      thankYouTitle: "Thanks for the feedback!",
      thankYouMessage: "Your score helps us build a better product for everyone.",
    },
    questions: [
      {
        id: "q1",
        type: "rating",
        title: "How likely are you to recommend us to a friend or colleague?",
        description: "0 = Not at all likely · 10 = Extremely likely",
        required: true,
        maxRating: 10,
      },
      {
        id: "q2",
        type: "multiple_choice",
        title: "What's the primary reason for your score?",
        required: false,
        options: [
          { id: "o1", label: "Product quality" },
          { id: "o2", label: "Customer support" },
          { id: "o3", label: "Ease of use" },
          { id: "o4", label: "Value for money" },
          { id: "o5", label: "Something else" },
        ],
      },
      {
        id: "q3",
        type: "long_text",
        title: "What could we do to improve your experience?",
        required: false,
        placeholder: "Tell us anything...",
      },
    ],
  },

  // ── 3. Job Application ────────────────────────────────────────────────────
  {
    id: "tpl-job",
    title: "Job Application",
    description: "Collect applicant details, experience level, portfolio links, and cover letter in one elegant form.",
    category: "HR",
    icon: "💼",
    estimatedTime: "5 min",
    tags: ["hr", "hiring", "recruiting", "application"],
    settings: {
      ...DEFAULT_SETTINGS,
      thankYouTitle: "Application received!",
      thankYouMessage: "Our team will review your application within 5 business days.",
    },
    questions: [
      {
        id: "q1",
        type: "short_text",
        title: "Full name",
        required: true,
        placeholder: "Your full name",
      },
      {
        id: "q2",
        type: "email",
        title: "Email address",
        required: true,
        placeholder: "you@email.com",
      },
      {
        id: "q3",
        type: "short_text",
        title: "LinkedIn or portfolio URL",
        required: false,
        placeholder: "https://linkedin.com/in/yourname",
      },
      {
        id: "q4",
        type: "multiple_choice",
        title: "Years of relevant experience",
        required: true,
        options: [
          { id: "o1", label: "Less than 1 year" },
          { id: "o2", label: "1–3 years" },
          { id: "o3", label: "3–5 years" },
          { id: "o4", label: "5–10 years" },
          { id: "o5", label: "10+ years" },
        ],
      },
      {
        id: "q5",
        type: "multiple_choice",
        title: "What type of role are you applying for?",
        required: true,
        options: [
          { id: "o1", label: "Full-time" },
          { id: "o2", label: "Part-time" },
          { id: "o3", label: "Contract / Freelance" },
          { id: "o4", label: "Internship" },
        ],
      },
      {
        id: "q6",
        type: "long_text",
        title: "Why do you want this role?",
        description: "Tell us what excites you about this opportunity.",
        required: true,
        placeholder: "Share your motivation...",
      },
      {
        id: "q7",
        type: "yes_no",
        title: "Are you eligible to work in the country of employment?",
        required: true,
      },
    ],
  },

  // ── 4. Event RSVP ─────────────────────────────────────────────────────────
  {
    id: "tpl-rsvp",
    title: "Event RSVP",
    description: "Capture attendee RSVPs, dietary requirements, and session preferences for any event.",
    category: "Events",
    icon: "🎟️",
    estimatedTime: "2 min",
    tags: ["event", "rsvp", "attendance"],
    settings: {
      ...DEFAULT_SETTINGS,
      thankYouTitle: "You're on the list!",
      thankYouMessage: "We'll send a confirmation email with all the details closer to the event.",
    },
    questions: [
      {
        id: "q1",
        type: "short_text",
        title: "Full name",
        required: true,
        placeholder: "Your name",
      },
      {
        id: "q2",
        type: "email",
        title: "Email address",
        required: true,
        placeholder: "you@email.com",
      },
      {
        id: "q3",
        type: "yes_no",
        title: "Will you be attending?",
        required: true,
      },
      {
        id: "q4",
        type: "number",
        title: "How many guests are you bringing?",
        description: "Including yourself",
        required: false,
        placeholder: "1",
      },
      {
        id: "q5",
        type: "multiple_choice",
        title: "Dietary requirements",
        required: false,
        allowMultiple: true,
        options: [
          { id: "o1", label: "None" },
          { id: "o2", label: "Vegetarian" },
          { id: "o3", label: "Vegan" },
          { id: "o4", label: "Gluten-free" },
          { id: "o5", label: "Halal" },
          { id: "o6", label: "Kosher" },
        ],
      },
      {
        id: "q6",
        type: "long_text",
        title: "Anything else we should know?",
        required: false,
        placeholder: "Accessibility needs, questions, notes...",
      },
    ],
  },

  // ── 5. Product Feedback ───────────────────────────────────────────────────
  {
    id: "tpl-product-feedback",
    title: "Product Feedback",
    description: "Structured feedback on your product's usability, features, and overall satisfaction.",
    category: "Feedback",
    icon: "🚀",
    estimatedTime: "3 min",
    tags: ["product", "feedback", "ux", "survey"],
    settings: {
      ...DEFAULT_SETTINGS,
      thankYouTitle: "Feedback received!",
      thankYouMessage: "Every response shapes our roadmap. Thank you!",
    },
    questions: [
      {
        id: "q1",
        type: "rating",
        title: "How easy is it to use our product?",
        description: "1 = Very difficult · 5 = Very easy",
        required: true,
        maxRating: 5,
      },
      {
        id: "q2",
        type: "rating",
        title: "How satisfied are you overall?",
        required: true,
        maxRating: 5,
      },
      {
        id: "q3",
        type: "multiple_choice",
        title: "Which features do you use most?",
        required: false,
        allowMultiple: true,
        options: [
          { id: "o1", label: "Dashboard / Analytics" },
          { id: "o2", label: "Form builder" },
          { id: "o3", label: "Integrations" },
          { id: "o4", label: "AI suggestions" },
          { id: "o5", label: "Custom branding" },
        ],
      },
      {
        id: "q4",
        type: "long_text",
        title: "What's your biggest pain point?",
        required: false,
        placeholder: "Be honest — it helps!",
      },
      {
        id: "q5",
        type: "yes_no",
        title: "Would you recommend this product to others?",
        required: true,
      },
    ],
  },

  // ── 6. Customer Onboarding ────────────────────────────────────────────────
  {
    id: "tpl-onboarding",
    title: "Customer Onboarding",
    description: "Understand your new customers' goals, use cases, and technical setup on day one.",
    category: "Lead Gen",
    icon: "👋",
    estimatedTime: "3 min",
    tags: ["onboarding", "welcome", "setup", "saas"],
    settings: {
      ...DEFAULT_SETTINGS,
      thankYouTitle: "Welcome aboard!",
      thankYouMessage: "Your account is being set up. You'll hear from your onboarding manager soon.",
    },
    questions: [
      {
        id: "q1",
        type: "short_text",
        title: "What's your name?",
        required: true,
        placeholder: "First name",
      },
      {
        id: "q2",
        type: "short_text",
        title: "What's the name of your company?",
        required: false,
        placeholder: "Acme Inc.",
      },
      {
        id: "q3",
        type: "multiple_choice",
        title: "What's your primary goal?",
        required: true,
        options: [
          { id: "o1", label: "Collect customer feedback" },
          { id: "o2", label: "Generate leads" },
          { id: "o3", label: "Run surveys & research" },
          { id: "o4", label: "Streamline HR processes" },
          { id: "o5", label: "Something else" },
        ],
      },
      {
        id: "q4",
        type: "multiple_choice",
        title: "How large is your team?",
        required: false,
        options: [
          { id: "o1", label: "Just me" },
          { id: "o2", label: "2–10" },
          { id: "o3", label: "11–50" },
          { id: "o4", label: "51–200" },
          { id: "o5", label: "200+" },
        ],
      },
      {
        id: "q5",
        type: "yes_no",
        title: "Have you used a form tool before?",
        required: false,
      },
    ],
  },

  // ── 7. Employee Satisfaction ──────────────────────────────────────────────
  {
    id: "tpl-employee-satisfaction",
    title: "Employee Satisfaction",
    description: "Pulse survey to gauge team morale, wellbeing, and workplace satisfaction.",
    category: "HR",
    icon: "🏢",
    estimatedTime: "4 min",
    tags: ["hr", "employee", "culture", "pulse", "morale"],
    settings: {
      ...DEFAULT_SETTINGS,
      thankYouTitle: "Thanks for sharing!",
      thankYouMessage: "Your responses are anonymous and help us improve our workplace.",
    },
    questions: [
      {
        id: "q1",
        type: "rating",
        title: "How happy are you at work right now?",
        description: "1 = Very unhappy · 5 = Very happy",
        required: true,
        maxRating: 5,
      },
      {
        id: "q2",
        type: "multiple_choice",
        title: "Which area could be improved the most?",
        required: false,
        options: [
          { id: "o1", label: "Team communication" },
          { id: "o2", label: "Work-life balance" },
          { id: "o3", label: "Career growth" },
          { id: "o4", label: "Management & leadership" },
          { id: "o5", label: "Tools & processes" },
          { id: "o6", label: "Compensation & benefits" },
        ],
      },
      {
        id: "q3",
        type: "yes_no",
        title: "Do you feel recognised for your contributions?",
        required: true,
      },
      {
        id: "q4",
        type: "rating",
        title: "How would you rate the overall company culture?",
        required: true,
        maxRating: 5,
      },
      {
        id: "q5",
        type: "long_text",
        title: "What's one thing we should start, stop, or continue doing?",
        required: false,
        placeholder: "Your honest thoughts...",
      },
    ],
  },

  // ── 8. Lead Generation ────────────────────────────────────────────────────
  {
    id: "tpl-lead-gen",
    title: "Lead Generation",
    description: "Qualify inbound leads by capturing their details, budget, and timeline before a sales call.",
    category: "Lead Gen",
    icon: "🎯",
    estimatedTime: "3 min",
    tags: ["leads", "sales", "qualify", "pipeline"],
    settings: {
      ...DEFAULT_SETTINGS,
      thankYouTitle: "Got it — thanks!",
      thankYouMessage: "A member of our team will reach out within 24 hours.",
    },
    questions: [
      {
        id: "q1",
        type: "short_text",
        title: "Your full name",
        required: true,
        placeholder: "Jane Smith",
      },
      {
        id: "q2",
        type: "email",
        title: "Work email",
        required: true,
        placeholder: "jane@company.com",
      },
      {
        id: "q3",
        type: "short_text",
        title: "Company name",
        required: true,
        placeholder: "Acme Corp",
      },
      {
        id: "q4",
        type: "multiple_choice",
        title: "What's your estimated monthly budget?",
        required: false,
        options: [
          { id: "o1", label: "Under £500" },
          { id: "o2", label: "£500 – £2,000" },
          { id: "o3", label: "£2,000 – £10,000" },
          { id: "o4", label: "£10,000+" },
          { id: "o5", label: "Not sure yet" },
        ],
      },
      {
        id: "q5",
        type: "multiple_choice",
        title: "When are you looking to get started?",
        required: true,
        options: [
          { id: "o1", label: "Immediately" },
          { id: "o2", label: "Within a month" },
          { id: "o3", label: "1–3 months" },
          { id: "o4", label: "Just exploring" },
        ],
      },
      {
        id: "q6",
        type: "long_text",
        title: "Tell us about your project",
        required: false,
        placeholder: "What are you trying to achieve?",
      },
    ],
  },

  // ── 9. Market Research Survey ─────────────────────────────────────────────
  {
    id: "tpl-market-research",
    title: "Market Research Survey",
    description: "Understand your target audience's behaviours, preferences, and pain points.",
    category: "Research",
    icon: "🔍",
    estimatedTime: "5 min",
    tags: ["research", "market", "audience", "insights"],
    settings: {
      ...DEFAULT_SETTINGS,
      thankYouTitle: "Survey complete!",
      thankYouMessage: "Your insights are incredibly valuable. Thank you for your time.",
    },
    questions: [
      {
        id: "q1",
        type: "multiple_choice",
        title: "Which best describes you?",
        required: true,
        options: [
          { id: "o1", label: "Freelancer / Solopreneur" },
          { id: "o2", label: "Startup (< 10 employees)" },
          { id: "o3", label: "SME (10–200 employees)" },
          { id: "o4", label: "Enterprise (200+ employees)" },
          { id: "o5", label: "Non-profit / Education" },
        ],
      },
      {
        id: "q2",
        type: "multiple_choice",
        title: "Which tools do you currently use to collect data?",
        required: false,
        allowMultiple: true,
        options: [
          { id: "o1", label: "Google Forms" },
          { id: "o2", label: "Typeform" },
          { id: "o3", label: "SurveyMonkey" },
          { id: "o4", label: "Airtable" },
          { id: "o5", label: "None" },
          { id: "o6", label: "Other" },
        ],
      },
      {
        id: "q3",
        type: "rating",
        title: "How satisfied are you with your current tool?",
        required: true,
        maxRating: 5,
      },
      {
        id: "q4",
        type: "long_text",
        title: "What's the biggest frustration with your current solution?",
        required: false,
        placeholder: "Be specific...",
      },
      {
        id: "q5",
        type: "multiple_choice",
        title: "Which features matter most to you?",
        required: false,
        allowMultiple: true,
        options: [
          { id: "o1", label: "Beautiful design" },
          { id: "o2", label: "AI capabilities" },
          { id: "o3", label: "Analytics & reporting" },
          { id: "o4", label: "Integrations" },
          { id: "o5", label: "Low cost" },
          { id: "o6", label: "Ease of use" },
        ],
      },
    ],
  },

  // ── 10. Event Post-Feedback ───────────────────────────────────────────────
  {
    id: "tpl-post-event",
    title: "Post-Event Feedback",
    description: "Gather attendee ratings and insights right after an event to improve future ones.",
    category: "Events",
    icon: "🎤",
    estimatedTime: "2 min",
    tags: ["event", "feedback", "post-event", "conference"],
    settings: {
      ...DEFAULT_SETTINGS,
      thankYouTitle: "Thanks for attending!",
      thankYouMessage: "Your feedback makes our next event even better. See you there!",
    },
    questions: [
      {
        id: "q1",
        type: "rating",
        title: "How would you rate the event overall?",
        description: "1 = Poor · 5 = Outstanding",
        required: true,
        maxRating: 5,
      },
      {
        id: "q2",
        type: "rating",
        title: "How would you rate the content and speakers?",
        required: true,
        maxRating: 5,
      },
      {
        id: "q3",
        type: "multiple_choice",
        title: "Which session did you find most valuable?",
        required: false,
        options: [
          { id: "o1", label: "Opening keynote" },
          { id: "o2", label: "Workshop sessions" },
          { id: "o3", label: "Panel discussion" },
          { id: "o4", label: "Networking breaks" },
          { id: "o5", label: "Closing remarks" },
        ],
      },
      {
        id: "q4",
        type: "yes_no",
        title: "Would you attend this event again next year?",
        required: true,
      },
      {
        id: "q5",
        type: "long_text",
        title: "What should we change or improve?",
        required: false,
        placeholder: "Your honest feedback...",
      },
    ],
  },
];
