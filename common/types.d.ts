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

export interface Stroke {
	id: string;
	points: Point[];
	color: string;
	width: number;
	createdAt: number;
	author: string;
}

export interface Snapshot {
	session: SessionState;
	strokes: Stroke[];
}

export type Command =
	| "session.startHost"
	| "session.joinHost"
	| "session.addStroke"
	| "session.clearBoard"
	| "session.getSnapshot"
	| "session.subscribe";

export interface CommandResponse<T = unknown> {
	ok: boolean;
	result?: T;
	error?: { message: string; code?: string };
}
