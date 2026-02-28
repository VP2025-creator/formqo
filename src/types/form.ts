export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "rating"
  | "email"
  | "yes_no"
  | "number"
  | "date"
  | "dropdown"
  | "phone"
  | "website"
  | "address"
  | "checkbox"
  | "legal"
  | "opinion_scale"
  | "nps"
  | "ranking"
  | "picture_choice";

export interface QuestionOption {
  id: string;
  label: string;
  imageUrl?: string; // picture_choice
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  options?: QuestionOption[];   // multiple_choice, dropdown, checkbox, picture_choice, ranking
  maxRating?: number;           // rating (default 5)
  allowMultiple?: boolean;      // multiple_choice, checkbox, picture_choice
  scaleMax?: number;            // opinion_scale, nps
  scaleLabels?: { start?: string; end?: string }; // opinion_scale, nps
}

export interface WelcomeScreen {
  enabled: boolean;
  title?: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;            // YouTube / Vimeo embed URL
  buttonText?: string;
}

export interface FormSettings {
  primaryColor: string;
  showBranding: boolean;        // "Powered by Formqo" on free plan
  redirectUrl?: string;
  thankYouTitle?: string;
  thankYouMessage?: string;
  closeAfterSubmit?: boolean;
  welcomeScreen?: WelcomeScreen;
}

export interface Form {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  settings: FormSettings;
  status: "draft" | "active" | "closed";
  createdAt: string;
  updatedAt: string;
  responses?: number;
  views?: number;
  completionRate?: number;
}

export interface FormResponse {
  questionId: string;
  value: string | string[] | number;
}
