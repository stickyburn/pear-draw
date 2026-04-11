// Command IDs for bare-rpc protocol
// Used identically across desktop (Pear Runtime) and mobile (Bare Kit)

// Request/Reply commands
export const CMD_START_HOST = 1;
export const CMD_JOIN_HOST = 2;
export const CMD_ADD_OBJECT = 3;
export const CMD_UPDATE_OBJECT = 4;
export const CMD_UPDATE_CURSOR = 5;
export const CMD_CLEAR_BOARD = 6;
export const CMD_GET_SNAPSHOT = 7;
export const CMD_DISCONNECT = 8;
export const CMD_DELETE_OBJECT = 9;

// One-way event pushes (id=0 in bare-rpc framing)
export const EVT_SNAPSHOT = 100;
