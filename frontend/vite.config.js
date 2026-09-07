import { defineConfig, transformWithOxc } from "vite";
import react from "@vitejs/plugin-react";

const chatJsAsJsx = () => ({
  name: "chat-js-as-jsx",
  enforce: "pre",
  async transform(code, id) {
    const normalizedId = id.replaceAll("\\", "/").split("?")[0];
    const isChatJavaScript =
      normalizedId.includes("/src/pages/Chat/") &&
      normalizedId.endsWith(".js");

    if (!isChatJavaScript) {
      return null;
    }

    return transformWithOxc(code, id, {
      lang: "jsx",
      jsx: {
        runtime: "automatic",
      },
    });
  },
});

export default defineConfig({
  plugins: [
    chatJsAsJsx(),
    react(),
  ],
});
