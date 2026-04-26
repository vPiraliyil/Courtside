import { BrowserRouter, Routes, Route } from 'react-router-dom';

function Home() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
      <h1 className="text-5xl font-bold text-[#00ff87]">Courtside</h1>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
