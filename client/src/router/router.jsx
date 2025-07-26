import { createBrowserRouter } from 'react-router'
import Login from "../pages/user-login/Login";
import App from "../App";
import Home from "../pages/Home";

const childRoutes = [
  {
    index:true, // Handles parent's exact path
    element: <Home />,
  },
  {
    path: "login", // Relative to parent
    element: <Login />,
  },
  {
    path:"*", //wildcard
    element:<h1>Error </h1>
  }
];

export const router = createBrowserRouter([
  {
    path: "/",
    Component:App,
    children: childRoutes,
  },
]);
