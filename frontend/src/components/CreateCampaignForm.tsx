"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { getContract } from "@/lib/contract";
import { ethers } from "ethers";
import { CloudUpload, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CreateCampaignSheet() {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [goal, setGoal] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Filter to allow only images and videos
  const filterFiles = (files: File[]) =>
    files.filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    );

  // Handle file selection via input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const validFiles = filterFiles(Array.from(e.target.files));
      setFiles(validFiles);
    }
  };

  // Handle drag-and-drop file uploads
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const validFiles = filterFiles(Array.from(e.dataTransfer.files));
      setFiles(validFiles);
    }
  };

  // Upload files to Pinata and return IPFS hashes
  const uploadFilesToPinata = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/uploadToPinata", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload files to Pinata");
      }

      const data = await response.json();
      return data.ipfsHashes;
    } catch (error) {
      console.error("Error uploading files:", error);
      throw error;
    }
  };

  // Handle campaign creation submission
  const handleSubmit = async () => {
    if (!title || !description || Number(goal) <= 0 || Number(duration) <= 0) {
      toast.error("Please fill in all fields correctly.", {});
      return;
    }
    setLoading(true);
    try {
      const mediaHashes = await uploadFilesToPinata(files);
      const durationInSeconds = Number(duration) * 24 * 60 * 60;
      const contract = await getContract();
      const tx = await contract.createCampaign(
        title,
        description,
        ethers.parseEther(goal),
        durationInSeconds,
        mediaHashes
      );
      await tx.wait();
      toast.success("Campaign created successfully", {});

      // Reset form and close sheet
      resetForm();
      setOpen(false);
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast.error("Failed to create campaign", {});
    } finally {
      setLoading(false);
    }
  };

  // Reset form fields
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setGoal("");
    setDuration("");
    setFiles([]);
  };

  // Remove all selected files
  const clearFiles = () => setFiles([]);

  // Handle number input validation
  const handleNumberInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const value = e.target.value;
    // Allow only positive numbers or empty string
    if (
      value === "" ||
      (/^\d*\.?\d*$/.test(value) && Number.parseFloat(value) >= 0)
    ) {
      setter(value);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 transition-colors">
          <CloudUpload className="h-4 w-4" /> Add New Campaign
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md md:max-w-xl lg:max-w-2xl xl:max-w-4xl bg-[#0A0A0A] text-white border-[#333333] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-3xl font-bold text-white">
            Create Campaign
          </SheetTitle>
          <SheetDescription className="text-[#A0A0A0]">
            Fill in the details to create your crowdfunding campaign
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white">
              Title
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="Campaign Title"
              className="bg-[#0A0A0A] border border-[#333333] text-white focus:ring-2 focus:ring-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal" className="text-white">
              Goal (in ETH)
            </Label>
            <Input
              id="goal"
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              className="bg-[#0A0A0A] border border-[#333333] text-white focus:ring-2 focus:ring-white"
              value={goal}
              onChange={(e) => handleNumberInput(e, setGoal)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration" className="text-white">
              Duration (in days)
            </Label>
            <Input
              id="duration"
              type="text"
              inputMode="numeric"
              placeholder="30"
              className="bg-[#0A0A0A] border border-[#333333] text-white focus:ring-2 focus:ring-white"
              value={duration}
              onChange={(e: any) => handleNumberInput(e, setDuration)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe your campaign"
              className="min-h-[120px] bg-[#0A0A0A] border border-[#333333] text-white focus:ring-2 focus:ring-white resize-none"
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
            />
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label className="text-white">Media Files</Label>
            <div
              className="w-full p-6 border-2 border-dashed border-[#333333] rounded-lg bg-[#0A0A0A] flex flex-col items-center justify-center cursor-pointer hover:bg-[#1A1A1A] transition"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept="image/*, video/*"
                className="hidden"
                id="fileUpload"
                onChange={handleFileChange}
              />
              <label
                htmlFor="fileUpload"
                className="text-center text-[#A0A0A0] cursor-pointer"
              >
                <CloudUpload className="w-10 h-10 mx-auto mb-3 text-white" />
                <p>
                  Drag & drop files here or{" "}
                  <span className="text-white underline">click to upload</span>
                </p>
              </label>
            </div>
          </div>

          {/* File Previews */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-white">
                  Selected Files ({files.length})
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFiles}
                  className="text-black/50 border-white hover:bg-white hover:text-black"
                >
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-3 max-h-[200px] overflow-y-auto p-2">
                {files.map((file, index) => {
                  const isImage = file.type.startsWith("image/");
                  return (
                    <div
                      key={index}
                      className="flex flex-col items-center bg-[#0A0A0A] p-2 rounded-lg border border-[#333333]"
                    >
                      {isImage ? (
                        <img
                          src={URL.createObjectURL(file) || "/placeholder.svg"}
                          alt={file.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                      ) : (
                        <div className="w-20 h-20 flex flex-col items-center justify-center">
                          <Video className="w-6 h-6 text-white" />
                          <p className="text-xs text-center text-white mt-1 truncate max-w-[80px]">
                            {file.name}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-[#333333] text-white hover:bg-[#4D4D4D] rounded-lg font-semibold transition"
            >
              {loading ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
