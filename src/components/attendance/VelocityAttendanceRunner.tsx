"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  getStudentsForAttendanceAction, 
  submitStudentAttendanceAction 
} from "@/lib/actions/attendance-actions";
import { getClassesAction, getSectionsAction } from "@/lib/actions/academic-actions";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Smartphone, 
  MessageSquare, 
  ExternalLink,
  Users,
  Search,
  Zap,
  ShieldCheck,
  AlertCircle,
  Plus,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// 🏛️ SOVEREIGN UI INLINE: Replacing missing UI components with native Tailwind standards
const Button = ({ children, className, ...props }: any) => (
  <button 
    className={cn("inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", className)} 
    {...props}
  >
    {children}
  </button>
);

const Card = ({ children, className, ...props }: any) => (
  <div className={cn("rounded-xl border bg-card text-card-foreground shadow", className)} {...props}>
    {children}
  </div>
);

const Input = ({ className, ...props }: any) => (
  <input 
    className={cn("flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)} 
    {...props} 
  />
);

/**
 * ⚡ VELOCITY ATTENDANCE RUNNER (v1.2)
 * 
 * High-speed attendance tracking with WhatsApp Link-Bridge.
 */
export default function VelocityAttendanceRunner() {
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedSection, setSelectedSection] = useState("");
    const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showManifest, setShowManifest] = useState(false);
    const [lockTimer, setLockTimer] = useState<number | null>(null);

    // 1. Initial Foundation
    useEffect(() => {
        getClassesAction().then(res => {
            if (res.success) setClasses(res.data);
        });
    }, []);

    // 2. Section Context
    useEffect(() => {
        if (selectedClass) {
            getSectionsAction(selectedClass).then(res => {
                if (res.success) setSections(res.data);
            });
        }
    }, [selectedClass]);

    // 3. Roster Loading
    const loadRoster = async () => {
        if (!selectedSection) return;
        const res = await getStudentsForAttendanceAction(selectedSection, new Date().toISOString().split('T')[0]);
        if (res.success) {
            setStudents(res.data);
            // Initialize map with current status or default to Present
            const initialMap: Record<string, string> = {};
            res.data.forEach((s: any) => {
                initialMap[s.id] = s.attendance[0]?.status || "Present";
            });
            setAttendanceMap(initialMap);
        }
    };

    // 4. Attendance Toggles
    const toggleStatus = (studentId: string) => {
        if (lockTimer !== null) {
            alert("Record is currently under synchronization or frozen.");
            return;
        }
        setAttendanceMap(prev => ({
            ...prev,
            [studentId]: prev[studentId] === "Present" ? "Absent" : "Present"
        }));
    };

    const markAllPresent = () => {
        const newMap = { ...attendanceMap };
        students.forEach(s => newMap[s.id] = "Present");
        setAttendanceMap(newMap);
        alert("Zero-Friction: All students marked as Present.");
    };

    // 5. Atomic Submission
    const handleSubmit = async () => {
        setIsSubmitting(true);
        const records = Object.entries(attendanceMap).map(([id, status]) => ({
            studentId: id,
            status,
            date: new Date().toISOString().split('T')[0],
            classId: selectedClass,
            sectionId: selectedSection,
            session: "Morning"
        }));

        try {
            const res = await submitStudentAttendanceAction(records);
            if (res.success) {
                alert("Attendance Sealed Successfully.");
                setShowManifest(true);
                // Start 10-minute correction timer (600 seconds)
                setLockTimer(600);
            } else {
                alert(res.error || "Submission failure");
            }
        } catch (e: any) {
            alert("Critical Submission Failure: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // 6. Manifest Link Bridge
    const sendWhatsApp = (student: any) => {
        const phone = student.family?.whatsappNumber;
        if (!phone) {
            alert("No WhatsApp number found for this lineage.");
            return;
        }
        const text = `Dear Parent, ${student.firstName} is marked ABSENT from school today (${new Date().toLocaleDateString()}). Kindly contact the office for details.`;
        const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    // Filters
    const filteredStudents = useMemo(() => {
        return students.filter(s => 
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [students, searchQuery]);

    // Timer Logic
    useEffect(() => {
        if (lockTimer !== null && lockTimer > 0) {
            const interval = setInterval(() => setLockTimer(t => (t as number) - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [lockTimer]);

    const formatTimer = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="space-y-8 p-4 max-w-7xl mx-auto">
            {/* 🛠️ Selection & Command Bar */}
            <Card className="p-6 bg-zinc-950/40 border-zinc-800 backdrop-blur-xl rounded-3xl sticky top-20 z-40 shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Grade</label>
                        <select 
                            className="w-full h-12 bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            <option value="">Select Grade</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Section</label>
                        <select 
                            className="w-full h-12 bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                            onChange={(e) => setSelectedSection(e.target.value)}
                        >
                            <option value="">Select Section</option>
                            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <Button 
                            onClick={loadRoster} 
                            disabled={!selectedSection}
                            className="w-full h-12 bg-blue-600 hover:bg-blue-500 font-bold"
                        >
                            Load Roster
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search Students..." 
                            className="h-12 pl-12 bg-zinc-900 border-zinc-700" 
                        />
                    </div>
                </div>
                
                {students.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-zinc-800 flex justify-between items-center">
                        <div className="flex gap-4">
                             <Button variant="outline" size="sm" onClick={markAllPresent} className="gap-2 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10">
                                <Zap className="w-4 h-4" /> Present All
                             </Button>
                        </div>
                        <div className="flex items-center gap-6">
                            {lockTimer !== null && (
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 animate-pulse">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm font-black mono uppercase tracking-tighter">Freeze: {formatTimer(lockTimer)}</span>
                                </div>
                            )}
                            <Button 
                                onClick={handleSubmit} 
                                disabled={isSubmitting || students.length === 0}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 h-12 rounded-xl font-black shadow-xl shadow-emerald-500/20"
                            >
                                {isSubmitting ? "SEALING..." : "SEAL ATTENDANCE"}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* 👤 Student Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <AnimatePresence>
                    {filteredStudents.map((s) => (
                        <motion.div
                            key={s.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleStatus(s.id)}
                            className={`cursor-pointer group relative p-4 rounded-3xl border-2 transition-all duration-300 h-32 flex flex-col justify-center items-center gap-2 shadow-lg
                                ${attendanceMap[s.id] === 'Present' 
                                    ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10' 
                                    : 'bg-red-500/5 border-red-500/40 hover:border-red-500 shadow-red-500/10'
                                }`}
                        >
                            <div className="absolute top-2 right-2">
                                {attendanceMap[s.id] === 'Present' 
                                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    : <XCircle className="w-5 h-5 text-red-500" />
                                }
                            </div>
                            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">{s.admissionNumber || "S-00"}</span>
                            <span className="text-sm font-black text-white text-center leading-tight truncate w-full px-2">{s.firstName} {s.lastName}</span>
                            <div className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${attendanceMap[s.id] === 'Present' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                {attendanceMap[s.id]}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* 📢 WhatsApp manifest Modal */}
            <AnimatePresence>
                {showManifest && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowManifest(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl relative z-10"
                        >
                            <div className="p-8 border-b border-zinc-800 bg-emerald-500/5 flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                        <ShieldCheck className="w-8 h-8 text-emerald-500" />
                                        Sovereign Manifest
                                    </h2>
                                    <p className="text-sm text-zinc-500">Attendance Sealed. {students.filter(s => attendanceMap[s.id] === 'Absent').length} Absentees Detected.</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setShowManifest(false)} className="text-zinc-500">
                                    <XCircle className="w-6 h-6" />
                                </Button>
                            </div>

                            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] mb-4 block">Pending Notifications</label>
                                {students.filter(s => attendanceMap[s.id] === 'Absent').length === 0 ? (
                                    <div className="p-8 rounded-2xl border-2 border-dashed border-zinc-800 flex flex-col items-center gap-4">
                                        <CheckCircle2 className="w-12 h-12 text-zinc-800" />
                                        <p className="text-zinc-500 font-bold uppercase italic tracking-widest">All Students Present. No Action Required.</p>
                                    </div>
                                ) : (
                                    students.filter(s => attendanceMap[s.id] === 'Absent').map(s => (
                                        <div key={s.id} className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex justify-between items-center group hover:border-emerald-500/30 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                                    <AlertCircle className="w-6 h-6 text-red-500" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-black">{s.firstName} {s.lastName}</p>
                                                    <p className="text-xs text-zinc-500">Parent: {s.family?.fatherName || "Unknown"}</p>
                                                </div>
                                            </div>
                                            <Button 
                                                onClick={() => sendWhatsApp(s)}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-bold rounded-xl"
                                                size="sm"
                                            >
                                                <MessageSquare className="w-4 h-4 fill-current" />
                                                Notify WA
                                                <ExternalLink className="w-3 h-3 opacity-50" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            <div className="p-8 bg-zinc-900/30 border-t border-zinc-800 text-center">
                                <Button onClick={() => setShowManifest(false)} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-12">
                                    Continue Overseeing
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
