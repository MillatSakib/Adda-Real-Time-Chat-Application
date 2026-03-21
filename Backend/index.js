import "dotenv/config";
import { connectDB } from "./src/lib/db-connection.js";
import { server } from "./src/lib/socket.js";
import "./src/app.js";

const PORT = process.env.PORT || 5005;

server.listen(PORT, () => {
  console.log(`Server is running on PORT:${PORT}`);
  connectDB();
});
