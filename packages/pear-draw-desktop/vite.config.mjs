import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
	plugins: [solid({ hot: true })],
	root: "renderer",
	base: "./",
	optimizeDeps: {
		include: ["solid-js", "solid-js/web"],
	},
	build: {
		outDir: "dist",
		emptyOutDir: true,
	},
	server: {
		port: 3000,
		hmr: {
			host: "localhost",
			port: 3000,
		},
	},
});
