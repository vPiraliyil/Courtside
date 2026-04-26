let ioRef = null;

function init(io) {
  ioRef = io;
}

function broadcastScoreUpdate(gameId, data) {
  if (!ioRef) return;
  ioRef.to(`game:${gameId}`).emit('score:update', { gameId, ...data });
}

function broadcastGameFinished(gameId, winner) {
  if (!ioRef) return;
  ioRef.to(`game:${gameId}`).emit('game:finished', { gameId, winner });
}

function broadcastSettlementReady(roomId, settlements) {
  if (!ioRef) return;
  ioRef.to(`room:${roomId}`).emit('settlement:ready', { roomId, settlements });
}

module.exports = { init, broadcastScoreUpdate, broadcastGameFinished, broadcastSettlementReady };
