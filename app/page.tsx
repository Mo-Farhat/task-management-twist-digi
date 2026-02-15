import { Link } from "@heroui/link";
import { button as buttonStyles } from "@heroui/theme";

import { title, subtitle } from "@/components/primitives";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center">
        <span className={title()}>Manage your tasks&nbsp;</span>
        <span className={title({ color: "violet" })}>securely&nbsp;</span>
        <br />
        <span className={title()}>with AI-powered insights.</span>
        <div className={subtitle({ class: "mt-4" })}>
          A full-stack task management system with smart meeting notes extraction.
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          className={buttonStyles({
            color: "primary",
            radius: "full",
            variant: "shadow",
            size: "lg",
          })}
          href="/register"
        >
          Get Started
        </Link>
        <Link
          className={buttonStyles({ variant: "bordered", radius: "full", size: "lg" })}
          href="/login"
        >
          Sign In
        </Link>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-default-50 border border-default-200">
          <div className="bg-primary/10 rounded-full p-3 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-primary">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Secure by Design</h3>
          <p className="text-default-500 text-sm">JWT auth with HttpOnly cookies, bcrypt password hashing, and rate limiting.</p>
        </div>

        <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-default-50 border border-default-200">
          <div className="bg-secondary/10 rounded-full p-3 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-secondary">
              <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Full Task CRUD</h3>
          <p className="text-default-500 text-sm">Create, edit, delete, and organize tasks with priorities and deadlines.</p>
        </div>

        <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-default-50 border border-default-200">
          <div className="bg-warning/10 rounded-full p-3 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-warning">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">AI Meeting Notes</h3>
          <p className="text-default-500 text-sm">Paste meeting transcripts and let AI extract action items as tasks.</p>
        </div>
      </div>
    </section>
  );
}
