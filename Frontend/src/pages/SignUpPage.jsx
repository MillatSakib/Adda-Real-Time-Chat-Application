import React from "react";
import { NavLink } from "react-router-dom";

export default function SignUpPage() {
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
              <input type="text" className="input" placeholder="Your name" />
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="Email" />
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="Create password"
              />
              <button className="btn btn-neutral mt-4">Sign Up</button>
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
    </div>
  );
}
