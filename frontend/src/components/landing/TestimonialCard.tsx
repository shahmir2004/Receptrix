import { Star } from 'lucide-react';

interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
  company: string;
}

export default function TestimonialCard({ quote, name, role, company }: TestimonialCardProps) {
  return (
    <article
      className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6
                 hover:border-white/[0.10] hover:bg-[#111]
                 transition-all duration-200 cursor-default"
    >
      {/* Stars */}
      <div className="flex gap-0.5 mb-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className="w-3.5 h-3.5 fill-indigo-400 text-indigo-400" />
        ))}
      </div>

      {/* Quote */}
      <blockquote className="text-white/60 text-sm leading-relaxed mb-6">
        &ldquo;{quote}&rdquo;
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3 pt-5 border-t border-white/[0.05]">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/25 to-indigo-500/25
                        border border-white/[0.08] flex items-center justify-center
                        text-xs font-semibold text-white shrink-0">
          {name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold text-white/90 leading-tight">{name}</p>
          <p className="text-xs text-white/35 mt-0.5">
            {role} &middot; {company}
          </p>
        </div>
      </div>
    </article>
  );
}
