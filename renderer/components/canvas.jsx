import { createEffect, createSignal, on } from "solid-js";
import { useCanvasRender } from "../hooks/use-canvas-render.jsx";
import { useDrawing } from "../hooks/use-drawing.jsx";
import { colors } from "../styles/common.jsx";

export function Canvas(props) {
	const { canvasRef, redraw } = useCanvasRender();
	const { activeStroke, startDraw, moveDraw, finishDraw } = useDrawing({
		canDraw: props.canDraw,
		profileName: props.profileName,
		onAddStroke: props.onAddStroke,
	});

	createEffect(
		on([activeStroke, () => props.strokes], () => {
			redraw(props.strokes, activeStroke());
		}),
	);

	return (
		<canvas
			ref={canvasRef}
			on:pointerdown={startDraw}
			on:pointermove={moveDraw}
			on:pointerup={finishDraw}
			on:pointercancel={finishDraw}
			style={{
				display: "block",
				width: "100%",
				height: "100%",
				background: colors.canvasBg,
				cursor: props.canDraw ? "crosshair" : "not-allowed",
			}}
		/>
	);
}
