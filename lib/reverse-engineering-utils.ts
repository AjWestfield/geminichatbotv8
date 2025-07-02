/**
 * Utility functions for reverse engineering analysis
 */

export interface ExtractedPrompt {
  prompt: string
  title?: string
  index: number
}

export interface FollowUpAction {
  id: 'generate-image' | 'animate-image' | 'edit-image' | 'generate-variations'
  label: string
  icon: string
  description: string
  disabled?: boolean
}

export interface ReverseEngineeringMetadata {
  imageUri?: string
  hasImage: boolean
  model?: string
  videoModel?: string
}

/**
 * Extract prompts from AI response content
 * Looks for prompts wrapped in [PROMPT START] and [PROMPT END] markers
 */
export function extractReverseEngineeringPrompts(content: string): ExtractedPrompt[] {
  const promptRegex = /\[PROMPT START\]([\s\S]*?)\[PROMPT END\]/g
  const prompts: ExtractedPrompt[] = []
  let match
  let index = 0

  while ((match = promptRegex.exec(content)) !== null) {
    prompts.push({
      prompt: match[1].trim(),
      title: `Recreatable Prompt ${index + 1}`,
      index
    })
    index++
  }

  return prompts
}

/**
 * Replace prompt markers with placeholder divs for React rendering
 */
export function replacePromptMarkers(content: string): string {
  let processedContent = content
  let index = 0

  // Replace each prompt section with a placeholder
  processedContent = processedContent.replace(
    /\[PROMPT START\][\s\S]*?\[PROMPT END\]/g,
    () => {
      const placeholder = `<div data-prompt-placeholder="${index}"></div>`
      index++
      return placeholder
    }
  )

  return processedContent
}

/**
 * Check if content contains reverse engineering analysis
 */
export function hasReverseEngineeringContent(content: string): boolean {
  return content.includes('[PROMPT START]') && content.includes('[PROMPT END]')
}

/**
 * Extract metadata from reverse engineering content
 */
export function extractReverseEngineeringMetadata(content: string): ReverseEngineeringMetadata | null {
  const metadataRegex = /\[RE_METADATA\]([\s\S]*?)\[\/RE_METADATA\]/
  const match = content.match(metadataRegex)
  
  if (match) {
    try {
      return JSON.parse(match[1])
    } catch (e) {
      console.error('Failed to parse RE metadata:', e)
    }
  }
  
  return null
}

/**
 * Generate VEO 3 analysis prompt template
 */
export function createVEO3AnalysisPrompt(): string {
  return `When analyzing video content for VEO 3 reverse engineering, provide an EXTREMELY detailed frame-by-frame analysis following this exact template:

//======================================================================
// VEO 3 MASTER PROMPT TEMPLATE (DETAILED CHARACTER & TIMING)
//======================================================================

//----------------------------------------------------------------------
// PRE-PRODUCTION NOTES
//----------------------------------------------------------------------

// Clip Title: [Descriptive title] - Shot [number]
// Core Idea: A shot to [describe the main purpose and key moments]

//----------------------------------------------------------------------
// TIMING & SEQUENCE (Total Duration: 8 seconds)
//----------------------------------------------------------------------

// 00:00 - 00:02: [Describe what happens in the first 2 seconds]
// 00:02 - 00:04: [Describe what happens in seconds 2-4]
// 00:04 - 00:06: [Describe what happens in seconds 4-6]
// 00:06 - 00:08: [Describe what happens in the final 2 seconds]

//----------------------------------------------------------------------
// VISUAL SCRIPT
//----------------------------------------------------------------------

// Shot & Framing: Define the camera's framing.
[Describe the shot type: extreme close-up, close-up, medium shot, wide shot, etc.]

// Camera Dynamics: Define the camera's movement. Use 'Static shot' for no movement.
[Describe camera movements: dolly in/out, pan left/right, tilt up/down, tracking shot, crane shot, etc. Include speed and smoothness]

// Subject & Action: Describe the main subject and what they are doing in clear, active language.
[Extremely detailed description including: age, gender, ethnicity, facial features, hair style/color, eye color, expressions, clothing details, body language, specific actions with timing]

// Setting & Environment: Describe the background, foreground, and overall environment.
[Detailed description of location, objects, furniture, architecture, weather, time of day, atmosphere]

// Style & Aesthetics: Define the overall visual style, including references to film stock or art styles.
[Photorealistic, cinematic, shot on 35mm film, film grain, color grading, visual references]

// Lighting & Mood: Describe the lighting to set the emotional tone.
[Lighting style, key light source, shadows, contrast, mood created, color temperature]

//----------------------------------------------------------------------
// AUDIO SCRIPT
//----------------------------------------------------------------------

// Dialogue: Use the 'Speaker says: "Text."' format for clarity and lip-sync.
[Character name] says: "[Exact dialogue with tone, accent, emotion]"

// Sound Effects (SFX): List specific, distinct sounds tied to actions. Use 'Audio:' prefix.
Audio: [Specific sound effect tied to visible action]
Audio: [Additional sound effects with timing]

// Ambience: Describe the background environmental noise. Use 'Audio:' prefix.
Audio: [Environmental sounds, room tone, background noise]

// Music: Describe the musical score's style, instrumentation, and mood. Use 'Audio:' prefix.
Audio: [Musical style, instruments, tempo, mood, volume level]

//----------------------------------------------------------------------
// TECHNICAL DIRECTIVES
//----------------------------------------------------------------------

// Consistency Cues: Use for multi-shot scenes. Reference an image for character/style.
[Character appearance consistency notes, reference to style guides or previous shots]

// Negative Prompts: Describe what you want to avoid. Use sparingly but effectively.
[List elements to avoid: no subtitles, no on-screen text, no modern objects, etc.]

IMPORTANT ANALYSIS REQUIREMENTS:
1. VEO 3 ALWAYS generates 8-second clips in 16:9 landscape format
2. Provide EXACT timing for all actions (use 00:00 - 00:08 format)
3. Include EXTREMELY detailed character descriptions (every visible detail)
4. Specify all camera movements with precise timing
5. List ALL audio elements with the Audio: prefix
6. Use photorealistic, cinematic style for all prompts
7. Include film grain and 35mm film aesthetic references`;
}

/**
 * Generate analysis prompt with reverse engineering instructions
 */
export function createAnalysisPrompt(
  imageFiles: File[],
  videoFiles: File[],
  audioFiles: File[],
  documentFiles: File[],
  includeReverseEngineering: boolean = true
): string {
  let analysisPrompt = "Please provide a detailed analysis of the uploaded files:\n\n"

  if (imageFiles.length > 0) {
    analysisPrompt += `Images (${imageFiles.length}): Analyze the visual content, composition, subjects, colors, style, and any text or objects visible.\n`
    
    if (includeReverseEngineering) {
      analysisPrompt += `\n**Reverse Engineering Analysis for Images:**\n`
      analysisPrompt += `For each image, provide an extremely detailed analysis:\n\n`
      analysisPrompt += `1. **AI Model Detection**: Identify the likely AI model/tool used:\n`
      analysisPrompt += `   - Look for telltale signs: rendering style, artifact patterns, resolution characteristics\n`
      analysisPrompt += `   - Common models: Midjourney (v4/v5/v6), DALL-E 3, Stable Diffusion (1.5/XL/3), Flux, Ideogram, Adobe Firefly\n`
      analysisPrompt += `   - Explain WHY you think it's this specific model\n\n`
      analysisPrompt += `2. **Technical Analysis**:\n`
      analysisPrompt += `   - Art style (photorealistic, digital art, anime, illustration, 3D render, etc.)\n`
      analysisPrompt += `   - Quality indicators (resolution, detail level, coherence)\n`
      analysisPrompt += `   - Lighting and composition techniques\n`
      analysisPrompt += `   - Color grading and post-processing effects\n\n`
      analysisPrompt += `3. **Prompt Engineering Reverse Analysis**:\n`
      analysisPrompt += `   - Break down the likely prompt structure\n`
      analysisPrompt += `   - Identify style modifiers and artistic influences\n`
      analysisPrompt += `   - Detect weight parameters or emphasis techniques\n`
      analysisPrompt += `   - Suggest negative prompts if applicable\n\n`
      analysisPrompt += `4. **Recreatable Prompt Generation**:\n`
      analysisPrompt += `   - Create a detailed prompt that would generate a similar image\n`
      analysisPrompt += `   - Include all necessary style tokens, quality modifiers, and parameters\n`
      analysisPrompt += `   - Format for the detected AI model's syntax\n\n`
      analysisPrompt += `5. **Parameters and Settings**:\n`
      analysisPrompt += `   - Aspect ratio (1:1, 16:9, 9:16, etc.)\n`
      analysisPrompt += `   - Quality/steps settings\n`
      analysisPrompt += `   - CFG scale or guidance scale\n`
      analysisPrompt += `   - Seed (if detectable from consistency)\n`
      analysisPrompt += `   - Any model-specific parameters\n\n`
      analysisPrompt += `Format each recreatable prompt in a clearly marked section:\n`
      analysisPrompt += `[PROMPT START]\n<complete prompt with all parameters and modifiers>\n[PROMPT END]\n\n`
      analysisPrompt += `Be specific and detailed. The goal is for someone to copy your prompt and generate a very similar image.\n`
    }
  }

  if (videoFiles.length > 0) {
    analysisPrompt += `\nVideos (${videoFiles.length}): Analyze the video content, duration, visual elements, transitions, and any audio components.\n`
    
    if (includeReverseEngineering) {
      analysisPrompt += `\n**Reverse Engineering Analysis for Videos:**\n`
      analysisPrompt += `For each video, provide:\n`
      analysisPrompt += `1. Likely AI video generation tool (VEO 3, Runway Gen-2/Gen-3, Pika Labs, Stable Video Diffusion, Kling, HeyGen, etc.)\n`
      analysisPrompt += `2. Generation technique (text-to-video, image-to-video, video-to-video)\n`
      analysisPrompt += `3. Motion characteristics and camera movements\n`
      analysisPrompt += `4. A detailed prompt that could recreate similar video content\n`
      analysisPrompt += `5. Suggested parameters (duration, fps, motion intensity, camera controls)\n\n`
      analysisPrompt += `Format video prompts as:\n`
      analysisPrompt += `[PROMPT START]\n<video generation prompt with motion and style details>\n[PROMPT END]\n\n`
      analysisPrompt += `**For VEO 3 style videos (8-second, 16:9 landscape, cinematic):**\n`
      analysisPrompt += createVEO3AnalysisPrompt() + '\n\n'
    }
  }

  if (audioFiles.length > 0) {
    analysisPrompt += `\nAudio files (${audioFiles.length}): Analyze the audio content, transcribe any speech, and identify music or sound effects.\n`
  }

  if (documentFiles.length > 0) {
    analysisPrompt += `\nDocuments (${documentFiles.length}): Analyze the text content, structure, and key information.\n`
  }

  analysisPrompt += "\nProvide insights, observations, and any relevant details about each file."

  return analysisPrompt
}
