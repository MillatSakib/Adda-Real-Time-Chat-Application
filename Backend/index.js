import app from "./src/app.js";
import dotenv from "dotenv";
import { connectDB } from "./src/lib/db-connection.js";

dotenv.config();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is running on PORT:${PORT}`);
  connectDB();
});
