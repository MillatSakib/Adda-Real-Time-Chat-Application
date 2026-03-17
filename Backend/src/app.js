import express from "express";
import authRoutes from "./routes/auth.route.js";

const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;
