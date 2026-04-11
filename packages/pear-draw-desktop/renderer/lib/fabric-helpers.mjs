import * as fabric from "fabric";

// ─────────────────────────────────────────────────────────────────
// Fabric Object Factory — Pure utility functions for creating and
// manipulating Fabric.js objects. Independent of Solid reactivity.
// ─────────────────────────────────────────────────────────────────

/**
 * Create a Fabric.js object from a serialized data object.
 * Restores the original class instance via `fromObject` and sets metadata.
 */
export async function createFabricObject(obj) {
  const t = (obj.type || "").toLowerCase();

  let klass;
  if (t === "rect") klass = fabric.Rect;
  else if (t === "circle") klass = fabric.Circle;
  else if (t === "path") klass = fabric.Path;
  else if (t === "text" || t === "textbox") klass = fabric.Textbox;
  else return null;

  try {
    const instance = await klass.fromObject(obj);
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

/**
 * Set metadata on a newly created Fabric object and return its
 * serialized data with canonical origin/position fields.
 */
export function setObjectMeta(obj, profileName) {
  const id = `object:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const leftTop = obj.getPointByOrigin("left", "top");

  obj.id = id;
  obj.author = profileName || "peer";
  obj.createdAt = Date.now();

  const data = obj.toObject(["id", "author", "createdAt", "pathOffset"]);
  data.originX = "left";
  data.originY = "top";
  data.left = leftTop.x;
  data.top = leftTop.y;

  return data;
}

/**
 * Apply a remote object's properties to a local Fabric object.
 * For paths, the object is replaced entirely (morphing paths isn't feasible).
 * Returns true if the object was replaced (caller should skip setCoords).
 */
export async function updateFabricObject(remoteObj, localObj, canvas) {
  if (!remoteObj || !localObj) return false;

  const t = (remoteObj.type || "").toLowerCase();

  if (t === "path") {
    canvas.remove(localObj);
    const fo = await createFabricObject(remoteObj);
    if (fo) canvas.add(fo);
    return true;
  }

  localObj.set({
    left: remoteObj.left,
    top: remoteObj.top,
    scaleX: remoteObj.scaleX || 1,
    scaleY: remoteObj.scaleY || 1,
    angle: remoteObj.angle || 0,
    originX: remoteObj.originX || "left",
    originY: remoteObj.originY || "top",
  });

  if (t === "rect") {
    localObj.set({ width: remoteObj.width, height: remoteObj.height });
  }
  if (t === "circle") {
    localObj.set({ radius: remoteObj.radius });
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