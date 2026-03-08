import OpenAI from "openai";
import type { PlantIdentificationResult } from "@shared/schema";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export async function identifyPlantFromImage(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg",
  teacherInstructions?: string,
  enablePropagation?: boolean
): Promise<PlantIdentificationResult> {
  if (!imageBuffer || imageBuffer.length < 100) {
    throw new Error("Image is too small or empty. Please upload a clear photo of the plant.");
  }

  if (imageBuffer.length > 20 * 1024 * 1024) {
    throw new Error("Image is too large. Please upload an image under 20MB.");
  }

  const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  let imageMimeType = validMimeTypes.includes(mimeType) ? mimeType : "image/jpeg";

  const header = imageBuffer.slice(0, 4);
  if (header[0] === 0xFF && header[1] === 0xD8) {
    imageMimeType = "image/jpeg";
  } else if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
    imageMimeType = "image/png";
  } else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
    imageMimeType = "image/gif";
  } else if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
    imageMimeType = "image/webp";
  }

  const base64Image = imageBuffer.toString("base64");
  
  console.log(`[identify] Image size: ${imageBuffer.length} bytes, detected mime: ${imageMimeType}, original mime: ${mimeType}, base64 length: ${base64Image.length}`);

  let customPrompt = "";
  if (teacherInstructions) {
    customPrompt = `\n\nAdditional Teacher Instructions (incorporate these into your educational content):\n${teacherInstructions}`;
  }

  let propagationPrompt = "";
  if (enablePropagation) {
    propagationPrompt = `\n\nPropagation Mode Active: Include detailed propagation information including seed collection timing, seed starting recommendations for temperate climates, and whether the plant is suitable for stem cuttings.`;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are an expert botanist and plant identification specialist. Analyze this plant image carefully.

IMPORTANT: Assess both the PHOTO QUALITY and your IDENTIFICATION CERTAINTY separately.

Photo Quality Assessment (0-100):
- 90-100: Excellent - clear, well-lit, focused, shows diagnostic features
- 70-89: Good - decent quality, can identify most features
- 50-69: Fair - some blur or lighting issues, identification possible but harder
- 30-49: Poor - blurry, dark, or partial view, identification uncertain
- 0-29: Very Poor - cannot reliably identify from this image

Identification Level:
- "species": You can confidently identify the exact species
- "genus": You can identify the genus but not certain of the exact species
- "family": You can only identify the plant family
- "unknown": Cannot reliably identify

Return your response as a JSON object:
{
  "species": "Scientific species name (e.g., 'Monstera deliciosa')",
  "genus": "Genus name (e.g., 'Monstera')",
  "family": "Botanical family (e.g., 'Araceae')",
  "order": "Botanical order (e.g., 'Alismatales')",
  "plantClass": "Botanical class (e.g., 'Liliopsida' or 'Magnoliopsida')",
  "phylum": "Botanical phylum/division (e.g., 'Tracheophyta' for vascular plants)",
  "kingdom": "Kingdom (typically 'Plantae')",
  "nativeRegion": "Geographic origin/native region (e.g., 'Central and South America', 'Mediterranean region')",
  "commonName": "Common name (e.g., 'Swiss Cheese Plant')",
  "confidence": number 0-100 (your certainty in the identification),
  "photoQuality": number 0-100 (quality of the photo for identification purposes),
  "identificationLevel": "species" | "genus" | "family" | "unknown",
  "description": "2-3 sentence description of the plant",
  "careInstructions": "Practical care advice (3-4 sentences)",
  "wateringFrequencyDays": number (typical days between waterings),
  "lightRequirement": "Light needs description",
  "propagationInfo": "How to propagate this plant (seed collection, stem cuttings, division, etc.)",
  "educationalContent": "Educational facts about this plant - its ecological role, historical significance, cultural connections, or scientific interest. Suitable for middle school students."
}

If photo quality is below 50, clearly indicate this affects your confidence.
If you can only identify to genus level, explain what additional features would help identify the species.${customPrompt}${propagationPrompt}`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${imageMimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const result = JSON.parse(content);
  return {
    species: result.species || "Unknown species",
    genus: result.genus || "Unknown",
    family: result.family || "Unknown family",
    order: result.order || "Unknown order",
    plantClass: result.plantClass || "Unknown class",
    phylum: result.phylum || "Tracheophyta",
    kingdom: result.kingdom || "Plantae",
    nativeRegion: result.nativeRegion || "Unknown origin",
    commonName: result.commonName || "Unknown plant",
    confidence: result.confidence || 50,
    photoQuality: result.photoQuality || 50,
    identificationLevel: result.identificationLevel || "unknown",
    description: result.description || "No description available",
    careInstructions: result.careInstructions || "No care instructions available",
    wateringFrequencyDays: result.wateringFrequencyDays || 7,
    lightRequirement: result.lightRequirement || "Medium light",
    propagationInfo: result.propagationInfo || "No propagation information available",
    educationalContent: result.educationalContent || "No educational content available",
  };
}
