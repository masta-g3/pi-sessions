import type { TUI } from "@mariozechner/pi-tui";
import type { CenterController } from "./controller.js";

export function startRefreshLoop(controller: CenterController, tui: TUI): () => void {
  let lastPreviewId: string | undefined;
  let lastPreviewAt = 0;

  const tick = async () => {
    await controller.refresh();
    const selectedId = controller.snapshot().selectedId;
    const now = Date.now();
    if (selectedId !== lastPreviewId || now - lastPreviewAt > 2_000) {
      await controller.refreshPreview();
      lastPreviewId = selectedId;
      lastPreviewAt = now;
    }
    tui.requestRender();
  };

  const timer = setInterval(() => void tick(), 1_000);
  void tick();
  return () => clearInterval(timer);
}
