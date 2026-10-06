import "./App.css";

import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Weather from "./pages/Weather.jsx";
import { Route, Routes } from "react-router-dom";

export const description = "An interactive area chart";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/weather" element={<Weather />} />
      </Routes>
    </>
  );
}

export default App;
