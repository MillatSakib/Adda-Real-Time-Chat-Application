import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const { signup, isSignUp } = useAuthStore();

  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error("Full Name is required");
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!formData.password.trim()) return toast.error("Password is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return toast.error("Invalid email address");
  };

  const handleSubmit = async (e) => {
    console.log("Hello");
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) return toast.error(validationError.message);
    try {
      await signup(formData);
      toast.success("Account created successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to create account");
    }
  };
  return (
    <div className="hero bg-base-200 min-h-screen">
      <div className="hero-content flex-col lg:flex-row-reverse">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-bold">Create your account</h1>
          <p className="py-6">
            Join aDDa to start chatting with friends, share moments, and stay
            part of every conversation from anywhere.
          </p>
        </div>
        <div className="card bg-base-100 w-full max-w-sm shrink-0 shadow-2xl">
          <div className="card-body">
            <fieldset className="fieldset">
              <label className="label">Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="input"
                placeholder="Your name"
              />
              <label className="label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                placeholder="Email"
              />
              <label className="label">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input"
                placeholder="Create password"
              />
              <button className="btn btn-neutral mt-4" onClick={handleSubmit}>
                Sign Up
              </button>
              <p className="text-sm mt-2">
                Already have an account?{" "}
                <NavLink to="/login" className="link link-primary">
                  Login
                </NavLink>
              </p>
            </fieldset>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
