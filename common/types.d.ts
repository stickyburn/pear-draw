export interface SessionState {
	status: "idle" | "connecting" | "ready" | "error";
	mode: "host" | "guest" | null;
	invite: string;
	error: string;
}

export interface Point {
	x: number;
	y: number;
}

export type Tool = "freehand" | "rect";

export interface CanvasObject {
	id: string;
	type: "path" | "rect";
	author: string;
	createdAt: number;
	color: string;
	width: number;
	[key: string]: unknown;
}

export interface Stroke {
	id: string;
	points: Point[];
	color: string;
	width: number;
	createdAt: number;
	author: string;
}

export interface CursorState {
	peerId: string;
	profileName: string;
	x: number;
	y: number;
	color: string;
	updatedAt: number;
}

export interface Snapshot {
	session: SessionState;
	objects: CanvasObject[];
	cursors: CursorState[];
}

export type Command =
	| "session.startHost"
	| "session.joinHost"
	| "session.addObject"
	| "session.clearBoard"
	| "session.updateCursor"
	| "session.getSnapshot"
	| "session.subscribe";

export interface CommandResponse<T = unknown> {
	ok: boolean;
	result?: T;
	error?: { message: string; code?: string };
}
