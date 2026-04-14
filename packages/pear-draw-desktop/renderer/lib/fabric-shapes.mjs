import * as fabric from "fabric";

// ─────────────────────────────────────────────────────────────────
// Fabric Shape Factory — Pure utility functions for creating,
// updating, and finalizing geometric shapes on the canvas.
// Independent of Solid reactivity.
// ─────────────────────────────────────────────────────────────────

/**
 * Create a new Fabric shape at the given start point.
 * @param {string} type - "rect" | "circle" | "text"
 * @param {{ x: number, y: number }} start - Origin point
 * @param {{ x: number, y: number }} current - Current pointer
 * @param {string} color - Stroke/fill color
 * @param {number} width - Stroke width
 * @returns {fabric.Object|null}
 */
export function createShape(type, start, current, color, width) {
	switch (type) {
		case "rect": {
			const left = Math.min(start.x, current.x);
			const top = Math.min(start.y, current.y);
			const rectWidth = Math.abs(current.x - start.x);
			const rectHeight = Math.abs(current.y - start.y);

			return new fabric.Rect({
				left,
				top,
				width: rectWidth,
				height: rectHeight,
				fill: "transparent",
				stroke: color,
				strokeWidth: width,
				selectable: false,
				evented: false,
				originX: "left",
				originY: "top",
			});
		}
		case "circle": {
			const radius = Math.sqrt(
				(current.x - start.x) ** 2 + (current.y - start.y) ** 2,
			);

			return new fabric.Circle({
				left: start.x - radius,
				top: start.y - radius,
				radius: radius,
				fill: "transparent",
				stroke: color,
				strokeWidth: width,
				selectable: false,
				evented: false,
				originX: "left",
				originY: "top",
			});
		}
		case "text": {
			// Text is placed at click position; user edits after creation
			return new fabric.Textbox("Double click to edit", {
				left: start.x,
				top: start.y,
				width: 200,
				fontSize: 24,
				fontFamily: "Kalam, cursive",
				fill: color,
				stroke: null,
				strokeWidth: 0,
				selectable: false,
				evented: false,
				originX: "left",
				originY: "top",
				editable: true,
			});
		}
		default:
			return null;
	}
}

/**
 * Update shape properties during drag.
 * @param {string} type - "rect" | "circle" | "text"
 * @param {fabric.Object} shape - The shape to update
 * @param {{ x: number, y: number }} start - Drag origin
 * @param {{ x: number, y: number }} current - Current pointer position
 */
export function updateShape(type, shape, start, current) {
	if (!shape) return;

	switch (type) {
		case "rect": {
			const left = Math.min(start.x, current.x);
			const top = Math.min(start.y, current.y);
			const width = Math.abs(current.x - start.x);
			const height = Math.abs(current.y - start.y);

			shape.set({ left, top, width, height });
			break;
		}
		case "circle": {
			const radius = Math.sqrt(
				(current.x - start.x) ** 2 + (current.y - start.y) ** 2,
			);
			shape.set({
				left: start.x - radius,
				top: start.y - radius,
				radius,
			});
			break;
		}
		// Text doesn't update during drag — placed at initial click
		default:
			break;
	}
}

/**
 * Finalize a shape after creation — make it selectable, apply metadata,
 * switch to select tool, and select the shape on canvas.
 *
 * @param {fabric.Canvas} canvas - The canvas instance
 * @param {fabric.Object} shape - The shape to finalize
 * @param {Function} [onShapeCreated] - Callback that receives the shape and returns metadata
 * @returns {fabric.Object|null} The finalized shape, or null if canvas/shape is missing
 */
export function finalizeShape(canvas, shape, onShapeCreated) {
	if (!shape || !canvas) return null;

	// Make it selectable
	shape.set({
		selectable: true,
		evented: true,
	});

	// Call the callback with the shape — returns metadata with id, author, createdAt
	const meta = onShapeCreated ? onShapeCreated(shape) : null;

	// Apply metadata if provided
	if (meta) {
		shape.set({
			id: meta.id,
			author: meta.author,
			createdAt: meta.createdAt,
		});
	}

	// Select the newly created shape
	canvas.setActiveObject(shape);

	return shape;
}
