import express from "express";

const router = express.Router();

router.post("/signup", (req, res) => {
  res.status(200).json({
    message: "Signup route reached",
    body: req.body,
  });
});

router.post("/signin", (req, res) => {
  res.status(200).json({
    message: "Signin route reached",
    body: req.body,
  });
});

router.post("/logout", (req, res) => {
  res.send("Logout route");
});

export default router;
