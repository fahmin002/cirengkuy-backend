import http from "http";
import { Server } from "socket.io";

import app from "./app.js";

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // allow all origins for simplicity, adjust in production
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join-admin-room", () => {
    socket.join("admin-room");
    console.log(`Client ${socket.id} joined admin room`);
  });

  socket.on(
    "join-order-room",
    (orderCode) => {
      socket.join(`order-${orderCode}`);

      console.log(
        `Joined room order-${orderCode}`
      );
    }
  );

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("🚀 Socket.IO server running on port 5000");
});

export { io };