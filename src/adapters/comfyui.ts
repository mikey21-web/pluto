// REPO: https://github.com/Comfy-Org/ComfyUI
// CAPABILITY: Node-based Stable Diffusion UI with REST API — image/video/audio generation via workflow graphs
// INSTALL: self-host (https://github.com/comfyanonymous/ComfyUI) — default http://127.0.0.1:8188
// INTEGRATION: http-client

export interface ComfyUIAdapter {
  generateImage(
    prompt: string,
    negativePrompt?: string,
    options?: {
      width?: number;
      height?: number;
      steps?: number;
      cfg?: number;
      model?: string;
      seed?: number;
    }
  ): Promise<{ imageUrl: string; imageBase64?: string; jobId: string }>;
  getJob(jobId: string): Promise<{ status: 'pending' | 'running' | 'complete' | 'error'; progress?: number }>;
  listModels(): Promise<string[]>;
  getStatus(): Promise<{ connected: boolean; queue_remaining: number }>;
}

/** Build a minimal txt2img workflow JSON for ComfyUI's /prompt endpoint. */
function buildWorkflow(prompt: string, negativePrompt: string, opts: {
  width: number; height: number; steps: number; cfg: number; model: string; seed: number;
}): Record<string, unknown> {
  return {
    '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: opts.model } },
    '2': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['1', 1] } },
    '3': { class_type: 'CLIPTextEncode', inputs: { text: negativePrompt, clip: ['1', 1] } },
    '4': { class_type: 'EmptyLatentImage', inputs: { width: opts.width, height: opts.height, batch_size: 1 } },
    '5': {
      class_type: 'KSampler',
      inputs: {
        model: ['1', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['4', 0],
        seed: opts.seed, steps: opts.steps, cfg: opts.cfg, sampler_name: 'euler',
        scheduler: 'normal', denoise: 1.0,
      },
    },
    '6': { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
    '7': { class_type: 'SaveImage', inputs: { images: ['6', 0], filename_prefix: 'pluto' } },
  };
}

export function makeComfyUIAdapter(config?: { baseUrl?: string; apiKey?: string }): ComfyUIAdapter {
  const base = config?.baseUrl ?? (config?.baseUrl === undefined ? '' : '');
  const apiKey = config?.apiKey;

  if (base) {
    const headers = () => ({
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    });

    return {
      async generateImage(prompt, negativePrompt = '', options = {}) {
        const opts = {
          width: options.width ?? 512,
          height: options.height ?? 512,
          steps: options.steps ?? 20,
          cfg: options.cfg ?? 7,
          model: options.model ?? 'v1-5-pruned-emaonly.ckpt',
          seed: options.seed ?? Math.floor(Math.random() * 2 ** 32),
        };

        const workflow = buildWorkflow(prompt, negativePrompt, opts);
        const r = await fetch(`${base}/prompt`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ prompt: workflow }),
        });
        if (!r.ok) throw new Error(`comfyui generateImage: ${r.status} ${await r.text()}`);
        const j = await r.json() as any;
        const jobId: string = j.prompt_id;

        // poll until complete (max 60s)
        // ponytail: naive polling; upgrade to WebSocket /ws for real-time progress
        for (let i = 0; i < 60; i++) {
          await new Promise(res => setTimeout(res, 1000));
          const hist = await fetch(`${base}/history/${jobId}`, { headers: headers() });
          if (!hist.ok) continue;
          const h = await hist.json() as any;
          const entry = h[jobId];
          if (!entry) continue;
          const outputs = entry.outputs ?? {};
          for (const nodeOut of Object.values(outputs) as any[]) {
            const images: any[] = nodeOut.images ?? [];
            if (images.length > 0) {
              const img = images[0];
              const imageUrl = `${base}/view?filename=${img.filename}&subfolder=${img.subfolder ?? ''}&type=${img.type ?? 'output'}`;
              return { imageUrl, jobId };
            }
          }
        }
        return { imageUrl: '', jobId };
      },

      async getJob(jobId) {
        const r = await fetch(`${base}/history/${jobId}`, { headers: headers() });
        if (!r.ok) return { status: 'error' };
        const h = await r.json() as any;
        const entry = h[jobId];
        if (!entry) {
          // check queue
          const q = await fetch(`${base}/queue`, { headers: headers() });
          if (q.ok) {
            const qj = await q.json() as any;
            const running: any[] = qj.queue_running ?? [];
            const pending: any[] = qj.queue_pending ?? [];
            if (running.some((x: any) => x[1] === jobId)) return { status: 'running' };
            if (pending.some((x: any) => x[1] === jobId)) return { status: 'pending' };
          }
          return { status: 'pending' };
        }
        return { status: 'complete' };
      },

      async listModels() {
        const r = await fetch(`${base}/object_info/CheckpointLoaderSimple`, { headers: headers() });
        if (!r.ok) return [];
        const j = await r.json() as any;
        return j?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] ?? [];
      },

      async getStatus() {
        try {
          const r = await fetch(`${base}/queue`, { headers: headers() });
          if (!r.ok) return { connected: false, queue_remaining: 0 };
          const j = await r.json() as any;
          const remaining = (j.queue_running?.length ?? 0) + (j.queue_pending?.length ?? 0);
          return { connected: true, queue_remaining: remaining };
        } catch {
          return { connected: false, queue_remaining: 0 };
        }
      },
    };
  }

  return {
    async generateImage(prompt) {
      console.log(`[ComfyUI stub] generateImage: ${prompt.slice(0, 80)}`);
      return { imageUrl: '', jobId: 'stub-job' };
    },
    async getJob(jobId) { return { status: 'error' }; },
    async listModels() { return []; },
    async getStatus() { return { connected: false, queue_remaining: 0 }; },
  };
}
