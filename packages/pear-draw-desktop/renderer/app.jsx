import * as fabric from "fabric";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

// Studio components
import {
  StudioToolbar,
  StudioStatus,
  StudioCursors,
  StudioFab,
  showStudioConnectionModal,
} from "./components/index.jsx";

// Hooks
import { usePearDrawSession } from "./hooks/use-pear-draw-session.jsx";
import { useCanvasTools } from "./hooks/use-canvas-tools.jsx";
import { useFocusMode } from "./hooks/use-focus-mode.js";

// Fabric utilities
import { createFabricObject, setObjectMeta, updateFabricObject } from "./lib/fabric-helpers.mjs";

// Theme
import { studio, strokeColors, swal2Theme, keyframes, durations, easings } from "./styles/index.jsx";

// ─────────────────────────────────────────────────────────────────
// Main App Component
// ─────────────────────────────────────────────────────────────────

export function App() {
  const saved = globalThis.localStorage?.getItem("pear-draw-profile");
  const [profileName, setProfileName] = createSignal(
    saved || `artist-${Math.random().toString(16).slice(2, 6)}`
  );
  const [initialModalShown, setInitialModalShown] = createSignal(false);
  let isRemoteUpdate = false;

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
    leaveCursor,
  } = usePearDrawSession();

  const isConnected = () => session().status === "ready";
  const canOpenConnectionMenu = () =>
    session().status === "idle" || session().status === "error";

  const { isFocusMode, resetIdleTimer } = useFocusMode(isConnected, canOpenConnectionMenu);

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
    strokeWidth: 4,
  });

  createEffect(() => {
    globalThis.localStorage?.setItem("pear-draw-profile", profileName());
  });

  let containerEl = null;
  let fabricCanvasEl = null;
  let fabricCanvas = null;

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

    // Set up freehand brush with Studio colors
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

    setupEventHandlers({
      onShapeCreated: (shape) => {
        const meta = setObjectMeta(shape, profileName());
        if (isConnected()) addObject(meta);
        return meta;
      },
      onPathCreated: (path) => {
        if (isRemoteUpdate) return;
        const meta = setObjectMeta(path, profileName());
        if (isConnected()) addObject(meta);
      },
      onObjectModified: (target) => {
        if (isRemoteUpdate) return;
        const id = target.id;
        if (!id) return;
        if (isConnected()) {
          const data = target.toObject(["id", "author", "createdAt", "pathOffset", "originX", "originY"]);
          data.id = id;
          updateObject(id, data);
        }
      },
    });

    const cleanupKeyboard = setupKeyboardHandlers();

    fabricCanvas.on("mouse:move", (e) => {
      if (!e.e) return;
      const pointer = fabricCanvas.getScenePoint(e.e);
      updateCursor(profileName(), {
        x: pointer.x / fabricCanvas.width,
        y: pointer.y / fabricCanvas.height,
      });
    });

    // Send cursor leave when pointer exits the canvas
    fabricCanvas.on("mouse:out", () => {
      leaveCursor(profileName());
    });

    onCleanup(() => {
      cleanupKeyboard?.();
      window.removeEventListener("resize", handleResize);
      fabricCanvas?.dispose();
      fabricCanvas = null;
    });
  };

  const handleStartHost = async (profile) => {
    if (fabricCanvas) {
      isRemoteUpdate = true;
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = "transparent";
      fabricCanvas.renderAll();
      isRemoteUpdate = false;
    }
    setProfileName(profile);
    return startHost(profile);
  };

  const handleJoinHost = async (profile, invite) => {
    if (fabricCanvas) {
      isRemoteUpdate = true;
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = "transparent";
      fabricCanvas.renderAll();
      isRemoteUpdate = false;
    }
    setProfileName(profile);
    return joinHost(profile, invite);
  };

  const handleDeleteSelected = () => {
    const deletedIds = deleteSelectedObjects();
    if (isConnected()) {
      for (const id of deletedIds) deleteObject(id);
    }
  };

  // Sync remote objects
  createEffect(() => {
    const objs = objects() || [];
    if (!fabricCanvas || isRemoteUpdate) return;

    const sync = async () => {
      isRemoteUpdate = true;
      try {
        const remoteIds = new Set(objs.map((o) => o.id).filter(Boolean));
        const localObjects = fabricCanvas.getObjects();

        for (const remoteObj of objs) {
          if (!remoteObj.id) continue;
          const localObj = localObjects.find((o) => o.id === remoteObj.id);

          if (localObj) {
            if (
              fabricCanvas.getActiveObject() === localObj &&
              localObj.isEditing
            ) {
              continue;
            }
            await updateFabricObject(remoteObj, localObj, fabricCanvas);
          } else {
            const fo = await createFabricObject(remoteObj);
            if (fo) fabricCanvas.add(fo);
          }
        }

        localObjects.forEach((localObj) => {
          const id = localObj.id;
          if (id && id.startsWith("object:") && !remoteIds.has(id)) {
            fabricCanvas.remove(localObj);
          }
        });

        fabricCanvas.renderAll();
      } finally {
        isRemoteUpdate = false;
      }
    };

    sync();
  });

  // Handle disconnect
  createEffect(() => {
    if (session().status === "idle" && fabricCanvas) {
      isRemoteUpdate = true;
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = "transparent";
      fabricCanvas.renderAll();
      isRemoteUpdate = false;
    }
  });

  // Update dimensions on connection change
  createEffect(() => {
    const connected = isConnected();
    const timeout = setTimeout(() => {
      if (fabricCanvas && containerEl) {
        const w = containerEl.clientWidth;
        const h = containerEl.clientHeight;
        if (w > 0 && h > 0) {
          fabricCanvas.setDimensions({ width: w, height: h });
          fabricCanvas.renderAll();
        }
      }
    }, 100);
    onCleanup(() => clearTimeout(timeout));
  });

  onMount(() => {
    if (canOpenConnectionMenu() && !initialModalShown()) {
      setInitialModalShown(true);
      setTimeout(() => {
        showStudioConnectionModal(handleStartHost, handleJoinHost, disconnect);
      }, 500);
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
      {/* Studio theme styles */}
      <style>{swal2Theme}</style>
      <style>{keyframes}</style>
      
      <div
        style={{
          position: "relative",
          height: "100dvh",
          background: studio.void,
          color: studio.text.primary,
          overflow: "hidden",
        }}
      >
        {/* ═══ Studio Header ═══ */}
        {isConnected() && (
          <header
            style={{
              position: "absolute",
              top: isFocusMode() ? "-60px" : "0",
              left: 0,
              right: 0,
              "z-index": 40,
              height: "56px",
              display: "flex",
              "align-items": "center",
              padding: "0 24px",
              background: `linear-gradient(to bottom, ${studio.void} 0%, transparent 100%)`,
              "pointer-events": "none",
              transition: `all ${durations.slow} ${easings.premium}`,
              opacity: isFocusMode() ? 0 : 1,
            }}
          >
            <div
              style={{
                display: "flex",
                "align-items": "baseline",
                gap: "12px",
              }}
            >
              <h1
                style={{
                  margin: 0,
                  "font-family": "var(--font-display)",
                  "font-size": "1.25rem",
                  "font-weight": 600,
                  color: studio.text.primary,
                  "letter-spacing": "-0.02em",
                }}
              >
                Pear Draw
              </h1>
              <span
                style={{
                  "font-family": "var(--font-mono)",
                  "font-size": "0.65rem",
                  color: studio.text.muted,
                  "letter-spacing": "0.1em",
                  "text-transform": "uppercase",
                }}
              >
                Studio
              </span>
            </div>
          </header>
        )}

        {/* ═══ Disconnected State Branding ═══ */}
        {/* Removed for blank canvas experience */}

        {/* ═══ Connection Status ═══ */}
        {isConnected() && (
          <StudioStatus
            session={session()}
            onClearBoard={clearBoard}
            onDisconnect={disconnect}
            isFocusMode={isFocusMode}
          />
        )}

        {/* ═══ Toolbar ═══ */}
        {isConnected() && (
          <StudioToolbar
            activeTool={activeTool}
            setTool={setTool}
            strokeColor={strokeColor}
            setStrokeColor={setStrokeColor}
            strokeWidth={strokeWidth}
            setStrokeWidth={setStrokeWidth}
            onDelete={handleDeleteSelected}
            isFocusMode={isFocusMode}
            onToggleFocus={() => isFocusMode(!isFocusMode())}
          />
        )}

        {/* ═══ Canvas Container ═══ */}
        <div
          ref={(el) => (containerEl = el)}
          class="studio-canvas-grid"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "hidden",
          }}
        >
          <canvas ref={canvasRef} />

          {/* ═══ Cursor Overlay ═══ */}
          {isConnected() && (
            <StudioCursors
              cursors={cursors()}
              localPeerId={peerId()}
              canvasWidth={containerEl?.clientWidth || window.innerWidth}
              canvasHeight={containerEl?.clientHeight || window.innerHeight}
            />
          )}
        </div>

        {/* ═══ Floating Action Button ═══ */}
        {canOpenConnectionMenu() && (
          <StudioFab
            onStartHost={handleStartHost}
            onJoinHost={handleJoinHost}
            onDismiss={disconnect}
            isFocusMode={isFocusMode}
          />
        )}
      </div>
    </>
  );
}