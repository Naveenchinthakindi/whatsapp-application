import React from "react";
import { Link, Outlet } from "react-router";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  return (
    <div>
      <ToastContainer position="top-right" autoClose={3000}/>
      <nav>
        <ul className="flex bg-blue-400 space-x-52 p-5">
          <li className="cursor-pointer">
            <Link to="/">Home</Link>
          </li>
          <li className="cursor-pointer">
            <Link to="/login">Login</Link>
          </li>
        </ul>
      </nav>
      <Outlet />
    </div>
  );
};

export default App;
