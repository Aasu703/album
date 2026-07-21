import ScrollReveal from "@/components/ScrollReveal";

const STEPS = [
  {
    emoji: "🖼️",
    title: "Browse the gallery",
    body: "Explore original paintings from independent artists, updated as new work is posted.",
  },
  {
    emoji: "❤️",
    title: "React & comment",
    body: "Leave a reaction or start a conversation on the pieces that move you.",
  },
  {
    emoji: "🎨",
    title: "Share your work",
    body: "Become a verified painter and upload your own pieces for collectors to discover.",
  },
];

const STATS = [
  { value: "Original", label: "Every piece, one of a kind" },
  { value: "Direct", label: "Straight from the artist" },
  { value: "Curated", label: "A gallery, reimagined" },
];

/** "About" narrative for the landing page: a short blurb, a stats row, and the
 *  three-step explainer of how the gallery works. */
export default function AboutSection() {
  return (
    <section
      id="about"
      className="relative z-[3] flex min-h-screen flex-col justify-center border-t border-hairline bg-background px-6 py-20"
    >
      <div className="mx-auto w-full max-w-5xl">
        <ScrollReveal>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-accent">About</p>
            <h2 className="mt-2 font-serif text-[clamp(2rem,4vw,3rem)] font-semibold tracking-tight text-foreground">
              A gallery, reimagined
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
              Album is a home for original art — a place where independent painters
              post their work and collectors react, comment, and follow along. No middlemen, no
              prints, just one-of-a-kind pieces shared directly by the people who made them.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STATS.map((stat, i) => (
            <ScrollReveal key={stat.value} delay={i * 80}>
              <div className="rounded-2xl border border-hairline bg-surface px-6 py-8 text-center">
                <p className="font-serif text-2xl font-semibold text-accent">{stat.value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.15em] text-muted">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <ScrollReveal key={step.title} delay={i * 100}>
              <div className="h-full rounded-3xl border border-hairline bg-surface p-8 transition-colors duration-300 ease-out hover:border-accent/50">
                <span className="text-4xl" aria-hidden="true">
                  {step.emoji}
                </span>
                <h3 className="mt-5 font-serif text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
