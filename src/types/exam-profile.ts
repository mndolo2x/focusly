export type QuestionType = "multiple_choice" | "short_answer" | "structured_response" | "essay";

export type ExamSection = {
  name: string;
  question_types: QuestionType[];
  number_of_questions: number | null;
  time_minutes: number | null;
  marks_available: number | null;
  style_notes: string;
};

export type ExamProfileStatus = "draft" | "reviewed" | "published";

export type ExamProfile = {
  id: string;
  exam_name: string;
  board: string;
  subject: string | null;
  level: string;
  overall_duration_minutes: number | null;
  total_marks: number | null;
  sections: ExamSection[];
  style_notes_general: string | null;
  sources: string[];
  confidence_flags: string[];
  status: ExamProfileStatus;
  created_at: string;
  updated_at: string;
};

export type CreateExamProfileRequest = {
  exam_name: string;
  exam_input: string; // Either exam name or base64 encoded PDF
  is_pdf_upload: boolean;
};

export type CreateExamProfileResponse = {
  profile: ExamProfile;
  success: boolean;
  message?: string;
};
