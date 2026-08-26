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
        // "standard" rather than "hd": roughly half the cost per image, and
        // nothing in the approved references needs HD (CLAUDE.md section 11).
        quality: "standard",
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

/** Environment variable each provider needs, for a useful error message. */
const PROVIDER_ENV_VAR: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  "fal.ai": "FAL_AI_KEY",
  flux: "FAL_AI_KEY",
};

/**
 * Resolve the provider for a generation, or refuse.
 *
 * This used to fall back to whichever provider happened to have a key. That
 * meant a preset labelled fal.ai / flux-pro would quietly run DALL-E 3
 * instead on a deployment with only OPENAI_API_KEY — a different vendor, at
 * roughly twice the cost, under a name that said otherwise. Generating an
 * image costs real money, so the provider that runs has to be the provider
 * that was asked for.
 *
 * MediaSlotManager already disables Generate when the preset's provider has
 * no key; this is the server agreeing with it, and covers a direct POST.
 */
export function resolveConfiguredProvider(preferred: string): ImageProvider {
  const wanted = providers[preferred as keyof typeof providers];

  if (!wanted) {
    throw new Error(`Unknown image provider: ${preferred}`);
  }

  if (wanted.isConfigured()) return wanted;

  const anyConfigured = Object.values(providers).some((p) => p.isConfigured());
  const envVar = PROVIDER_ENV_VAR[preferred] ?? `the ${preferred} API key`;

  throw new Error(
    anyConfigured
      ? `This preset uses ${wanted.name}, which is not configured on this deployment. Set ${envVar}, or choose a preset for a provider that is configured.`
      : "No image generation provider is configured. Set OPENAI_API_KEY or FAL_AI_KEY."
  );
}

export function getAvailableProviders(): Array<{ name: string; configured: boolean }> {
  return Object.entries(providers)
    .filter(([name]) => name !== "flux") // Don't duplicate flux alias
    .map(([, provider]) => ({
      name: provider.name,
      configured: provider.isConfigured(),
    }));
}
