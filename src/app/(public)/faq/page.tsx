import Link from "next/link";

export default function FAQPage() {
  const faqs = [
    {
      q: "What languages does Bhasha Setu support?",
      a: "Bhasha Setu currently supports Warli and Katkari languages, with plans to expand to additional indigenous languages.",
    },
    {
      q: "Is the app free to use?",
      a: "Yes, Bhasha Setu is completely free. We believe language learning and cultural preservation should be accessible to everyone.",
    },
    {
      q: "Can I use Bhasha Setu on my mobile phone?",
      a: "Yes! Bhasha Setu works on both web browsers and mobile devices. We also have an Android app available.",
    },
    {
      q: "How can I contribute to the project?",
      a: "We welcome contributions! You can help by sharing your knowledge of the language, recording pronunciations, or providing feedback.",
    },
    {
      q: "Is my data private and secure?",
      a: "Yes, we prioritize your privacy. Your learning data is stored securely and never shared with third parties.",
    },
  ];

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1>Frequently Asked Questions</h1>
      <p>Find answers to common questions about Bhasha Setu.</p>

      <section style={{ margin: "30px 0" }}>
        {faqs.map((faq, idx) => (
          <div key={idx} style={{ marginBottom: "20px" }}>
            <h3 style={{ color: "#1f2937", marginBottom: "8px" }}>{faq.q}</h3>
            <p style={{ color: "#4b5563", lineHeight: "1.6" }}>{faq.a}</p>
          </div>
        ))}
      </section>

      <section style={{ margin: "30px 0", padding: "20px", backgroundColor: "#f0f8ff", borderRadius: "8px" }}>
        <h2>Still have questions?</h2>
        <p>
          <Link href="/">Contact us</Link> or reach out through our social channels.
        </p>
      </section>

      <p>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
