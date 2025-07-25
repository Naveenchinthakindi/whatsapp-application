import React from "react";
import { Link, Outlet } from "react-router";

const App = () => {
  return (
    <div>
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
