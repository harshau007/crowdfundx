"use client";
import { getContract } from "@/lib/contract";
import type React from "react";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import CampaignCard from "./CampaignCard";

interface Campaign {
  campaignId: number;
  creator: string;
  title: string;
  description: string;
  goal: string;
  deadline: number;
  totalFunds: string;
  status: number;
  mediaHashes: string[];
}

const CampaignList: React.FC = () => {
  const [ongoingCampaigns, setOngoingCampaigns] = useState<Campaign[]>([]);
  const [pastCampaigns, setPastCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const contract = await getContract();
      const campaignCount = Number(await contract.campaignCount());
      const ongoing: Campaign[] = [];
      const past: Campaign[] = [];

      for (let i = 0; i < campaignCount; i++) {
        const campaign = await contract.getCampaign(i);
        const campaignData: Campaign = {
          campaignId: i,
          creator: campaign[0],
          title: campaign[1],
          description: campaign[2],
          goal: campaign[3].toString(),
          deadline: Number(campaign[4]),
          totalFunds: campaign[5].toString(),
          status: Number(campaign[6]),
          mediaHashes: campaign[8],
        };

        if (campaignData.status === 0) {
          ongoing.push(campaignData);
        } else {
          past.push(campaignData);
        }
      }

      setOngoingCampaigns(ongoing);
      setPastCampaigns(past);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const setupEventListeners = async () => {
      const contract = await getContract();
      contract.on(
        "CampaignStatusUpdated",
        (campaignId: number, newStatus: number) => {
          fetchData();
        }
      );
      contract.on(
        "Contributed",
        (campaignId: number, contributor: string, amount: string) => {
          fetchData();
        }
      );
    };

    setupEventListeners();

    const pollingInterval = setInterval(fetchData, 5000);

    return () => clearInterval(pollingInterval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <div className="p-4 space-y-8">
      <section>
        <h2 className="text-3xl font-bold text-white font-geist mb-6 relative">
          Ongoing Campaigns
          <span className="absolute bottom-0 left-0 w-20 h-1 bg-teal-500"></span>
        </h2>
        {ongoingCampaigns.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {ongoingCampaigns.map((campaign) => (
              <motion.div key={campaign.campaignId} variants={itemVariants}>
                <CampaignCard {...campaign} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <p className="text-center text-gray-400 font-geist text-lg">
            No ongoing campaigns found.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-3xl font-bold text-white font-geist mb-6 relative">
          Past Campaigns
          <span className="absolute bottom-0 left-0 w-20 h-1 bg-teal-500"></span>
        </h2>
        {pastCampaigns.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {pastCampaigns.map((campaign) => (
              <motion.div key={campaign.campaignId} variants={itemVariants}>
                <CampaignCard {...campaign} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <p className="text-center text-gray-400 font-geist text-lg">
            No past campaigns found.
          </p>
        )}
      </section>
    </div>
  );
};

export default CampaignList;
