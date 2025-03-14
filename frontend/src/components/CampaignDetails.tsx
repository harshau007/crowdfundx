"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { connectWallet, getContract, getEscrowContract } from "@/lib/contract";
import AutoPlay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Copy,
  DollarSign,
  Info,
  Shield,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Slide, toast } from "react-toastify";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

// Define the Campaign type
interface Campaign {
  creator: string;
  title: string;
  description: string;
  goal: string;
  deadline: number;
  totalFunds: string;
  status: number;
  fundsReleased: boolean;
  mediaHashes: string[];
  escrow: string;
}

// Interface for Media component props
interface MediaProps {
  url: string;
}

// Define DynamicCarouselProps interface
interface DynamicCarouselProps {
  campaign: Campaign;
}

// Media Component: Typesafe with explicit props
const Media: React.FC<MediaProps> = ({ url }) => {
  const [isVideo, setIsVideo] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkMediaType = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(url, { method: "HEAD" });
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.startsWith("video/")) {
          setIsVideo(true);
        } else {
          setIsVideo(false);
        }
      } catch (error) {
        console.error("Error checking media type:", error);
        setIsVideo(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkMediaType();
  }, [url]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (isVideo && !videoError) {
    return (
      <video
        controls
        className="w-full h-full rounded-md object-cover"
        preload="metadata"
        onError={() => setVideoError(true)}
      >
        <source src={`${url}#t=0.1`} type="video/webm" />
        <source src={`${url}#t=0.1`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    );
  }

  if (videoError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-red-500">
        <p>Error loading video</p>
      </div>
    );
  }

  return (
    <img
      src={url || "/placeholder.svg"}
      alt="Campaign media"
      className="w-full h-full object-cover rounded-md"
      loading="lazy"
      onLoad={() => setIsLoading(false)}
    />
  );
};

// DynamicCarousel Component: Typesafe with explicit props and memoization
const DynamicCarousel: React.FC<DynamicCarouselProps> = ({ campaign }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    AutoPlay({
      delay: 4000,
      stopOnInteraction: false,
      stopOnMouseEnter: false,
      rootNode: (emblaRoot: any) => emblaRoot.parentElement,
    }),
  ]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [emblaApi]);

  // Handle case where there are no media items
  if (!campaign.mediaHashes || campaign.mediaHashes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-gray-900 rounded-xl shadow-lg">
        <p className="text-lg text-gray-400 font-roboto-mono">
          No media available
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {campaign.mediaHashes.map((hash: string) => {
            const mediaUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
            return (
              <div key={hash} className="flex-[0_0_100%] min-w-0 relative">
                <div className="flex items-center justify-center h-[500px] rounded-xl">
                  <Media url={mediaUrl} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {campaign.mediaHashes.map((hash, index) => {
          const mediaUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
          return (
            <div
              key={index}
              className="flex-[0_0_auto] w-[100px] h-[80px] cursor-pointer rounded-lg border-2 border-transparent hover:border-teal-500 transition-all duration-300 overflow-hidden"
              onClick={() => emblaApi?.scrollTo(index)}
            >
              <Media url={mediaUrl} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Main CampaignDetails Component
export default function CampaignDetails() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [escrowBalance, setEscrowBalance] = useState<string>("0");
  const [contributors, setContributors] = useState<string[]>([]);
  const [contributions, setContributions] = useState<string[]>([]);
  const [refunded, setRefunded] = useState<boolean[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [contribution, setContribution] = useState<string>("");
  const [contributeLoading, setContributeLoading] = useState<boolean>(false);
  const [refundLoading, setRefundLoading] = useState<boolean>(false);
  const [releaseLoading, setReleaseLoading] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const contract = await getContract();
      const [
        creator,
        title,
        description,
        goal,
        deadline,
        totalFunds,
        status,
        fundsReleased,
        mediaHashes,
        escrow,
      ] = await contract.getCampaign(Number(id));

      const fetchedContributors: string[] = await contract.getContributors(
        Number(id)
      );
      const fetchedContributions: string[] = await Promise.all(
        fetchedContributors.map(async (contributor: string) => {
          const contribution = await contract.getContribution(
            Number(id),
            contributor
          );
          return contribution.toString();
        })
      );
      const fetchedRefunded: boolean[] = await Promise.all(
        fetchedContributors.map(async (contributor: string) => {
          return await contract.isRefunded(Number(id), contributor);
        })
      );

      const escrowContract = await getEscrowContract(escrow);
      const balance = await escrowContract.getBalance();
      setEscrowBalance(ethers.formatEther(balance));

      setCampaign({
        creator,
        title,
        description,
        goal: goal.toString(),
        deadline: Number(deadline),
        totalFunds: totalFunds.toString(),
        status: Number(status),
        fundsReleased,
        mediaHashes,
        escrow,
      });
      setContributors(fetchedContributors);
      setContributions(fetchedContributions);
      setRefunded(fetchedRefunded);

      const storedAddress = localStorage.getItem("walletAddress");
      if (storedAddress) {
        setWalletAddress(storedAddress);
      } else {
        const address = await connectWallet();
        setWalletAddress(address);
        localStorage.setItem("walletAddress", address);
      }
    } catch (error) {
      console.error("Error fetching campaign details:", error);
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
        (campaignId: ethers.BigNumberish, newStatus: ethers.BigNumberish) => {
          if (Number(campaignId) === Number(id)) fetchData();
        }
      );
      contract.on(
        "Refunded",
        (
          campaignId: ethers.BigNumberish,
          contributor: string,
          amount: ethers.BigNumberish
        ) => {
          if (Number(campaignId) === Number(id)) fetchData();
        }
      );
      contract.on(
        "Contributed",
        (
          campaignId: ethers.BigNumberish,
          contributor: string,
          amount: ethers.BigNumberish
        ) => {
          if (Number(campaignId) === Number(id)) fetchData();
        }
      );
      contract.on(
        "FundsReleased",
        (
          campaignId: ethers.BigNumberish,
          creator: string,
          amount: ethers.BigNumberish
        ) => {
          if (Number(campaignId) === Number(id)) fetchData();
        }
      );
    };

    setupEventListeners();
    const pollingInterval = setInterval(fetchData, 5000);
    return () => clearInterval(pollingInterval);
  }, [id]);

  const contribute = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const contributionValue = Number(contribution);
    if (!contribution || isNaN(contributionValue) || contributionValue <= 0) {
      toast.error("Please enter a valid positive number for contribution.", {
        position: "bottom-right",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
        transition: Slide,
      });
      return;
    }
    setContributeLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.contribute(Number(id), {
        value: ethers.parseEther(contribution),
      });
      await tx.wait();
      toast.success("Contribution Successful", {
        position: "bottom-right",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
        transition: Slide,
      });
      setContribution("");
      await fetchData();
    } catch (error) {
      console.error("Error contributing:", error);
      toast.error("Failed to contribute", {
        position: "bottom-right",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
        transition: Slide,
      });
    } finally {
      setContributeLoading(false);
    }
  };

  const refund = async () => {
    setRefundLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.refund(Number(id), { gasLimit: 1000000 });
      await tx.wait();
      toast.success("Refund requested successfully!", {
        position: "bottom-right",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
        transition: Slide,
      });
      await fetchData();
    } catch (error: any) {
      console.error("Error refunding:", error);
      toast.error("Failed to refund: " + (error.reason || error.message), {
        position: "bottom-right",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
        transition: Slide,
      });
    } finally {
      setRefundLoading(false);
    }
  };

  const releaseFunds = async () => {
    setReleaseLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.releaseFunds(Number(id), { gasLimit: 1000000 });
      await tx.wait();
      toast.success("Funds released successfully", {
        position: "bottom-right",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
        transition: Slide,
      });
      await fetchData();
    } catch (error: any) {
      console.error("Error releasing funds:", error);
      toast.error(
        "Failed to release funds: " + (error.reason || error.message),
        {
          position: "bottom-right",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          theme: "dark",
          transition: Slide,
        }
      );
    } finally {
      setReleaseLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
    toast.success("Address copied to clipboard", {
      position: "bottom-right",
      autoClose: 1000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      theme: "dark",
      transition: Slide,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-500 mb-4"></div>
          <p className="text-lg">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="bg-gray-900 p-8 rounded-xl shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Campaign Not Found</h2>
          <p className="mb-6">
            The campaign you're looking for doesn't exist or has been removed.
          </p>
          <Button
            onClick={() => router.push("/")}
            className="bg-teal-500 hover:bg-teal-600 text-white"
          >
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const progress = Math.min(
    (Number(campaign.totalFunds) / Number(campaign.goal)) * 100,
    100
  );

  const statusText =
    campaign.status === 0
      ? "Active"
      : campaign.status === 1
      ? "Completed"
      : campaign.status === 2
      ? "Failed"
      : "Refunded";

  const statusColor =
    campaign.status === 0
      ? "bg-teal-500"
      : campaign.status === 1
      ? "bg-gray-600"
      : "bg-gray-700";

  const canRelease =
    campaign.status === 1 &&
    !campaign.fundsReleased &&
    walletAddress?.toLowerCase() === campaign.creator.toLowerCase();

  const canRefund =
    campaign.status === 2 && contributions.some((c) => BigInt(c) > 0);

  const isContributor = walletAddress && contributors.includes(walletAddress);

  const contributeDisabled = contributeLoading || campaign?.status !== 0;
  const releaseDisabled = releaseLoading || !canRelease;
  const refundDisabled =
    refundLoading ||
    !canRefund ||
    (isContributor &&
    refunded[contributors.indexOf(walletAddress)] !== undefined
      ? refunded[contributors.indexOf(walletAddress)]
      : false);

  const timeLeft = campaign.deadline * 1000 - Date.now();
  const daysLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60 * 24)));
  const hoursLeft = Math.max(
    0,
    Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  );

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4 md:py-12 md:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <Button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white transition-colors"
          >
            <ArrowLeft size={18} /> Back to Campaigns
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Media */}
            <div className="lg:col-span-2">
              <Card className="bg-gray-900 border-gray-800 shadow-xl rounded-xl overflow-hidden">
                <CardContent className="p-6">
                  <DynamicCarousel campaign={campaign} />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Details */}
            <div className="lg:col-span-1">
              <Card className="bg-gray-900 border-gray-800 shadow-xl rounded-xl overflow-hidden h-full">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                      {campaign.title}
                    </h1>
                    <Badge className={`${statusColor} text-white`}>
                      {statusText}
                    </Badge>
                  </div>
                  <div className="flex items-center text-gray-400 text-sm mb-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="flex items-center cursor-pointer"
                            onClick={() => copyToClipboard(campaign.creator)}
                          >
                            <span className="mr-1">Creator:</span>
                            <span className="text-teal-400">
                              {campaign.creator.slice(0, 6)}...
                              {campaign.creator.slice(-4)}
                            </span>
                            <Copy size={14} className="ml-1 text-gray-500" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Click to copy address</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-300">{campaign.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 rounded-lg p-3 flex flex-col items-center">
                      <DollarSign className="h-5 w-5 text-teal-500 mb-1" />
                      <p className="text-xs text-gray-400">Target</p>
                      <p className="text-lg font-semibold">
                        {ethers.formatEther(BigInt(campaign.goal))} ETH
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3 flex flex-col items-center">
                      <DollarSign className="h-5 w-5 text-teal-500 mb-1" />
                      <p className="text-xs text-gray-400">Raised</p>
                      <p className="text-lg font-semibold">
                        {ethers.formatEther(BigInt(campaign.totalFunds))} ETH
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Progress</span>
                      <span className="text-sm font-medium text-teal-500">
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-teal-500 rounded-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 rounded-lg p-3 flex flex-col items-center">
                      <Calendar className="h-5 w-5 text-teal-500 mb-1" />
                      <p className="text-xs text-gray-400">Deadline</p>
                      <p className="text-sm font-medium">
                        {new Date(
                          campaign.deadline * 1000
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3 flex flex-col items-center">
                      <Clock className="h-5 w-5 text-teal-500 mb-1" />
                      <p className="text-xs text-gray-400">Time Left</p>
                      <p className="text-sm font-medium">
                        {campaign.status === 0
                          ? `${daysLeft}d ${hoursLeft}h`
                          : "Ended"}
                      </p>
                    </div>
                  </div>

                  {campaign.status === 0 && (
                    <form onSubmit={contribute} className="space-y-3">
                      <div className="flex space-x-2">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={contribution}
                          onChange={(e) => {
                            const inputValue = Number.parseFloat(
                              e.target.value
                            );
                            if (inputValue >= 0 || e.target.value === "") {
                              setContribution(e.target.value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "-" || e.key === "e") {
                              e.preventDefault();
                            }
                          }}
                          placeholder="Enter amount in ETH"
                          className="flex-1 bg-gray-800 border-gray-700 text-white focus:ring-teal-500 focus:border-teal-500"
                          required
                        />
                        <Button
                          type="submit"
                          disabled={contributeDisabled}
                          className="bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-50 transition-colors"
                        >
                          {contributeLoading ? "Contributing..." : "Contribute"}
                        </Button>
                      </div>
                    </form>
                  )}

                  {canRelease && (
                    <Button
                      onClick={releaseFunds}
                      disabled={releaseDisabled}
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50 transition-colors"
                    >
                      {releaseLoading ? "Releasing..." : "Release Funds"}
                    </Button>
                  )}

                  {canRefund && (
                    <Button
                      onClick={refund}
                      disabled={refundDisabled}
                      className="w-full bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 transition-colors"
                    >
                      {refundLoading ? "Refunding..." : "Request Refund"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Contributors Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8"
          >
            <Card className="bg-gray-900 border-gray-800 shadow-xl rounded-xl overflow-hidden">
              <CardHeader className="border-b border-gray-800">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-teal-500 mr-2" />
                  <h2 className="text-xl font-semibold text-white">
                    Contributors
                  </h2>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {contributors.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contributors.map((contributor: string, index: number) => (
                      <motion.div
                        key={contributor}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-teal-500 transition-colors">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-teal-500 mr-2"></div>
                              <span className="text-sm font-medium text-teal-400">
                                {ethers.formatEther(
                                  BigInt(contributions[index] || "0")
                                )}{" "}
                                ETH
                              </span>
                            </div>
                            {refunded[index] && (
                              <Badge
                                variant="outline"
                                className="bg-gray-800/30 text-gray-400 border-gray-700"
                              >
                                Refunded
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div
                              className="truncate text-sm text-gray-400 max-w-[70%]"
                              title={contributor}
                            >
                              {contributor}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-gray-700"
                              onClick={() => copyToClipboard(contributor)}
                            >
                              <Copy size={14} className="text-gray-400" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">
                      No contributors yet. Be the first to support this
                      campaign!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Escrow Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8"
          >
            <Card className="bg-gray-900 border-gray-800 shadow-xl rounded-xl overflow-hidden">
              <CardHeader className="border-b border-gray-800">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-teal-500 mr-2" />
                  <h2 className="text-xl font-semibold text-white">
                    Escrow Information
                  </h2>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Info className="h-4 w-4 text-teal-500 mr-2" />
                      <span className="text-sm font-medium text-white">
                        Escrow Address
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div
                        className="truncate text-sm text-gray-400"
                        title={campaign.escrow}
                      >
                        {campaign.escrow}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-gray-700"
                        onClick={() => copyToClipboard(campaign.escrow)}
                      >
                        <Copy size={14} className="text-gray-400" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <DollarSign className="h-4 w-4 text-teal-500 mr-2" />
                      <span className="text-sm font-medium text-white">
                        Escrow Balance
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-teal-400">
                        {escrowBalance} ETH
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-gray-700"
                            >
                              <Info size={14} className="text-gray-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-800 border-gray-700 text-white">
                            <p>
                              Current balance held in escrow for this campaign
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
