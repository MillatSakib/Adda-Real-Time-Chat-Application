import React from "react";
import { NavLink } from "react-router-dom";

export default function LoginPage() {
  return (
    <div className="hero bg-base-200 min-h-screen">
      <div className="hero-content flex-col lg:flex-row-reverse">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-bold">Login now!</h1>
          <p className="py-6">
            Welcome back to aDDa. Sign in to continue your conversations, check
            new messages, and stay connected with your friends in real time.
          </p>
        </div>
        <div className="card bg-base-100 w-full max-w-sm shrink-0 shadow-2xl">
          <div className="card-body">
            <fieldset className="fieldset">
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="Email" />
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="Password" />
              <div>
                <a className="link link-hover">Forgot password?</a>
              </div>
              <button className="btn btn-neutral mt-4">Login</button>
              <p className="text-sm mt-2">
                Don&apos;t have an account?{" "}
                <NavLink to="/signup" className="link link-primary">
                  Sign up
                </NavLink>
              </p>
            </fieldset>
          </div>
        </div>
      </div>
    </div>
  );
}
