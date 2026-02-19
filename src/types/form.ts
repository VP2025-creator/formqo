export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "rating"
  | "email"
  | "yes_no"
  | "number"
  | "date"
  | "dropdown";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  options?: QuestionOption[];   // multiple_choice, dropdown
  maxRating?: number;           // rating (default 5)
  allowMultiple?: boolean;      // multiple_choice
}

export interface FormSettings {
  primaryColor: string;
  showBranding: boolean;        // "Powered by Formqo" on free plan
  redirectUrl?: string;
  thankYouTitle?: string;
  thankYouMessage?: string;
  closeAfterSubmit?: boolean;
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
