import { createSignal } from "solid-js";
import { getRandomStrokeColor, strokeDefaults } from "../styles/common.jsx";

export function useDrawing(props) {
	const [activeStroke, setActiveStroke] = createSignal(null);
	let activeStrokeRef = null;
	let pointerState = { drawing: false, pointerId: null };
	let strokeColorRef = null;

	if (!strokeColorRef) {
		strokeColorRef = getRandomStrokeColor();
	}

	const normalizePoint = (event, canvas) => {
		if (!canvas) return null;
		const rect = canvas.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return null;
		const x = (event.clientX - rect.left) / rect.width;
		const y = (event.clientY - rect.top) / rect.height;
		return {
			x: Math.max(0, Math.min(1, x)),
			y: Math.max(0, Math.min(1, y)),
		};
	};

	const startDraw = (event) => {
		if (!props.canDraw) return;
		const canvas = event.currentTarget;
		const point = normalizePoint(event, canvas);
		if (!point) return;
		pointerState = { drawing: true, pointerId: event.pointerId };
		canvas.setPointerCapture(event.pointerId);
		const stroke = {
			id: "active",
			color: strokeColorRef,
			width: strokeDefaults.width,
			points: [point],
			createdAt: Date.now(),
			author: props.profileName,
		};
		setActiveStroke(stroke);
		activeStrokeRef = stroke;
	};

	const moveDraw = (event) => {
		if (!pointerState.drawing) return;
		if (pointerState.pointerId !== event.pointerId) return;
		const canvas = event.currentTarget;
		const point = normalizePoint(event, canvas);
		if (!point) return;
		const prev = activeStrokeRef;
		if (!prev) return;
		const updated = { ...prev, points: [...prev.points, point] };
		activeStrokeRef = updated;
		setActiveStroke(updated);
	};

	const finishDraw = async (event) => {
		if (!pointerState.drawing) return;
		if (pointerState.pointerId !== event.pointerId) return;

		pointerState = { drawing: false, pointerId: null };
		const finishedStroke = activeStrokeRef;
		setActiveStroke(null);
		activeStrokeRef = null;

		if (!finishedStroke || finishedStroke.points.length < 2) return;
		await props.onAddStroke(finishedStroke);
	};

	return {
		activeStroke,
		startDraw,
		moveDraw,
		finishDraw,
	};
}
