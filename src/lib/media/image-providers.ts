export type ImageGenerationResult = {
  imageUrl: string;
  mimeType: string;
  providerName: string;
  modelName?: string;
};

export interface ImageProvider {
  name: string;
  isConfigured: () => boolean;
  generateImage: (prompt: string) => Promise<ImageGenerationResult>;
}

class OpenAIImageProvider implements ImageProvider {
  name = "openai";
  modelName = "dall-e-3";

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async generateImage(prompt: string): Promise<ImageGenerationResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error("No image URL in OpenAI response");
    }

    return {
      imageUrl,
      mimeType: "image/png",
      providerName: this.name,
      modelName: this.modelName,
    };
  }
}

class FalAIImageProvider implements ImageProvider {
  name = "fal.ai";
  modelName = "flux-pro";

  isConfigured(): boolean {
    return !!process.env.FAL_AI_KEY;
  }

  async generateImage(prompt: string): Promise<ImageGenerationResult> {
    const apiKey = process.env.FAL_AI_KEY;
    if (!apiKey) {
      throw new Error("fal.ai API key not configured");
    }

    const response = await fetch("https://fal.run/fal-ai/flux-pro/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        image_size: "landscape_4_3",
        num_images: 1,
        enable_safety_checker: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`fal.ai API error: ${response.statusText}`);
    }

    const data = await response.json();
    const imageUrl = data.images?.[0]?.url;

    if (!imageUrl) {
      throw new Error("No image URL in fal.ai response");
    }

    return {
      imageUrl,
      mimeType: "image/png",
      providerName: this.name,
      modelName: this.modelName,
    };
  }
}

const providers = {
  openai: new OpenAIImageProvider(),
  "fal.ai": new FalAIImageProvider(),
  flux: new FalAIImageProvider(), // Alias for fal.ai
};

export function getImageProvider(providerName: string): ImageProvider {
  const provider = providers[providerName as keyof typeof providers];
  if (!provider) {
    throw new Error(`Unknown image provider: ${providerName}`);
  }
  return provider;
}

export function getAvailableProviders(): Array<{ name: string; configured: boolean }> {
  return Object.entries(providers)
    .filter(([name]) => name !== "flux") // Don't duplicate flux alias
    .map(([name, provider]) => ({
      name: provider.name,
      configured: provider.isConfigured(),
    }));
}
