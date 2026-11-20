import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";

/**
 * Reloads the page when a model in public/models is rewritten (a build, or the Blender bridge's "Send to game"),
 * so what was sent from Blender shows without pressing F5. Vite on its own reloads nothing for public files.
 * src/game/devresume.ts brings the game back to where it was after the reload.
 */
function reloadOnModels(): Plugin {
  return {
    name: "tarven-reload-on-models",
    apply: "serve",
    configureServer(server) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const changed = (file: string) => {
        // Her models, and the painted layers sent with them (public/models/paint).
        if (!/[\\/]public[\\/]models[\\/]([^\\/]+\.glb|paint[\\/][^\\/]+\.(png|json))$/i.test(file)) return;
        // A GLB is written in one go (the bridge renames a finished temp file into place), but a build writes
        // several in a row: wait for the last before reloading once.
        clearTimeout(timer);
        timer = setTimeout(() => {
          server.config.logger.info(`model changed, reloading: ${file.split(/[\\/]/).pop()}`, { timestamp: true });
          server.ws.send({ type: "full-reload" });
        }, 400);
      };
      server.watcher.on("change", changed);
      server.watcher.on("add", changed);
    },
  };
}

/**
 * The Blender bridge's game screenshot: Blender POSTs its camera to /__tarven/view, the open game page (devview.ts)
 * looks at her from there and POSTs its next frame back to /__tarven/shot, which is saved as ref/_bridge/game_shot.png
 * and answers Blender's request with its path. Development only.
 */
function blenderView(): Plugin {
  return {
    name: "tarven-blender-view",
    apply: "serve",
    configureServer(server) {
      const out = join(server.config.root, "ref", "_bridge");
      let waiting: ((path: string | null) => void)[] = [];
      const body = (req: import("node:http").IncomingMessage) =>
        new Promise<string>((resolve, reject) => {
          let data = "";
          req.on("data", (chunk) => (data += chunk));
          req.on("end", () => resolve(data));
          req.on("error", reject);
        });
      server.middlewares.use("/__tarven/view", async (req, res) => {
        const view = JSON.parse((await body(req)) || "null");
        const done = new Promise<string | null>((resolve) => {
          waiting.push(resolve);
          setTimeout(() => resolve(null), 20_000);
        });
        server.ws.send({ type: "custom", event: "tarven:view", data: view });
        const path = view?.shot ? await done : "";
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(path === null ? { error: "no game page answered (is the game open in a browser?)" } : { path }));
      });
      server.middlewares.use("/__tarven/shot", async (req, res) => {
        const url = await body(req);
        mkdirSync(out, { recursive: true });
        const path = join(out, "game_shot.png");
        writeFileSync(path, Buffer.from(url.replace(/^data:image\/png;base64,/, ""), "base64"));
        for (const done of waiting.splice(0)) done(path);
        waiting = [];
        res.end("ok");
      });
    },
  };
}

export default defineConfig({
  plugins: [reloadOnModels(), blenderView()],
});
