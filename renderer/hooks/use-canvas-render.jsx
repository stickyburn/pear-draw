import { onCleanup } from "solid-js";
import { canvasTheme } from "../styles/common.jsx";

export function useCanvasRender() {
	let canvasRef = null;

	const drawGrid = (ctx, width, height) => {
		ctx.fillStyle = canvasTheme.gridColor;
		for (
			let x = canvasTheme.gridSpacing;
			x < width;
			x += canvasTheme.gridSpacing
		) {
			for (
				let y = canvasTheme.gridSpacing;
				y < height;
				y += canvasTheme.gridSpacing
			) {
				ctx.beginPath();
				ctx.arc(x, y, canvasTheme.gridDotRadius, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	};

	const drawStroke = (ctx, stroke, width, height) => {
		if (!stroke?.points || stroke.points.length < 2) return;
		ctx.strokeStyle = stroke.color;
		ctx.lineWidth = stroke.width;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.beginPath();
		const first = stroke.points[0];
		ctx.moveTo(first.x * width, first.y * height);
		for (let i = 1; i < stroke.points.length; i += 1) {
			const point = stroke.points[i];
			ctx.lineTo(point.x * width, point.y * height);
		}
		ctx.stroke();
	};

	const redraw = (allStrokes, currentStroke) => {
		const canvas = canvasRef;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const rect = canvas.getBoundingClientRect();
		const width = Math.max(1, Math.floor(rect.width));
		const height = Math.max(1, Math.floor(rect.height));
		const dpr = globalThis.devicePixelRatio || 1;

		if (
			canvas.width !== Math.floor(width * dpr) ||
			canvas.height !== Math.floor(height * dpr)
		) {
			canvas.width = Math.floor(width * dpr);
			canvas.height = Math.floor(height * dpr);
		}

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.fillStyle = canvasTheme.bg;
		ctx.fillRect(0, 0, width, height);
		drawGrid(ctx, width, height);

		for (const stroke of allStrokes) drawStroke(ctx, stroke, width, height);
		if (currentStroke) drawStroke(ctx, currentStroke, width, height);
	};

	return {
		canvasRef: (el) => {
			canvasRef = el;
		},
		redraw,
	};
}
