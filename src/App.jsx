import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Home from "@/pages/Home";
import Broadcaster from "@/pages/Broadcaster";
import Viewer from "@/pages/Viewer";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/broadcaster" element={<Broadcaster />} />
        <Route path="/viewer" element={<Viewer />} />
      </Routes>
      <Toaster richColors position="top-center" />
    </HashRouter>
  );
}
