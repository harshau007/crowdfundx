"use client";
import { getContract } from "@/lib/contract";
import type React from "react";

import { ethers } from "ethers";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Target, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Input } from "./ui/input";

interface CampaignProps {
  campaignId: number;
  title: string;
  description: string;
  creator: string;
  goal: string;
  deadline: number;
  totalFunds: string;
  status: number;
}

const CampaignCard: React.FC<CampaignProps> = ({
  campaignId,
  title,
  description,
  creator,
  goal,
  deadline,
  totalFunds,
  status,
}) => {
  const router = useRouter();
  const [contribution, setContribution] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [mediaHash, setMediaHash] = useState<string[]>([]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const contract = await getContract();
        const { mediaHashes } = await contract.getCampaign(Number(campaignId));
        setMediaHash(mediaHashes);
      } catch (error) {
        console.error("Error fetching images from Pinata:", error);
      }
    };

    fetchImages();
  }, [campaignId]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const isInteractive =
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLButtonElement;
    if (!isInteractive) {
      router.push(`/campaign/${campaignId}`);
    }
  };

  const contribute = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!contribution || Number(contribution) <= 0) {
      toast.error(
        "Please enter a valid contribution amount greater than 0.",
        {}
      );
      return;
    }
    setLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.contribute(campaignId, {
        value: ethers.parseEther(contribution),
      });
      await tx.wait();
      toast.success("Contribution Successful", {});
      setContribution("");
    } catch (error) {
      console.error("Error contributing:", error);
      toast.error("Failed to contribute", {});
    } finally {
      setLoading(false);
    }
  };

  const progress = Math.min((Number(totalFunds) / Number(goal)) * 100, 100);
  const statusText =
    status === 0
      ? "Active"
      : status === 1
      ? "Completed"
      : status === 2
      ? "Failed"
      : "Refunded";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        className="w-full bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer group"
        onClick={handleClick}
      >
        <CardHeader className="p-0">
          <div className="relative h-48 overflow-hidden">
            <img
              src={
                mediaHash.length > 0
                  ? `https://gateway.pinata.cloud/ipfs/${mediaHash[0]}`
                  : `https://picsum.photos/seed/picsum/200/300`
              }
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-70"></div>
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-xl font-bold text-white font-geist truncate">
                {title}
              </h2>
              <p className="text-sm text-gray-300 font-roboto-mono mt-1 truncate">
                {description}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-center text-gray-300 text-sm">
            <div className="flex items-center">
              <Target className="w-4 h-4 mr-2" />
              <span>{ethers.formatEther(BigInt(goal))} ETH</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span>{new Date(deadline * 1000).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              <span>{statusText}</span>
            </div>
          </div>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-teal-600 bg-teal-200">
                  {progress.toFixed(0)}% Funded
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-teal-600">
                  {ethers.formatEther(BigInt(totalFunds))} /{" "}
                  {ethers.formatEther(BigInt(goal))} ETH
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-teal-200">
              <motion.div
                style={{ width: `${progress}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-teal-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              ></motion.div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 bg-gray-900">
          {status === 0 && (
            <form
              onSubmit={contribute}
              onClick={(e) => e.stopPropagation()}
              className="w-full flex space-x-2"
            >
              <Input
                type="number"
                step="0.1"
                value={contribution}
                min={0}
                onChange={(e) => {
                  const inputValue = Number.parseFloat(e.target.value);
                  if (inputValue >= 0 || e.target.value === "") {
                    setContribution(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") {
                    e.preventDefault();
                  }
                }}
                placeholder="Enter ETH amount"
                className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500"
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
              >
                {loading ? "Contributing..." : "Contribute"}
              </Button>
            </form>
          )}
          {status !== 0 && (
            <Button
              onClick={() => router.push(`/campaign/${campaignId}`)}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200 flex items-center justify-center"
            >
              View Details <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default CampaignCard;
