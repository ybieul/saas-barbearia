"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const SectionLayout: React.FC<Props> = ({ children, className }) => (
  <motion.section
    className={cn("py-12 sm:py-16 md:py-20", className)}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5 }}
  >
    <div className="container mx-auto px-4">{children}</div>
  </motion.section>
);

export default SectionLayout;
