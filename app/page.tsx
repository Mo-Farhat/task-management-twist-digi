import { Link } from "@heroui/link";
import { button as buttonStyles } from "@heroui/theme";

import { title, subtitle } from "@/components/primitives";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-6 py-24 md:py-32 lg:py-40">
      <div className="inline-block max-w-2xl text-center">
        <h1>
          <span className={title({ size: "lg" })}>Organize. </span>
          <span className={title({ size: "lg", color: "violet" })}>Prioritize. </span>
          <span className={title({ size: "lg" })}>Execute.</span>
        </h1>
        <p className={subtitle({ class: "mt-6 max-w-lg mx-auto" })}>
          A secure task management system with AI-powered meeting notes
          extraction. Built for developers who ship.
        </p>
      </div>

      <div className="flex gap-4 mt-4">
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
          className={buttonStyles({
            variant: "bordered",
            radius: "full",
            size: "lg",
          })}
          href="/login"
        >
          Sign In
        </Link>
      </div>

      <p className="text-default-400 text-xs mt-8 tracking-wide uppercase">
        Next.js &middot; Prisma &middot; NeonDB &middot; Groq AI
      </p>
    </section>
  );
}
