"use client";

/**
 * Last-resort boundary: catches a failure in the root layout itself, where
 * the normal error page can't render because the layout it lives in is the
 * thing that broke. It has to supply its own <html> and <body>, and can't
 * rely on the app's CSS variables loading, so the styling here is inline
 * and deliberately plain.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          background: "#ffffff",
          color: "#171717",
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>House OS hit a problem</h1>
          <p style={{ margin: "0 0 1rem", lineHeight: 1.6, color: "#525252" }}>
            The app failed to start up properly. Reloading usually fixes it.
          </p>
          <button
            onClick={reset}
            style={{
              font: "inherit",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #171717",
              background: "#171717",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {error.digest ? (
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#737373" }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
