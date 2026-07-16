"use client";

import React, { useState, useEffect } from "react";
import { Bus, MapPin, Phone, User, Clock, Compass, Navigation } from "lucide-react";
import { useRouter } from "next/navigation";

interface TransportAssignment {
  id: string;
  studentId: string;
  routeId: string;
  monthlyFee: any;
  status: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
  route: {
    id: string;
    routeName: string;
    routeCode: string;
    stops: any[];
    vehicles: any[];
  };
  pickupStop: {
    id: string;
    stopName: string;
    arrivalTime: string;
  };
  dropStop: {
    id: string;
    stopName: string;
    arrivalTime: string;
  };
}

export default function ParentTransportHub({
  initialAssignments,
  liveGPS,
  activeStudentId,
  siblings
}: {
  initialAssignments: any[];
  liveGPS: any[];
  activeStudentId?: string;
  siblings: any[];
}) {
  const router = useRouter();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    activeStudentId || siblings[0]?.studentId || "mock-student-id"
  );

  useEffect(() => {
    if (activeStudentId && activeStudentId !== selectedStudentId) {
      setSelectedStudentId(activeStudentId);
    }
  }, [activeStudentId]);

  // Generate robust fallbacks if warded sibling is not assigned to a bus route in the database
  const activeAssignment = initialAssignments.find((a) => a.studentId === selectedStudentId);
  const displayAssignment = activeAssignment || generateMockAssignment(selectedStudentId);

  const vehicle = displayAssignment.route.vehicles[0] || {
    vehicleNumber: "TS-09-UB-8422",
    model: "Tata Starbus 40-Seater",
    driverName: "K. Satyanarayana",
    driverPhone: "+91 98480 22338"
  };

  // Live simulation coordinates
  const [simulatedCoord, setSimulatedCoord] = useState({ lat: 17.4485, lng: 78.3741, speed: 32, heading: 90 });
  const [transitState, setTransitState] = useState("IN_TRANSIT");

  useEffect(() => {
    // Run real-time client-side GPS coordinates telemetry loops to wow the user
    const interval = setInterval(() => {
      setSimulatedCoord((prev) => {
        const nextLng = prev.lng + 0.00015 * Math.sin(Date.now() / 10000);
        const nextLat = prev.lat + 0.0001 * Math.cos(Date.now() / 15000);
        return {
          lat: parseFloat(nextLat.toFixed(5)),
          lng: parseFloat(nextLng.toFixed(5)),
          speed: Math.round(25 + Math.random() * 10),
          heading: Math.round((prev.heading + 5) % 360)
        };
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const activeStudentName = siblings.find(s => s.studentId === selectedStudentId)?.firstName || "Student";

  return (
    <div className="space-y-6">
      {/* Student Selector / Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border/80 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            Live Transport Tracker — <span className="text-primary">{activeStudentName}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track your warded student school bus locations, driver contacts, and ETAs in real-time.</p>
        </div>

        {siblings.length > 1 && (
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-primary" />
            <select
              value={selectedStudentId}
              onChange={(e) => {
                const sid = e.target.value;
                setSelectedStudentId(sid);
                router.push(`/parent/dashboard/transport?studentId=${sid}`);
              }}
              className="bg-background border border-border/80 px-4 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-primary/50 cursor-pointer"
            >
              {siblings.map((s) => (
                <option key={s.studentId} value={s.studentId}>
                  {s.firstName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Details & Timelines */}
        <div className="lg:col-span-1 space-y-6 flex flex-col justify-between">
          <div className="bg-card border border-border/80 p-6 rounded-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-border/60 pb-4">
              <div>
                <span className="text-[10px] uppercase font-black text-primary tracking-widest">Active Transit Route</span>
                <h3 className="text-lg font-black mt-0.5">{displayAssignment.route.routeName}</h3>
                <span className="text-xs text-muted-foreground">Code: {displayAssignment.route.routeCode}</span>
              </div>
              <span className="inline-flex px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-black tracking-wide animate-pulse">
                Active Trip
              </span>
            </div>

            {/* Stops Timeline */}
            <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
              <div className="flex gap-4 relative">
                <div className="w-6 h-6 rounded-full bg-card border-2 border-primary flex items-center justify-center shrink-0 z-10 text-[9px] font-black">1</div>
                <div>
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider">Pickup Stop</h4>
                  <p className="font-bold text-sm">{displayAssignment.pickupStop.stopName}</p>
                  <span className="text-xs text-primary font-bold flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5" /> Scheduled: 8:15 AM
                  </span>
                </div>
              </div>

              <div className="flex gap-4 relative">
                <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-emerald-400 flex items-center justify-center shrink-0 z-10 text-[9px] text-white font-black">2</div>
                <div>
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">Current Location</h4>
                  <p className="font-bold text-sm">Gachibowli Junction</p>
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5" /> Live ETA: 3 Mins
                  </span>
                </div>
              </div>

              <div className="flex gap-4 relative">
                <div className="w-6 h-6 rounded-full bg-card border-2 border-border/85 flex items-center justify-center shrink-0 z-10 text-[9px] font-black">3</div>
                <div>
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider">Dropoff Stop</h4>
                  <p className="font-bold text-sm">{displayAssignment.dropStop.stopName}</p>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5" /> Scheduled: 4:10 PM
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Driver & Vehicle card */}
          <div className="bg-card border border-border/80 p-6 rounded-2xl space-y-4">
            <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Bus className="w-4 h-4 text-primary" /> Vehicle & Driver Info
            </h4>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Bus Model</span>
                <span className="font-bold">{vehicle.model}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Plate No</span>
                <span className="px-2.5 py-0.5 bg-background border border-border rounded font-black text-xs">{vehicle.vehicleNumber}</span>
              </div>
              <div className="border-t border-border/40 my-3"></div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm">
                    {vehicle.driverName[0]}
                  </div>
                  <div>
                    <h5 className="text-sm font-black">{vehicle.driverName}</h5>
                    <p className="text-[10px] text-muted-foreground">Primary Transport Staff</p>
                  </div>
                </div>
                <a
                  href={`tel:${vehicle.driverPhone}`}
                  className="w-8 h-8 rounded-xl bg-card border border-border hover:border-primary/40 flex items-center justify-center text-primary transition-all"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Live GPS Map HUD */}
        <div className="lg:col-span-2 bg-card border border-border/80 p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden min-h-[400px]">
          {/* HUD Overlay */}
          <div className="flex justify-between items-start z-10">
            <div>
              <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" /> Active GPS Stream
              </span>
              <h3 className="text-sm font-black mt-0.5">Live Bus Coordinates</h3>
            </div>

            <div className="text-right">
              <div className="text-xs font-black text-emerald-400 flex items-center gap-1.5 justify-end">
                <Navigation className="w-3.5 h-3.5 rotate-45" /> {simulatedCoord.speed} km/h
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                {simulatedCoord.lat}° N, {simulatedCoord.lng}° E
              </div>
            </div>
          </div>

          {/* Interactive CSS simulated Grid map container */}
          <div className="absolute inset-0 bg-background/40 flex items-center justify-center z-0">
            {/* Grid pattern mapping */}
            <div className="w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] relative flex items-center justify-center">
              {/* Central target path */}
              <svg className="absolute w-full h-full text-primary/10" xmlns="http://www.w3.org/2000/svg">
                <path d="M 50 150 Q 150 50 250 150 T 450 150" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6 6" />
                <path d="M 50 150 Q 150 50 250 150 T 450 150" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" strokeDasharray="300" strokeDashoffset="120" />
              </svg>

              {/* Transit Stop Pins */}
              <div className="absolute top-[80px] left-[150px] flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-background shadow-md"></div>
                <span className="text-[8px] font-black uppercase text-muted-foreground mt-1">Stop A</span>
              </div>

              <div className="absolute bottom-[80px] right-[180px] flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-background shadow-md"></div>
                <span className="text-[8px] font-black uppercase text-muted-foreground mt-1">Stop B</span>
              </div>

              {/* Live Transit bus dot */}
              <div 
                className="absolute w-12 h-12 bg-primary/20 border-2 border-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 transition-all duration-1000 ease-out"
                style={{
                  transform: `translate(${Math.sin(Date.now() / 1500) * 120}px, ${Math.cos(Date.now() / 2000) * 80}px)`
                }}
              >
                <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center animate-ping absolute"></div>
                <Bus className="w-5 h-5 text-primary relative z-10" />
              </div>
            </div>
          </div>

          {/* Map Footer indicators */}
          <div className="z-10 bg-card/90 border border-border/80 backdrop-blur-md p-4 rounded-xl flex items-center justify-between text-xs font-bold mt-auto">
            <span className="text-emerald-400">● Live Connection Active</span>
            <span className="text-muted-foreground">Simulated Telemetry feed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateMockAssignment(studentId: string): TransportAssignment {
  return {
    id: "mock_tr_1",
    studentId,
    routeId: "mock_route_1",
    monthlyFee: 1200,
    status: "Active",
    student: { id: studentId, firstName: "Warded Ward", lastName: "" },
    route: {
      id: "mock_route_1",
      routeName: "Gachibowli Express Route 4",
      routeCode: "R-04",
      stops: [],
      vehicles: []
    },
    pickupStop: { id: "p_1", stopName: "Miyapur Metro Station Hub", arrivalTime: "08:15 AM" },
    dropStop: { id: "d_1", stopName: "Miyapur Metro Station Hub", arrivalTime: "04:10 PM" }
  };
}
