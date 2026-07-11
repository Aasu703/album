import Link from "next/link";

export const metadata = {
  title: "Painting Marketplace — Buy and sell original art",
  description: "Discover original paintings from independent artists. Buy at a fixed price or bid in a live auction.",
};

/** Marketing landing page for logged-out and logged-in visitors. */
export default function Home() {
  return (
    <div style={{ position: "relative", minHeight: "100vh", backgroundColor: "#0A0A0A" }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          width: "100%",
          padding: "0 24px",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(2.5rem, 6vw, 4rem)",
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
            margin: "0 0 12px",
            lineHeight: 1.1,
          }}
        >
          Original paintings,
          <br />
          bought and sold directly
        </h1>

        <p
          style={{
            fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
            color: "rgba(255,255,255,0.55)",
            maxWidth: "440px",
            margin: "0 auto 32px",
            lineHeight: 1.6,
          }}
        >
          Browse fixed-price listings or bid in a live auction. Artists get paid directly through Stripe.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Link
            href="/register"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              padding: "12px 28px",
              borderRadius: "50px",
              fontSize: "15px",
              backdropFilter: "blur(8px)",
              textDecoration: "none",
            }}
          >
            Get started
          </Link>

          <Link
            href="/login"
            style={{
              background: "#FFFFFF",
              color: "#0A0A0A",
              padding: "12px 28px",
              borderRadius: "50px",
              fontSize: "15px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
