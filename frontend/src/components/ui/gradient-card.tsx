import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "relative flex flex-col justify-between h-full w-full overflow-hidden rounded-2xl p-8 shadow-sm transition-shadow duration-300 hover:shadow-lg border border-white/5",
  {
    variants: {
      gradient: {
        orange:  "bg-gradient-to-br from-orange-950  to-amber-900/60",
        slate:   "bg-gradient-to-br from-slate-900   to-slate-800/60",
        purple:  "bg-gradient-to-br from-purple-950  to-indigo-900/60",
        green:   "bg-gradient-to-br from-emerald-950 to-teal-900/60",
        indigo:  "bg-gradient-to-br from-indigo-950  to-violet-900/60",
        cyan:    "bg-gradient-to-br from-cyan-950    to-blue-900/60",
        rose:    "bg-gradient-to-br from-rose-950    to-pink-900/60",
      },
    },
    defaultVariants: {
      gradient: "slate",
    },
  }
);

export interface GradientCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  badgeText: string;
  badgeColor: string;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  imageUrl: string;
}

const GradientCard = React.forwardRef<HTMLDivElement, GradientCardProps>(
  (
    { className, gradient, badgeText, badgeColor, title, description, ctaText, ctaHref, imageUrl, ...props },
    ref
  ) => {
    const cardAnimation = {
      rest:  { scale: 1,    y: 0  },
      hover: { scale: 1.03, y: -4 },
    };

    const imageAnimation = {
      rest:  { scale: 1,   rotate: 0 },
      hover: { scale: 1.1, rotate: 3 },
    };

    return (
      <motion.div
        variants={cardAnimation}
        initial="rest"
        whileHover="hover"
        animate="rest"
        className="h-full"
        ref={ref}
      >
        <div className={cn(cardVariants({ gradient }), className)} {...props}>
          {/* Decorative corner image */}
          <motion.img
            src={imageUrl}
            alt={`${title} graphic`}
            variants={imageAnimation}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="absolute -right-1/4 -bottom-1/4 w-3/4 opacity-20 pointer-events-none select-none"
          />

          {/* Content */}
          <div className="z-10 flex flex-col h-full">
            {/* Badge */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/80 backdrop-blur-sm w-fit">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: badgeColor }} />
              {badgeText}
            </div>

            {/* Title + description */}
            <div className="flex-grow">
              <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
              <p className="text-white/60 max-w-xs text-sm leading-relaxed">{description}</p>
            </div>

            {/* CTA */}
            <a
              href={ctaHref}
              className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition-colors"
            >
              {ctaText}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </motion.div>
    );
  }
);

GradientCard.displayName = "GradientCard";

export { GradientCard, cardVariants };
