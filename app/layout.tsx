/**
 * app/layout.tsx
 *
 * Minimal root layout required by Next.js App Router.
 * This project is backend-only, so this file stays empty.
 */

export const metadata = {
  title: "SD Beauty Hub – Backend",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
