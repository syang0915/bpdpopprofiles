import React, { useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MOCK_OFFICERS, RANKS, getChoroplethColor } from "./data";
import { Officer, District } from "./types";
import { Search, MessageSquare, ShieldAlert, Filter } from "lucide-react";

const PoliceDashboard: React.FC = () => {
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    null
  );
  const [rankFilter, setRankFilter] = useState<string>("All");
  const [chatInput, setChatInput] = useState("");

  // 1. Filter and Sort Officers
  const filteredOfficers = useMemo(() => {
    return MOCK_OFFICERS.filter((o) => o.districtId === selectedDistrictId)
      .filter((o) => rankFilter === "All" || o.rank === rankFilter)
      .sort((a, b) => b.totalSeverityScore - a.totalSeverityScore);
  }, [selectedDistrictId, rankFilter]);

  // 2. Map Styling Logic
  const districtStyle = (feature: any) => {
    // In production, calculate district score from its specific officers
    const score = 50; // Replace with dynamic logic
    return {
      fillColor: getChoroplethColor(score),
      weight: 2,
      opacity: 1,
      color: "white",
      dashArray: "3",
      fillOpacity: 0.7,
    };
  };

  const onEachDistrict = (feature: any, layer: any) => {
    layer.on({
      click: () => setSelectedDistrictId(feature.properties.DISTRICT),
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({ fillOpacity: 0.9, weight: 3 });
      },
      mouseout: (e: any) => {
        const l = e.target;
        l.setStyle({ fillOpacity: 0.7, weight: 2 });
      },
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Filter Bar */}
      <header className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-red-600" />
          <h1 className="font-bold text-lg">
            Boston Police Accountability Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border">
            <Filter size={16} className="text-slate-500" />
            <select
              className="bg-transparent text-sm outline-none cursor-pointer"
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value)}
            >
              <option value="All">All Ranks</option>
              {RANKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Left Side: Choropleth Map */}
        <div className="flex-1 relative border-r bg-white">
          <MapContainer
            center={[42.3601, -71.0589]}
            zoom={12}
            className="h-full w-full"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {/* 
              In real usage, replace null with your GeoJSON object:
              <GeoJSON data={bostonGeoJson} style={districtStyle} onEachFeature={onEachDistrict} /> 
            */}
          </MapContainer>
          {!selectedDistrictId && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white px-4 py-2 rounded-full shadow-lg border text-sm font-medium">
              Select a district to view officer profiles
            </div>
          )}
        </div>

        {/* Right Side: Profile Sidebar */}
        <aside className="w-96 flex flex-col bg-white shadow-xl overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-bold text-lg">
              District: {selectedDistrictId || "---"}
            </h2>
            <p className="text-xs text-slate-500">
              Sorted by Severity Score (Highest First)
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {filteredOfficers.length > 0 ? (
              filteredOfficers.map((officer) => (
                <div
                  key={officer.id}
                  className="p-4 border rounded-xl hover:border-red-300 transition-colors shadow-sm bg-white"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-slate-800">
                        {officer.name}
                      </h3>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded-full text-slate-600 border uppercase">
                        {officer.rank}
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          officer.totalSeverityScore > 70
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        Score: {officer.totalSeverityScore}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-sm space-y-1">
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                      Latest Incident
                    </p>
                    <p className="font-semibold text-slate-700">
                      {officer.misconductHistory[0].type}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {officer.misconductHistory[0].date}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-6">
                <Search size={48} className="mb-2 opacity-20" />
                <p>No officers found matching filters in this district.</p>
              </div>
            )}
          </div>

          {/* Bottom Section: Chatbot */}
          <div className="p-4 border-t bg-slate-50">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={18} className="text-blue-600" />
              <span className="text-sm font-bold text-slate-700">
                District Data Assistant
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask about misconduct trends..."
                className="flex-1 text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors">
                <Search size={18} />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center uppercase tracking-widest">
              Powered by Local Accountability Data
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default PoliceDashboard;
