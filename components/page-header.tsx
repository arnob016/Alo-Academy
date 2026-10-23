import { container } from "./ui";

export function PageHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <div className="border-b border-brand/10 bg-gradient-to-b from-accent/15 to-transparent">
      <div className={`${container} py-12 sm:py-16`}>
        <h1 className="text-3xl font-semibold text-brand sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{intro}</p>
      </div>
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  id,
}: {
  title: string;
  subtitle?: string;
  id?: string;
}) {
  return (
    <div className="max-w-2xl">
      <h2 id={id} className="text-2xl font-semibold text-brand sm:text-3xl">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-muted">{subtitle}</p>}
    </div>
  );
}
