import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Interview from './pages/Interview';
import Result from './pages/Result';

export default function App() {
  const [sessionData, setSessionData] = useState(null);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home setSessionData={setSessionData} />} />
        <Route path="/interview" element={<Interview sessionData={sessionData} setSessionData={setSessionData} />} />
        <Route path="/result" element={<Result sessionData={sessionData} />} />
      </Routes>
    </Router>
  );
}
