import { useTranslation } from "@/data/translations";

/** Encart FAQ discret affiché sous le bloc graphique de la page Comparer. */
export function CompareFaq() {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="compare-faq-title"
      className="mx-auto !rounded-lg !border !border-gray-200 !bg-gray-50 px-4 py-3 font-sans"
      style={{ width: "700px", maxWidth: "100%" }}
    >
      <h2 id="compare-faq-title" className="!text-sm !font-semibold !text-gray-800">
        {t("compare.faq.question")}
      </h2>
      <p className="mt-2 !text-xs !leading-relaxed !text-gray-600">{t("compare.faq.answer")}</p>
    </section>
  );
}

