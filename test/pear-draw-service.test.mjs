import test from "brittle";
import { PearDrawService } from "../runtime/service.js";

test("joinSession rejects blank invite and sets guest error session", async (t) => {
	const service = new PearDrawService("/tmp/pear-draw-tests");

	try {
		await service.joinSession("alice", "   ");
		t.fail("Should have thrown");
	} catch (err) {
		t.ok(err.message.includes("Invite"), "throws invite error");
	}

	const { session } = service.getSnapshot();
	t.is(session.status, "error");
	t.is(session.mode, "guest");
	t.is(session.error, "Paste an invite code");
});

test("getSnapshot returns initial state", async (t) => {
	const service = new PearDrawService("/tmp/pear-draw-tests");

	const { session, strokes } = service.getSnapshot();
	t.is(session.status, "idle");
	t.is(session.mode, null);
	t.is(session.invite, "");
	t.is(session.error, "");
	t.alike(strokes, []);
});

test("subscribe calls listener with snapshot and returns unsubscribe", async (t) => {
	const service = new PearDrawService("/tmp/pear-draw-tests");

	let callCount = 0;
	let receivedSnapshot = null;

	const unsub = service.subscribe((snapshot) => {
		callCount += 1;
		receivedSnapshot = snapshot;
	});

	t.is(callCount, 1, "called immediately");
	t.ok(receivedSnapshot, "received snapshot");
	t.is(receivedSnapshot.session.status, "idle");

	unsub();
});
