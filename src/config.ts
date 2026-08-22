import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-skill-challenge",
  description: "An accessible browser-local board for small shared skill challenges.",
  accentHex: "#7c3aed",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
