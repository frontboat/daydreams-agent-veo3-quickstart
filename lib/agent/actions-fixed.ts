import { action } from "@daydreamsai/core";
import * as z from "zod";
import { saveImage, loadImage } from "@/lib/storage/image-store";

// ============================================
// VEO 3 VIDEO GENERATION ACTIONS
// ============================================

export const generateVideoAction = action({
  name: "generate-veo-video",
  description: "Generate a video using Google's Veo models (Veo 3, Veo 3 Fast, or Veo 2)",
  schema: z.object({
    prompt: z.string().describe("The video generation prompt. Veo 3/Fast support audio cues"),
    model: z.enum([
      'veo-3.0-generate-preview',      // Veo 3: 8-second 720p with audio, cinematic quality
      'veo-3.0-fast-generate-preview',  // Veo 3 Fast: Optimized for speed, with audio
      'veo-2.0-generate-001'            // Veo 2: Stable, supports 9:16 aspect ratio, no audio
    ]).optional().default('veo-3.0-generate-preview').describe("Which Veo model to use"),
    negativePrompt: z.string().optional().describe("Text describing what not to include in the video"),
    aspectRatio: z.enum(['16:9', '9:16']).optional().default('16:9').describe("Video aspect ratio. Veo 2 supports both, Veo 3 only 16:9"),
    personGeneration: z.enum(['allow_all', 'allow_adult', 'dont_allow']).optional().describe("Controls generation of people. Veo 3 text-to-video only supports allow_all"),
    numberOfVideos: z.number().min(1).max(2).optional().default(1).describe("Number of videos to generate (Veo 2 only, max 2)"),
    useImageId: z.string().optional().describe("ID of a previously generated image to use as starting frame"),
    useLatestImage: z.boolean().optional().describe("Use the most recently generated image as starting frame"),
    imageFile: z.string().optional().describe("Base64 image data from user upload (handled by the system)"),
  }),
  handler: async ({ prompt, model, negativePrompt, aspectRatio, personGeneration, numberOfVideos, useImageId, useLatestImage, imageFile }, ctx) => {
    try {
      const startTime = Date.now();
      
      // Validate model-specific constraints
      const isVeo3 = model?.startsWith('veo-3.0');
      const isVeo2 = model === 'veo-2.0-generate-001';
      
      // Veo 3 only supports 16:9 aspect ratio
      if (isVeo3 && aspectRatio === '9:16') {
        return {
          success: false,
          error: 'INVALID_ASPECT_RATIO',
          message: 'Veo 3 models only support 16:9 aspect ratio. Use Veo 2 for 9:16.',
        };
      }
      
      // Veo 3 text-to-video only supports allow_all for personGeneration
      if (isVeo3 && !imageFile && !useImageId && !useLatestImage && personGeneration && personGeneration !== 'allow_all') {
        return {
          success: false,
          error: 'INVALID_PERSON_GENERATION',
          message: 'Veo 3 text-to-video only supports "allow_all" for person generation. Use "allow_adult" only with image input.',
        };
      }
      
      // numberOfVideos is only for Veo 2
      if (!isVeo2 && numberOfVideos && numberOfVideos > 1) {
        return {
          success: false,
          error: 'INVALID_NUMBER_OF_VIDEOS',
          message: 'Only Veo 2 supports generating multiple videos. Veo 3 generates one video at a time.',
        };
      }
      
      // Create form data for the API request
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("model", model || "veo-3.0-generate-preview");
      if (negativePrompt) formData.append("negativePrompt", negativePrompt);
      if (aspectRatio) formData.append("aspectRatio", aspectRatio);
      if (personGeneration) formData.append("personGeneration", personGeneration);
      if (isVeo2 && numberOfVideos) formData.append("numberOfVideos", numberOfVideos.toString());
      
      // Agent decides which image source to use by passing only one parameter
      let imageData: string | null = null;
      
      // Use uploaded image file if provided
      if (imageFile) {
        imageData = imageFile;
      }
      
      // Use specific image by ID if requested
      if (useImageId) {
        imageData = await loadImage(useImageId);
        if (!imageData && ctx.memory?.images) {
          // Fallback: check if we have the URL in memory
          const imageRef = ctx.memory.images.find((img: any) => img.id === useImageId);
          if (imageRef) {
            console.log(`Image ${useImageId} found in memory with URL: ${imageRef.url}`);
          }
        }
      }
      
      // Use latest generated image if requested
      if (useLatestImage && ctx.memory?.images && ctx.memory.images.length > 0) {
        const latestImage = ctx.memory.images[ctx.memory.images.length - 1];
        if (latestImage.id) {
          imageData = await loadImage(latestImage.id);
        }
      }
      
      // Add image data to form if we have it
      if (imageData) {
        if (imageData.startsWith('data:')) {
          const [meta, b64] = imageData.split(',');
          const mime = meta?.split(';')[0]?.replace('data:', '') || 'image/png';
          formData.append("imageBase64", b64);
          formData.append("imageMimeType", mime);
        } else {
          formData.append("imageBase64", imageData);
          formData.append("imageMimeType", "image/png");
        }
      }

      // Call the Veo generation API with absolute URL
      const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/veo/generate`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to start video generation: ${response.statusText}`);
      }

      const result = await response.json();
      const operationName = result.name;

      // Add to memory if we have access to videos array
      const videoId = crypto.randomUUID();
      const video = {
        id: videoId,
        prompt,
        operationName,
        status: 'generating' as const,
        createdAt: Date.now(),
      };
      
      // Try to add to the videos array if it exists in memory
      if (ctx.memory && Array.isArray(ctx.memory.videos)) {
        ctx.memory.videos.push(video);
      }

      return {
        success: true,
        operationName,
        videoId,
        message: `Video generation started. Operation: ${operationName}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "Failed to start video generation",
      };
    }
  },
});

export const checkVideoStatusAction = action({
  name: "check-video-status",
  description: "Check the status of a video generation operation",
  schema: z.object({
    operationName: z.string().describe("The operation name from generate-veo-video"),
  }),
  handler: async ({ operationName }, ctx) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/veo/operation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: operationName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to check operation status: ${response.statusText}`);
      }

      const operation = await response.json();

      if (operation.done) {
        const fileUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        
        if (fileUri) {
          // Download the video
          const downloadResponse = await fetch(`${baseUrl}/api/veo/download`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uri: fileUri }),
          });

          if (downloadResponse.ok) {
            const blob = await downloadResponse.blob();
            const url = URL.createObjectURL(blob);

            // Update video status in memory if available
            if (ctx.memory && Array.isArray(ctx.memory.videos)) {
              const video = ctx.memory.videos.find((v: any) => v.operationName === operationName);
              if (video) {
                video.status = 'ready';
                video.url = url;
              }
            }

            return {
              success: true,
              status: 'ready',
              url,
              message: "Video is ready!",
            };
          }
        }

        return {
          success: false,
          status: 'failed',
          message: "Video generation failed",
        };
      }

      return {
        success: true,
        status: 'processing',
        progress: operation.metadata?.progressPercent || 0,
        message: `Video is still processing... ${operation.metadata?.progressPercent || 0}% complete`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "Failed to check video status",
      };
    }
  },
});

// ============================================
// IMAGEN 4 IMAGE GENERATION ACTIONS
// ============================================

export const generateImageAction = action({
  name: "generate-imagen-image",
  description: "Generate images using Google's Imagen 4.0 model",
  schema: z.object({
    prompt: z.string().describe("The image generation prompt"),
    numberOfImages: z.number().min(1).max(4).optional().default(1).describe("Number of images to generate (1-4)"),
    aspectRatio: z.enum(['1:1', '3:4', '4:3', '9:16', '16:9']).optional().default('1:1').describe("Aspect ratio of the generated images"),
  }),
  handler: async ({ prompt, numberOfImages = 1, aspectRatio = '1:1' }, ctx) => {
    try {
      const startTime = Date.now();

      // Use absolute URL for server-side fetch
      const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/imagen/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt,
          numberOfImages,
          aspectRatio 
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate image: ${response.statusText}`);
      }

      const result = await response.json();
      const generatedImages = [];

      // Handle both single image and multiple images response
      if (result?.images && Array.isArray(result.images)) {
        // Multiple images response
        for (const img of result.images) {
          if (img?.imageBytes) {
            const dataUrl = `data:${img.mimeType || 'image/png'};base64,${img.imageBytes}`;
            const imageId = crypto.randomUUID();
            
            // Save image to disk and get URL
            const imageUrl = await saveImage(imageId, dataUrl);
            
            const imageMetadata = {
              id: imageId,
              prompt,
              url: imageUrl,
              createdAt: Date.now(),
            };
            generatedImages.push(imageMetadata);
            
            // Store in the media library context (composed context)
            // The mediaLibrary context is composed with the main context
            if (!ctx.memory.images) {
              ctx.memory.images = [];
            }
            ctx.memory.images.push(imageMetadata);
          }
        }
      } else if (result?.image?.imageBytes) {
        // Single image response (backward compatibility)
        const dataUrl = `data:${result.image.mimeType || 'image/png'};base64,${result.image.imageBytes}`;
        const imageId = crypto.randomUUID();
        
        // Save image to disk and get URL
        const imageUrl = await saveImage(imageId, dataUrl);
        
        const imageMetadata = {
          id: imageId,
          prompt,
          url: imageUrl,
          createdAt: Date.now(),
        };
        generatedImages.push(imageMetadata);
        
        // Store in the media library context (composed context)
        // The mediaLibrary context is composed with the main context
        if (!ctx.memory.images) {
          ctx.memory.images = [];
        }
        ctx.memory.images.push(imageMetadata);
      }

      if (generatedImages.length > 0) {
        // Return metadata with URLs
        const imageMetadata = generatedImages.map(img => ({
          id: img.id,
          prompt: img.prompt,
          url: img.url,  // Include the URL!
          createdAt: img.createdAt,
        }));
        
        return {
          success: true,
          imageIds: imageMetadata.map(img => img.id),
          images: imageMetadata,
          count: generatedImages.length,
          message: `Generated ${generatedImages.length} image${generatedImages.length > 1 ? 's' : ''} successfully`,
        };
      }

      throw new Error("No image data in response");
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "Failed to generate images",
      };
    }
  },
});

// ============================================
// UTILITY ACTIONS
// ============================================

export const listMediaAction = action({
  name: "list-media",
  description: "List all media in the current project",
  schema: z.object({
    type: z.enum(['all', 'videos', 'images']).optional().default('all'),
    status: z.enum(['all', 'ready', 'generating', 'failed']).optional().default('all'),
  }),
  handler: async ({ type, status }, ctx) => {
    let videos = ctx.memory?.videos || [];
    let images = ctx.memory?.images || [];

    // Filter by status if specified
    if (status !== 'all' && type !== 'images') {
      videos = videos.filter((v: any) => v.status === status);
    }

    const result: any = {};
    
    if (type === 'all' || type === 'videos') {
      result.videos = videos.map((v: any) => ({
        id: v.id,
        prompt: v.prompt,
        status: v.status,
        createdAt: new Date(v.createdAt).toLocaleString(),
        url: v.url,
      }));
    }
    
    if (type === 'all' || type === 'images') {
      result.images = images.map((i: any) => ({
        id: i.id,
        prompt: i.prompt,
        createdAt: new Date(i.createdAt).toLocaleString(),
        hasData: !!i.data,
      }));
    }

    return {
      success: true,
      ...result,
      summary: `Found ${videos.length} videos and ${images.length} images`,
    };
  },
});

export const clearProjectAction = action({
  name: "clear-project",
  description: "Clear all media from the current project",
  schema: z.object({
    confirm: z.boolean().describe("Confirm clearing all media"),
  }),
  handler: async ({ confirm }, ctx) => {
    if (!confirm) {
      return {
        success: false,
        message: "Please confirm to clear the project",
      };
    }

    // Clear images from disk
    if (ctx.memory?.images && Array.isArray(ctx.memory.images)) {
      const { clearProjectImages } = await import("@/lib/storage/image-store");
      const imageIds = ctx.memory.images.map((img: any) => img.id).filter(Boolean);
      await clearProjectImages(imageIds);
    }

    // Clear media from memory
    if (ctx.memory) {
      if (ctx.memory.videos) ctx.memory.videos = [];
      if (ctx.memory.images) ctx.memory.images = [];
      if (ctx.memory.collections) ctx.memory.collections = [];
      if (ctx.memory.activeWorkflows) ctx.memory.activeWorkflows = [];
    }

    return {
      success: true,
      message: "Project cleared successfully",
    };
  },
});

// Export all actions as an array
export const veoActions = [
  generateVideoAction,
  checkVideoStatusAction,
  generateImageAction,
  listMediaAction,
  clearProjectAction,
];