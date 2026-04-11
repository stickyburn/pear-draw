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
import { useCanvasTools } from "./hooks/use-canvas-tools.jsx";
import {
	colors,
	strokeColors,
	swal2Overrides,
	fonts,
	easings,
	durations,
} from "./styles/common.jsx";

// ─── Fabric Object Factory ───

/**
 * Create a Fabric object from a JSON definition.
 * This is now asynchronous to support Fabric's native fromObject logic,
 * which is required for correct path coordinate and offset handling.
 */
async function createFabricObject(obj) {
	const t = (obj.type || "").toLowerCase();

	let klass;
	if (t === "rect") klass = fabric.Rect;
	else if (t === "circle") klass = fabric.Circle;
	else if (t === "path") klass = fabric.Path;
	else if (t === "text" || t === "textbox") klass = fabric.Textbox;
	else return null;

	try {
		const instance = await klass.fromObject(obj);

		// Ensure critical metadata is preserved on the instance
		instance.set({
			id: obj.id,
			author: obj.author,
			createdAt: obj.createdAt,
			selectable: true,
			evented: true,
		});

		return instance;
	} catch (err) {
		console.error("[Renderer] Error enlivening object:", err, obj);
		return null;
	}
}

function setObjectMeta(obj, profileName) {
	const id = `object:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

	// Force absolute positioning via left/top origin to avoid P2P sync offsets.
	// We calculate the top-left point based on current origin before serializing.
	const leftTop = obj.getPointByOrigin("left", "top");

	obj.id = id;
	obj.author = profileName || "peer";
	obj.createdAt = Date.now();

	// Explicitly include critical properties for accurate recreation.
	// pathOffset is vital for fabric.Path objects in Fabric 6.
	const data = obj.toObject([
		"id",
		"author",
		"createdAt",
		"pathOffset",
	]);

	// Force the serialized data to use left/top origin for consistency across peers
	data.originX = "left";
	data.originY = "top";
	data.left = leftTop.x;
	data.top = leftTop.y;

	return data;
}

// Returns true when the caller should recreate the object (path type).
async function updateFabricObject(remoteObj, localObj, canvas) {
	if (!remoteObj || !localObj) return false;

	const t = (remoteObj.type || "").toLowerCase();

	// fabric.Path cannot be reliably mutated in-place — recreate instead
	if (t === "path") {
		canvas.remove(localObj);
		const fo = await createFabricObject(remoteObj);
		if (fo) canvas.add(fo);
		return true;
	}

	// Update common transform properties
	localObj.set({
		left: remoteObj.left,
		top: remoteObj.top,
		scaleX: remoteObj.scaleX || 1,
		scaleY: remoteObj.scaleY || 1,
		angle: remoteObj.angle || 0,
		originX: remoteObj.originX || "left",
		originY: remoteObj.originY || "top",
	});

	// Type-specific updates
	if (t === "rect") {
		localObj.set({
			width: remoteObj.width,
			height: remoteObj.height,
		});
	}
	if (t === "circle") {
		localObj.set({
			radius: remoteObj.radius,
		});
	}
	if (t === "text" || t === "textbox") {
		localObj.set({
			text: remoteObj.text,
			fontSize: remoteObj.fontSize || 20,
			width: remoteObj.width || 200,
		});
	}

	localObj.setCoords();
	return false;
}

// ─── App ───

export function App() {
	const saved = globalThis.localStorage?.getItem("pear-draw-profile");
	const [profileName, setProfileName] = createSignal(
		saved || `peer-${Math.random().toString(16).slice(2, 7)}`,
	);
	const [initialModalShown, setInitialModalShown] = createSignal(false);

	let containerEl = null;
	let fabricCanvasEl = null;
	let fabricCanvas = null;
	let isRemoteUpdate = false;
	let cursorThrottle = null;
	let cursorLast = { x: 0.5, y: 0.5 };
	let lastObjectCount = 0;

	const {
		session,
		objects,
		cursors,
		startHost,
		joinHost,
		disconnect,
		clearBoard,
		addObject,
		updateObject,
		deleteObject,
		updateCursor,
	} = usePearDrawSession();

	// Canvas tools hook - use a getter to avoid null reference issues
	const {
		activeTool,
		strokeColor,
		strokeWidth,
		setTool,
		setStrokeColor,
		setStrokeWidth,
		setupEventHandlers,
		deleteSelectedObjects,
		setupKeyboardHandlers,
	} = useCanvasTools(() => fabricCanvas, {
		strokeColor: strokeColors[0],
		strokeWidth: 5,
	});

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

	const initFabricCanvas = () => {
		if (!fabricCanvasEl || fabricCanvas) return;

		const parent = fabricCanvasEl.parentElement;
		if (!parent) return;

		const width = containerEl?.clientWidth || window.innerWidth;
		const height = containerEl?.clientHeight || window.innerHeight;

		fabricCanvas = new fabric.Canvas(fabricCanvasEl, {
			width,
			height,
			backgroundColor: "transparent",
			isDrawingMode: true,
		});

		// Set up freehand brush
		const brush = new fabric.PencilBrush(fabricCanvas);
		brush.color = strokeColor();
		brush.width = strokeWidth();
		fabricCanvas.freeDrawingBrush = brush;

		const handleResize = () => {
			if (!fabricCanvas || !containerEl) return;
			fabricCanvas.setDimensions({
				width: containerEl.clientWidth,
				height: containerEl.clientHeight,
			});
			fabricCanvas.renderAll();
		};
		window.addEventListener("resize", handleResize);

		// Set up canvas tool event handlers
		setupEventHandlers({
			onShapeCreated: (shape) => {
				const meta = setObjectMeta(shape, profileName());
				if (isConnected()) {
					addObject(meta);
				}
				return meta;
			},
			onPathCreated: (path) => {
				if (isRemoteUpdate) return;
				const meta = setObjectMeta(path, profileName());
				if (isConnected()) {
					addObject(meta);
				}
			},
			onObjectModified: (target) => {
				if (isRemoteUpdate) return;
				const id = target.id;
				if (!id) return;

				if (isConnected()) {
					// Use toObject with all critical properties
					const data = target.toObject(["id", "author", "createdAt", "pathOffset", "originX", "originY"]);
					data.id = id; 
					updateObject(id, data);
				}
			},
		});

		// Set up keyboard handlers (for delete key)
		const cleanupKeyboard = setupKeyboardHandlers();

		// Mouse move for cursor tracking
		fabricCanvas.on("mouse:move", (e) => {
			if (!e.e) return;
			const pointer = fabricCanvas.getScenePoint(e.e);
			cursorLast = {
				x: pointer.x / fabricCanvas.width,
				y: pointer.y / fabricCanvas.height,
			};
			scheduleCursorUpdate();
		});

		onCleanup(() => {
			cleanupKeyboard?.();
			window.removeEventListener("resize", handleResize);
			fabricCanvas?.dispose();
			fabricCanvas = null;
			if (cursorThrottle) clearTimeout(cursorThrottle);
		});
	};

	const handleColorChange = (color) => {
		setStrokeColor(color);
	};

	const handleWidthChange = (width) => {
		setStrokeWidth(width);
	};

	const handleStartHost = async (profile) => {
		// Wipe the playground before hosting
		if (fabricCanvas) {
			isRemoteUpdate = true;
			fabricCanvas.clear();
			fabricCanvas.backgroundColor = "transparent";
			fabricCanvas.renderAll();
			isRemoteUpdate = false;
			lastObjectCount = 0;
		}

		setProfileName(profile);
		const invite = await startHost(profile);
		return invite;
	};

	const handleJoinHost = async (profile, invite) => {
		// Wipe the playground before joining
		if (fabricCanvas) {
			isRemoteUpdate = true;
			fabricCanvas.clear();
			fabricCanvas.backgroundColor = "transparent";
			fabricCanvas.renderAll();
			isRemoteUpdate = false;
			lastObjectCount = 0;
		}

		setProfileName(profile);
		return joinHost(profile, invite);
	};

	const handleDismiss = async () => {
		await disconnect();
	};

	const handleDeleteSelected = () => {
		const deletedIds = deleteSelectedObjects();
		if (isConnected()) {
			for (const id of deletedIds) {
				deleteObject(id);
			}
		}
	};

	// Sync objects from remote — additive-only: add new, update existing,
	// remove only when a peer explicitly deleted an object (present locally
	// but absent from remote list with a "object:" id prefix).
	createEffect(() => {
		const objs = objects() || [];
		if (!fabricCanvas || isRemoteUpdate) return;

		// Use a recursive async function to process objects one by one
		const sync = async () => {
			isRemoteUpdate = true;
			try {
				const remoteIds = new Set(objs.map((o) => o.id).filter(Boolean));
				const localObjects = fabricCanvas.getObjects();

				// 1. Add new remote objects / update existing ones
				for (const remoteObj of objs) {
					if (!remoteObj.id) continue;

					const localObj = localObjects.find((o) => o.id === remoteObj.id);

					if (localObj) {
						// Don't overwrite an object the user is currently editing
						if (
							fabricCanvas.getActiveObject() === localObj &&
							localObj.isEditing
						) {
							continue;
						}
						// Update existing object
						await updateFabricObject(remoteObj, localObj, fabricCanvas);
					} else {
						// Add new object
						const fo = await createFabricObject(remoteObj);
						if (fo) {
							fabricCanvas.add(fo);
						}
					}
				}

				// 2. Remove objects that were explicitly deleted by a peer.
				localObjects.forEach((localObj) => {
					const id = localObj.id;
					if (id && id.startsWith("object:") && !remoteIds.has(id)) {
						fabricCanvas.remove(localObj);
					}
				});

				fabricCanvas.renderAll();
				lastObjectCount = objs.length;
			} finally {
				isRemoteUpdate = false;
			}
		};

		sync();
	});

	// Handle session reset / disconnect
	createEffect(() => {
		if (session().status === "idle" && fabricCanvas) {
			isRemoteUpdate = true;
			fabricCanvas.clear();
			fabricCanvas.backgroundColor = "transparent";
			fabricCanvas.renderAll();
			isRemoteUpdate = false;
			lastObjectCount = 0;
		}
	});

	// Update dimensions when isConnected changes
	createEffect(() => {
		const connected = isConnected();
		const timeout = setTimeout(() => {
			if (fabricCanvas && containerEl) {
				const w = containerEl.clientWidth;
				const h = containerEl.clientHeight;
				if (w > 0 && h > 0) {
					fabricCanvas.setDimensions({
						width: w,
						height: h,
					});
					fabricCanvas.renderAll();
				}
			}
		}, 100);
		onCleanup(() => clearTimeout(timeout));
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
				disconnect,
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
				{/* ─── Nordic Header ─── */}
				{isConnected() && (
					<header
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							"z-index": 5,
							height: "48px",
							display: "flex",
							"align-items": "center",
							padding: "0 16px",
							background: colors.canvasBg,
							"border-bottom": `1px solid ${colors.granite}`,
							animation: `wipe-down ${durations.normal} ${easings.premium} both`,
						}}
					>
						<h1
							style={{
								margin: 0,
								"font-family": fonts.display,
								"font-size": "1.1rem",
								"font-weight": 400,
								color: colors.snow,
								"letter-spacing": "-0.01em",
								"line-height": 1,
							}}
						>
							Pear Draw
						</h1>
						<span
							style={{
								"margin-left": "8px",
								"font-family": fonts.mono,
								"font-size": "0.55rem",
								color: colors.slate,
								"letter-spacing": "0.08em",
								"text-transform": "uppercase",
							}}
						>
							p2p
						</span>
					</header>
				)}

				{/* ─── Disconnected Brand ─── */}
				{canOpenConnectionMenu() && (
					<div
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							"z-index": 1,
							padding: "16px 24px",
							display: "flex",
							"align-items": "baseline",
							gap: "8px",
							"pointer-events": "none",
						}}
					>
						<h1
							style={{
								margin: 0,
								"font-family": fonts.display,
								"font-size": "1.1rem",
								"font-weight": 400,
								color: colors.snow,
								"letter-spacing": "-0.01em",
								animation: `blur-in ${durations.slow} ${easings.premium} both`,
							}}
						>
							Pear Draw
						</h1>
						<span
							style={{
								"font-family": fonts.mono,
								"font-size": "0.55rem",
								color: colors.rust,
								"letter-spacing": "0.08em",
								"text-transform": "uppercase",
								animation: `blur-in-subtle ${durations.slow} ${easings.premium} both`,
								"animation-delay": "150ms",
							}}
						>
							Local Playground
						</span>
					</div>
				)}

				{/* ─── Connection Status ─── */}
				{isConnected() && (
					<ConnectionStatus
						session={session()}
						onClearBoard={clearBoard}
						onDisconnect={handleDismiss}
					/>
				)}

				{/* ─── Toolbar ─── */}
				{isConnected() && (
					<Toolbar
						activeTool={activeTool}
						setTool={setTool}
						strokeColor={strokeColor}
						setStrokeColor={handleColorChange}
						strokeWidth={strokeWidth}
						setStrokeWidth={handleWidthChange}
						onDelete={handleDeleteSelected}
					/>
				)}

				{/* ─── Canvas ─── */}
				<div
					ref={(el) => (containerEl = el)}
					class="nav-dot-grid"
					style={{
						position: "absolute",
						top: isConnected() ? "48px" : "0",
						left: 0,
						right: 0,
						bottom: 0,
						overflow: "hidden",
					}}
				>
					<canvas ref={canvasRef} />

					{/* ─── Cursor Overlay ─── */}
					{isConnected() && (
						<CursorOverlay
							cursors={cursors}
							localPeerId={peerId()}
							canvasWidth={() =>
								containerEl?.clientWidth || window.innerWidth
							}
							canvasHeight={() =>
								containerEl?.clientHeight || window.innerHeight
							}
						/>
					)}
				</div>

				{/* ─── FAB ─── */}
				{canOpenConnectionMenu() && (
					<FloatingActionButton
						onStartHost={handleStartHost}
						onJoinHost={handleJoinHost}
						onDismiss={handleDismiss}
					/>
				)}
			</div>
		</>
	);
}
