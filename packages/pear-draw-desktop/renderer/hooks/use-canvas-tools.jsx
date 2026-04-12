import { createSignal, createEffect } from "solid-js";
import * as fabric from "fabric";
import {
	createShape,
	updateShape,
	finalizeShape,
} from "../lib/fabric-shapes.mjs";

/**
 * Canvas Tools Hook - Reusable drawing and interaction logic
 * Handles: freehand drawing, shape creation (rect, circle, text), and selection
 */
export function useCanvasTools(getCanvas, options = {}) {
	const [activeTool, setActiveTool] = createSignal("freehand");
	const [strokeColor, setStrokeColor] = createSignal(
		options.strokeColor || "#f5f0eb",
	);
	const [strokeWidth, setStrokeWidth] = createSignal(options.strokeWidth || 5);

	// Drawing state - these need to be tracked per-instance
	let isDrawing = false;
	let drawStart = null;
	let tempObject = null;
	let isModifying = false;

	// Tool configuration
	const tools = {
		freehand: {
			isDrawingMode: true,
			selection: false,
			cursor: "crosshair",
		},
		rect: {
			isDrawingMode: false,
			selection: true,
			cursor: "crosshair",
			shapeType: "rect",
		},
		circle: {
			isDrawingMode: false,
			selection: true,
			cursor: "crosshair",
			shapeType: "circle",
		},
		text: {
			isDrawingMode: false,
			selection: true,
			cursor: "text",
			shapeType: "text",
		},
		select: {
			isDrawingMode: false,
			selection: true,
			cursor: "default",
		},
	};

	/**
	 * Get current canvas instance
	 */
	const getCanvasInstance = () => {
		if (typeof getCanvas === "function") {
			return getCanvas();
		}
		return getCanvas;
	};

	/**
	 * Check if we're clicking on an existing object
	 */
	const isClickingObject = (e) => {
		const canvas = getCanvasInstance();
		if (!canvas) return false;
		const target = canvas.findTarget(e.e);
		return target && (target.selectable || target.evented);
	};

	/**
	 * Get pointer coordinates in scene space
	 */
	const getPointer = (e) => {
		const canvas = getCanvasInstance();
		if (!canvas) return { x: 0, y: 0 };
		return canvas.getScenePoint(e.e);
	};

	/**
	 * Apply tool settings to canvas
	 */
	const applyToolSettings = (toolId) => {
		const canvas = getCanvasInstance();
		if (!canvas) return;

		const config = tools[toolId] || tools.select;

		canvas.isDrawingMode = config.isDrawingMode;
		canvas.selection = config.selection;
		canvas.defaultCursor = config.cursor;

		// Update brush if in drawing mode
		if (config.isDrawingMode && canvas.freeDrawingBrush) {
			canvas.freeDrawingBrush.color = strokeColor();
			canvas.freeDrawingBrush.width = strokeWidth();
		}

		// Discard active object when switching to drawing tools
		if (toolId !== "select" && canvas.getActiveObject()) {
			canvas.discardActiveObject();
		}

		canvas.renderAll();
	};

	/**
	 * Set up canvas event handlers
	 */
	const setupEventHandlers = (callbacks = {}) => {
		const canvas = getCanvasInstance();
		if (!canvas) {
			console.warn("Canvas not ready for event handlers");
			return;
		}

		const { onShapeCreated, onPathCreated, onObjectModified } = callbacks;

		// Mouse down - start drawing shape
		canvas.on("mouse:down", (e) => {
			const tool = activeTool();
			const toolConfig = tools[tool];

			// Only handle shape tools
			if (!toolConfig?.shapeType) return;

			// If clicking on an existing object, let fabric handle it (for moving)
			if (isClickingObject(e)) {
				isModifying = true;
				return;
			}

			// Start drawing new shape
			isDrawing = true;
			drawStart = getPointer(e);
			tempObject = createShape(
				toolConfig.shapeType,
				drawStart,
				drawStart,
				strokeColor(),
				strokeWidth(),
			);

			if (tempObject) {
				canvas.add(tempObject);
				canvas.renderAll();
			}
		});

		// Mouse move - update shape size
		canvas.on("mouse:move", (e) => {
			if (!isDrawing || !tempObject || !drawStart) return;

			const tool = activeTool();
			const toolConfig = tools[tool];
			const current = getPointer(e);

			updateShape(toolConfig.shapeType, tempObject, drawStart, current);
			canvas.renderAll();
		});

		// Mouse up - finalize shape
		canvas.on("mouse:up", () => {
			const canvas = getCanvasInstance();

			// Handle object modification (moving)
			if (isModifying) {
				isModifying = false;
				return;
			}

			// Handle shape creation
			if (!isDrawing || !tempObject) return;

			isDrawing = false;

			const minSize = 5;
			const tool = activeTool();
			const toolConfig = tools[tool];

			// Check if shape is big enough
			let isValid = false;
			if (toolConfig?.shapeType === "rect") {
				isValid = tempObject.width > minSize && tempObject.height > minSize;
			} else if (toolConfig?.shapeType === "circle") {
				isValid = tempObject.radius > minSize / 2;
			} else if (toolConfig?.shapeType === "text") {
				isValid = true; // Text is always valid
			}

			if (isValid) {
				finalizeShape(canvas, tempObject, onShapeCreated);
				// Switch to select tool after creating a shape
				setTool("select");
			} else {
				canvas?.remove(tempObject);
			}

			tempObject = null;
			drawStart = null;
			canvas?.renderAll();
		});

		// Path created (freehand drawing)
		canvas.on("path:created", (e) => {
			if (onPathCreated && e.path) {
				onPathCreated(e.path);
			}
		});

		// Object modified (moved, scaled, rotated)
		canvas.on("object:modified", (e) => {
			if (onObjectModified && e.target) {
				onObjectModified(e.target);
			}
		});

		// Handle Text Editing
		canvas.on("text:changed", (e) => {
			if (onObjectModified && e.target) {
				onObjectModified(e.target);
			}
		});

		canvas.on("editing:exited", (e) => {
			if (onObjectModified && e.target) {
				onObjectModified(e.target);
			}
		});
	};

	/**
	 * Clean up event handlers
	 */
	const cleanupEventHandlers = () => {
		const canvas = getCanvasInstance();
		if (!canvas) return;
		canvas.off("mouse:down");
		canvas.off("mouse:move");
		canvas.off("mouse:up");
		canvas.off("path:created");
		canvas.off("object:modified");
	};

	/**
	 * Set active tool with proper cleanup
	 */
	const setTool = (toolId) => {
		const canvas = getCanvasInstance();

		// Cancel any ongoing drawing
		if (isDrawing && tempObject) {
			canvas?.remove(tempObject);
			tempObject = null;
		}
		isDrawing = false;
		drawStart = null;

		setActiveTool(toolId);
		applyToolSettings(toolId);
	};

	/**
	 * Update stroke color
	 */
	const updateStrokeColor = (color) => {
		setStrokeColor(color);
		const canvas = getCanvasInstance();
		if (canvas?.freeDrawingBrush) {
			canvas.freeDrawingBrush.color = color;
		}
	};

	/**
	 * Update stroke width
	 */
	const updateStrokeWidth = (width) => {
		setStrokeWidth(width);
		const canvas = getCanvasInstance();
		if (canvas?.freeDrawingBrush) {
			canvas.freeDrawingBrush.width = width;
		}
	};

	// Apply tool settings when canvas becomes available
	createEffect(() => {
		const canvas = getCanvasInstance();
		if (canvas) {
			applyToolSettings(activeTool());
		}
	});

	/**
	 * Delete selected objects from canvas
	 */
	const deleteSelectedObjects = () => {
		const canvas = getCanvasInstance();
		if (!canvas) return [];

		const activeObjects = canvas.getActiveObjects();
		if (activeObjects.length === 0) return [];

		// Remove all selected objects
		activeObjects.forEach((obj) => {
			canvas.remove(obj);
		});

		// Clear selection
		canvas.discardActiveObject();
		canvas.renderAll();

		return activeObjects.map((obj) => obj.id).filter(Boolean);
	};

	/**
	 * Set up keyboard event handlers for delete
	 */
	const setupKeyboardHandlers = () => {
		const handleKeyDown = (e) => {
			// Delete or Backspace key
			if (e.key === "Delete" || e.key === "Backspace") {
				// Don't delete if user is typing in a text input
				if (
					e.target.tagName === "INPUT" ||
					e.target.tagName === "TEXTAREA" ||
					e.target.isContentEditable
				) {
					return;
				}
				deleteSelectedObjects();
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	};

	return {
		// State signals
		activeTool,
		strokeColor,
		strokeWidth,

		// Actions
		setTool,
		setStrokeColor: updateStrokeColor,
		setStrokeWidth: updateStrokeWidth,
		deleteSelectedObjects,

		// Event handlers
		setupEventHandlers,
		setupKeyboardHandlers,
		cleanupEventHandlers,

		// Utilities
		applyToolSettings,
		tools: Object.keys(tools),
	};
}
