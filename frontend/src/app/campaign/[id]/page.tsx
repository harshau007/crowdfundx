"use client";
import CampaignDetails from "@/components/CampaignDetails";
import { motion } from "framer-motion";

export default function CampaignPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <CampaignDetails />
    </motion.div>
  );
}
