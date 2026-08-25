import { FaqForm } from "@/components/admin/FaqForm";

export const dynamic = "force-dynamic";

export default function NewFaqPage() {
  return (
    <FaqForm
      initial={{
        slug: "",
        category: "about",
        display_order: 0,
        status: "draft",
        question_en: "",
        answer_en: "",
        question_hi: "",
        answer_hi: "",
        question_mr: "",
        answer_mr: "",
      }}
    />
  );
}
