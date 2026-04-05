import * as fabric from "fabric";
import {
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
} from "solid-js";
import { ConnectionStatus } from "./components/connection-status.jsx";
import { CursorOverlay } from "./components/cursor-overlay.jsx";
import {
	FloatingActionButton,
	showConnectionModal,
} from "./components/floating-action-button.jsx";
import { Toolbar } from "./components/toolbar.jsx";
import { usePearDrawSession } from "./hooks/use-pear-draw-session.jsx";
import { colors, strokeColors, swal2Overrides } from "./styles/common.jsx";

// Helper to create fabric objects from sync data
function createFabricObject(obj) {
	if (obj.type === "Rect" || obj.type === "rect") {
		return new fabric.Rect({
			id: obj.id,
			left: obj.left,
			top: obj.top,
			width: obj.width,
			height: obj.height,
			stroke: obj.stroke,
			strokeWidth: obj.strokeWidth,
			fill: obj.fill || "transparent",
			selectable: true,
			originX: obj.originX,
			originY: obj.originY,
		});
	}
	if (obj.type === "Path" || obj.type === "path") {
		return new fabric.Path(obj.path, {
			id: obj.id,
			stroke: obj.stroke,
			strokeWidth: obj.strokeWidth,
			fill: null,
			left: obj.left,
			top: obj.top,
			scaleX: obj.scaleX || 1,
			scaleY: obj.scaleY || 1,
			selectable: true,
			originX: obj.originX,
			originY: obj.originY,
		});
	}
	return null;
}

// Helper to set metadata on fabric object
function setObjectMeta(obj, profileName) {
	obj.set("id", `obj:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`);
	obj.set("author", profileName || "peer");
	obj.set("createdAt", Date.now());
	return obj.toJSON(["id", "author", "createdAt"]);
}

export function App() {
	const saved = globalThis.localStorage?.getItem("pear-draw-profile");
	const [profileName, setProfileName] = createSignal(
		saved || `peer-${Math.random().toString(16).slice(2, 7)}`,
	);
	const [initialModalShown, setInitialModalShown] = createSignal(false);
	const [activeTool, setActiveTool] = createSignal("freehand");
	const [strokeColor, setStrokeColor] = createSignal(strokeColors[0]);
	const [strokeWidth, setStrokeWidth] = createSignal(5);

	let fabricCanvasEl = null;
	let fabricCanvas = null;
	let isRemoteUpdate = false;
	let cursorThrottle = null;
	let cursorLast = { x: 0.5, y: 0.5 };
	let isDrawingRect = false;
	let rectStart = null;
	let tempRect = null;
	let lastObjectCount = 0;

	const {
		session,
		objects,
		cursors,
		startHost,
		joinHost,
		clearBoard,
		addObject,
		updateCursor,
	} = usePearDrawSession();

	createEffect(() => {
		globalThis.localStorage?.setItem("pear-draw-profile", profileName());
	});

	const isConnected = () => session().status === "ready";
	const canOpenConnectionMenu = () =>
		session().status === "idle" || session().status === "error";

	const scheduleCursorUpdate = () => {
		if (cursorThrottle) return;
		cursorThrottle = setTimeout(() => {
			updateCursor(profileName(), cursorLast);
			cursorThrottle = null;
		}, 33);
	};

	const getBrush = () =>
		fabricCanvas?.freeDrawingBrush || fabricCanvas?.activeBrush;

	const ensureBrush = () => {
		const brush = getBrush() || new fabric.PencilBrush(fabricCanvas);
		if (!fabricCanvas.freeDrawingBrush) {
			fabricCanvas.freeDrawingBrush = brush;
		}
		return brush;
	};

	const initFabricCanvas = () => {
		if (!fabricCanvasEl || fabricCanvas) return;

		const parent = fabricCanvasEl.parentElement;
		if (!parent) return;

		fabricCanvas = new fabric.Canvas(fabricCanvasEl, {
			width: Math.max(parent.clientWidth || 0, window.innerWidth),
			height: Math.max(parent.clientHeight || 0, window.innerHeight - 60),
			backgroundColor: colors.canvasBg,
			isDrawingMode: activeTool() === "freehand",
		});

		const brush = ensureBrush();
		brush.color = strokeColor();
		brush.width = strokeWidth();

		const handleResize = () => {
			if (!fabricCanvas || !fabricCanvasEl?.parentElement) return;
			fabricCanvas.setDimensions({
				width: fabricCanvasEl.parentElement.clientWidth,
				height: fabricCanvasEl.parentElement.clientHeight,
			});
			fabricCanvas.renderAll();
		};
		window.addEventListener("resize", handleResize);

		const handlePathCreated = (path) => {
			if (isRemoteUpdate) return;
			addObject(setObjectMeta(path, profileName()));
		};

		fabricCanvas.on("path:created", (e) => handlePathCreated(e.path));
		fabricCanvas.on("interaction:completed", (e) => {
			if (e.target?.type === "Path") handlePathCreated(e.target);
		});
		fabricCanvas.on("object:modified", (e) => {
			if (isRemoteUpdate || !e.target?.id) return;
			addObject(e.target.toJSON(["id", "author", "createdAt"]));
		});
		fabricCanvas.on("mouse:move", (e) => {
			if (!e.e) return;
			const pointer = fabricCanvas.getScenePoint(e.e);
			cursorLast = {
				x: pointer.x / fabricCanvas.width,
				y: pointer.y / fabricCanvas.height,
			};
			scheduleCursorUpdate();
		});

		// Rect drawing
		fabricCanvas.on("mouse:down", (e) => {
			if (activeTool() !== "rect" || !fabricCanvas) return;
			const pointer = fabricCanvas.getScenePoint(e.e);
			isDrawingRect = true;
			rectStart = { x: pointer.x, y: pointer.y };
			tempRect = new fabric.Rect({
				left: rectStart.x,
				top: rectStart.y,
				width: 0,
				height: 0,
				fill: "transparent",
				stroke: strokeColor(),
				strokeWidth: strokeWidth(),
				selectable: true,
			});
			fabricCanvas.add(tempRect);
		});

		fabricCanvas.on("mouse:move", (e) => {
			if (!isDrawingRect || !tempRect || !rectStart) return;
			const pointer = fabricCanvas.getScenePoint(e.e);
			const w = pointer.x - rectStart.x;
			const h = pointer.y - rectStart.y;
			tempRect.set({
				width: Math.abs(w),
				height: Math.abs(h),
				left: w > 0 ? rectStart.x : pointer.x,
				top: h > 0 ? rectStart.y : pointer.y,
			});
			fabricCanvas.renderAll();
		});

		fabricCanvas.on("mouse:up", () => {
			if (!isDrawingRect || !tempRect) return;
			isDrawingRect = false;
			if (tempRect.width > 5 && tempRect.height > 5) {
				addObject(setObjectMeta(tempRect, profileName()));
			} else {
				fabricCanvas.remove(tempRect);
			}
			tempRect = null;
			rectStart = null;
			fabricCanvas.renderAll();
		});

		onCleanup(() => {
			window.removeEventListener("resize", handleResize);
			fabricCanvas?.dispose();
			fabricCanvas = null;
			if (cursorThrottle) clearTimeout(cursorThrottle);
		});
	};

	const setTool = (tool) => {
		setActiveTool(tool);
		if (!fabricCanvas) return;
		fabricCanvas.isDrawingMode = tool === "freehand";
		fabricCanvas.selection = tool !== "freehand";
		if (tool === "freehand") {
			const brush = ensureBrush();
			brush.color = strokeColor();
			brush.width = strokeWidth();
		}
	};

	const handleColorChange = (color) => {
		setStrokeColor(color);
		const brush = getBrush();
		if (brush) brush.color = color;
	};

	const handleWidthChange = (width) => {
		setStrokeWidth(width);
		const brush = getBrush();
		if (brush) brush.width = width;
	};

	const handleStartHost = async (profile) => {
		setProfileName(profile);
		try {
			const invite = await startHost(profile);
			return invite;
		} catch (err) {
			throw err;
		}
	};

	const handleJoinHost = async (profile, invite) => {
		setProfileName(profile);
		return joinHost(profile, invite);
	};

	// Sync objects from remote
	createEffect(() => {
		const objs = objects() || [];
		if (!fabricCanvas || isRemoteUpdate) return;

		const newCount = objs.length;

		// Full redraw if board was cleared
		if (lastObjectCount > 0 && newCount < lastObjectCount) {
			isRemoteUpdate = true;
			try {
				fabricCanvas.clear();
				fabricCanvas.backgroundColor = colors.canvasBg;
				objs.forEach((obj) => {
					const fo = createFabricObject(obj);
					if (fo) fabricCanvas.add(fo);
				});
				fabricCanvas.renderAll();
			} finally {
				isRemoteUpdate = false;
			}
			lastObjectCount = newCount;
			return;
		}

		// Incremental add for new objects
		const existingIds = new Set(
			fabricCanvas
				.getObjects()
				.map((o) => o.id)
				.filter(Boolean),
		);
		const newObjs = objs.filter((obj) => !existingIds.has(obj.id));

		if (newObjs.length === 0) {
			lastObjectCount = newCount;
			return;
		}

		isRemoteUpdate = true;
		try {
			newObjs.forEach((obj) => {
				const fo = createFabricObject(obj);
				if (fo) fabricCanvas.add(fo);
			});
			fabricCanvas.renderAll();
		} finally {
			isRemoteUpdate = false;
		}
		lastObjectCount = newCount;
	});

	onMount(() => {
		if (canOpenConnectionMenu() && !initialModalShown()) {
			setInitialModalShown(true);
			showConnectionModal(
				(profile) => {
					setProfileName(profile);
					return startHost(profile);
				},
				(profile, invite) => {
					setProfileName(profile);
					return joinHost(profile, invite);
				},
			);
		}
	});

	const canvasRef = (el) => {
		if (!el || fabricCanvas) return;
		fabricCanvasEl = el;
		requestAnimationFrame(initFabricCanvas);
	};

	const peerId = createMemo(() => profileName());

	return (
		<>
			<style>{swal2Overrides}</style>
			<div
				style={{
					position: "relative",
					height: "100dvh",
					background: colors.canvasBg,
					color: colors.textPrimary,
					overflow: "hidden",
				}}
			>
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						"z-index": 1,
						padding: "12px",
					}}
				>
					<h1 style={{ margin: "0", "font-size": "24px" }}>Pear Draw</h1>
				</div>
				{isConnected() && (
					<ConnectionStatus session={session()} onClearBoard={clearBoard} />
				)}
				{isConnected() && (
					<Toolbar
						activeTool={activeTool}
						setTool={setTool}
						strokeColor={strokeColor}
						setStrokeColor={handleColorChange}
						strokeWidth={strokeWidth}
						setStrokeWidth={handleWidthChange}
					/>
				)}
				<div
					style={{
						position: "absolute",
						top: "60px",
						left: 0,
						right: 0,
						bottom: 0,
					}}
				>
					<canvas ref={canvasRef} />
				</div>
				{isConnected() && (
					<CursorOverlay
						cursors={cursors}
						localPeerId={peerId()}
						canvasWidth={window.innerWidth}
						canvasHeight={window.innerHeight}
					/>
				)}
				{canOpenConnectionMenu() && (
					<FloatingActionButton
						onStartHost={handleStartHost}
						onJoinHost={handleJoinHost}
					/>
				)}
			</div>
		</>
	);
}
