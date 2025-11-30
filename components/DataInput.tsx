
import React, { useState, useRef } from 'react';
import { Plus, Trash2, Users, Calendar, Layers, MapPin, X, AlertOctagon, Edit3, Hash, ChevronRight, ChevronLeft, ChevronUp, ChevronDown } from 'lucide-react';
import { Observer, Committee, ObserverRole, ExamDay, DailyAbsenceMap, DailyManualAssignmentMap, ManualAssignment } from '../types';

interface DataInputProps {
  observers: Observer[];
  committees: Committee[];
  setObservers: React.Dispatch<React.SetStateAction<Observer[]>>;
  setCommittees: React.Dispatch<React.SetStateAction<Committee[]>>;
  schedule: ExamDay[];
  setSchedule: React.Dispatch<React.SetStateAction<ExamDay[]>>;
  selectedDayId: string;
  setSelectedDayId: React.Dispatch<React.SetStateAction<string>>;
  // New props for daily management
  dailyAbsence: DailyAbsenceMap;
  setDailyAbsence: React.Dispatch<React.SetStateAction<DailyAbsenceMap>>;
  getObservationCount: (observerId: string) => number;
  // Manual Assignment
  dailyManualAssignments: DailyManualAssignmentMap;
  setDailyManualAssignments: React.Dispatch<React.SetStateAction<DailyManualAssignmentMap>>;
}

export const DataInput: React.FC<DataInputProps> = ({ 
    observers, committees, setObservers, setCommittees, 
    schedule, setSchedule, selectedDayId, setSelectedDayId,
    dailyAbsence, setDailyAbsence, getObservationCount,
    dailyManualAssignments, setDailyManualAssignments
}) => {
  const [newCommitteeName, setNewCommitteeName] = useState('');
  const [subCount, setSubCount] = useState(10);
  
  // New Leadership States
  const [newHeadName, setNewHeadName] = useState('');
  const [newAsst1, setNewAsst1] = useState('');
  const [newAsst2, setNewAsst2] = useState('');

  const [bulkNames, setBulkNames] = useState('');

  // Modal State for Manual Assignment
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentObserver, setAssignmentObserver] = useState<Observer | null>(null);
  const [selectedCommId, setSelectedCommId] = useState<string>('');
  const [selectedSubNum, setSelectedSubNum] = useState<number>(1);

  // Modal State for Warning
  const [warningModal, setWarningModal] = useState<{ isOpen: boolean, commName: string, subNum: number } | null>(null);
  
  // Scroll Refs
  const scheduleScrollRef = useRef<HTMLDivElement>(null);
  const scheduleVerticalRef = useRef<HTMLDivElement>(null);

  // Get active day data
  const currentDay = schedule.find(d => d.id === selectedDayId);
  // Format date for display (DD/MM/YYYY)
  const activeDayDate = currentDay?.date ? currentDay.date.split('-').reverse().join('/') : '';
  const activeDayLabel = currentDay ? `${currentDay.dayOfWeek} ${activeDayDate}`.trim() : "اليوم المحدد";

  const updateObserverRole = (id: string, newRole: ObserverRole) => {
    setObservers(prev => prev.map(obs => obs.id === id ? { ...obs, role: newRole } : obs));
  };

  const updateObserverDepartment = (id: string, newDept: string) => {
    setObservers(prev => prev.map(obs => obs.id === id ? { ...obs, department: newDept } : obs));
  };

  const toggleAbsence = (observerId: string) => {
      setDailyAbsence(prev => {
          const dayRecords = prev[selectedDayId] || {};
          const isAbsent = !!dayRecords[observerId];
          return {
              ...prev,
              [selectedDayId]: {
                  ...dayRecords,
                  [observerId]: !isAbsent
              }
          };
      });
  };
  
  const scrollSchedule = (direction: 'left' | 'right') => {
      if (scheduleScrollRef.current) {
          const scrollAmount = 300;
          scheduleScrollRef.current.scrollBy({
              left: direction === 'left' ? -scrollAmount : scrollAmount,
              behavior: 'smooth'
          });
      }
  };

  const scrollVertical = (direction: 'up' | 'down') => {
      if (scheduleVerticalRef.current) {
          const scrollAmount = 120;
          scheduleVerticalRef.current.scrollBy({
              top: direction === 'up' ? -scrollAmount : scrollAmount,
              behavior: 'smooth'
          });
      }
  };

  // --- MANUAL ASSIGNMENT LOGIC ---
  
  const openAssignmentModal = (obs: Observer) => {
      setAssignmentObserver(obs);
      const existing = dailyManualAssignments[selectedDayId]?.[obs.id];
      if (existing) {
          setSelectedCommId(existing.committeeId);
          setSelectedSubNum(existing.subCommitteeNumber);
      } else {
          setSelectedCommId(committees[0]?.id || '');
          setSelectedSubNum(1);
      }
      setIsAssignmentModalOpen(true);
  };

  const saveManualAssignment = () => {
      if (!assignmentObserver || !selectedCommId) return;

      // VALIDATION: Check if room already has 2 observers
      const dayAssignments = dailyManualAssignments[selectedDayId] || {};
      
      // Count how many people are assigned to this Comm + Sub (excluding current user if editing)
      let occupants = 0;
      Object.entries(dayAssignments).forEach(([obsId, assign]) => {
          const assignment = assign as ManualAssignment;
          if (obsId !== assignmentObserver.id && assignment.committeeId === selectedCommId && assignment.subCommitteeNumber === selectedSubNum) {
              occupants++;
          }
      });

      if (occupants >= 2) {
          const commName = committees.find(c => c.id === selectedCommId)?.name || 'غير معروف';
          // Open custom warning modal instead of alert
          setWarningModal({
              isOpen: true,
              commName: commName,
              subNum: selectedSubNum
          });
          return;
      }

      setDailyManualAssignments(prev => ({
          ...prev,
          [selectedDayId]: {
              ...(prev[selectedDayId] || {}),
              [assignmentObserver.id]: {
                  committeeId: selectedCommId,
                  subCommitteeNumber: selectedSubNum
              }
          }
      }));
      setIsAssignmentModalOpen(false);
  };

  const clearManualAssignment = (obsId: string) => {
      setDailyManualAssignments(prev => {
          const dayRecord = { ...(prev[selectedDayId] || {}) };
          delete dayRecord[obsId];
          return {
              ...prev,
              [selectedDayId]: dayRecord
          };
      });
  };

  const addBulkObservers = () => {
    if (!bulkNames.trim()) return;
    const lines = bulkNames.split('\n').filter(n => n.trim().length > 0);
    const newObs = lines.map((line, idx): Observer | null => {
      const parts = line.split(/[,،\t]/).map(p => p.trim());
      const name = parts[0];
      const dept = parts[1];
      const roleStr = parts[2] ? parts[2].toLowerCase() : '';
      let role: ObserverRole = 'mullahiz';
      if (roleStr.includes('مراقب')) role = 'muraqib';
      if (roleStr.includes('احتياط')) role = 'reserve';

      if (!name) return null;

      return {
        id: `${Date.now()}-${idx}`,
        name: name,
        department: dept || undefined,
        role: role
      };
    }).filter((item): item is Observer => item !== null);

    setObservers(prev => [...prev, ...newObs]);
    setBulkNames('');
  };
  
  const handleDeleteAllObservers = () => {
      if (window.confirm("هل أنت متأكد من حذف جميع بيانات العاملين (الأسماء والأقسام)؟ لا يمكن التراجع عن هذا الإجراء.")) {
          setObservers([]);
      }
  };

  const addCommittee = () => {
    if (!newCommitteeName.trim()) return;
    setCommittees(prev => [...prev, {
      id: Date.now().toString(),
      name: newCommitteeName,
      subCommitteesCount: subCount,
      observersPerRoom: 2,
      headName: newHeadName,
      assistantName1: newAsst1,
      assistantName2: newAsst2
    }]);
    setNewCommitteeName('');
    setNewHeadName('');
    setNewAsst1('');
    setNewAsst2('');
  };

  const addGradeCommittees = () => {
    const newComms: Committee[] = [
        {
            id: `grade-10-${Date.now()}`,
            name: "لجنة الصف العاشر",
            subCommitteesCount: 8,
            observersPerRoom: 2,
            headName: "مراقب عاشر",
            assistantName1: "",
            assistantName2: ""
        },
        {
            id: `grade-11s-${Date.now()}`,
            name: "لجنة الصف الحادي عشر علمي (11ع)",
            subCommitteesCount: 6,
            observersPerRoom: 2,
            headName: "مراقب 11ع",
            assistantName1: "",
            assistantName2: ""
        },
        {
            id: `grade-11d-${Date.now()}`,
            name: "لجنة الصف الحادي عشر أدبي (11د)",
            subCommitteesCount: 5,
            observersPerRoom: 2,
            headName: "مراقب 11د",
            assistantName1: "",
            assistantName2: ""
        },
        {
            id: `grade-12s-${Date.now()}`,
            name: "لجنة الصف الثاني عشر علمي (12ع)",
            subCommitteesCount: 6,
            observersPerRoom: 2,
            headName: "مراقب 12ع",
            assistantName1: "",
            assistantName2: ""
        },
        {
            id: `grade-12d-${Date.now()}`,
            name: "لجنة الصف الثاني عشر أدبي (12د)",
            subCommitteesCount: 5,
            observersPerRoom: 2,
            headName: "مراقب 12د",
            assistantName1: "",
            assistantName2: ""
        }
    ];
    setCommittees(prev => [...prev, ...newComms]);
  };

  const removeCommittee = (id: string) => {
    setCommittees(prev => prev.filter(c => c.id !== id));
  };
  
  const updateCommittee = (id: string, field: keyof Committee, value: any) => {
      setCommittees(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeObserver = (id: string) => {
    setObservers(prev => prev.filter(o => o.id !== id));
  };

  const updateSchedule = (id: string, field: keyof ExamDay, value: string) => {
      setSchedule(prev => prev.map(day => {
          if (day.id !== id) return day;
          
          const updatedDay = { ...day, [field]: value };
          if (field === 'date' && value) {
              const dateObj = new Date(value);
              if (!isNaN(dateObj.getTime())) {
                  const daysArabic = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
                  updatedDay.dayOfWeek = daysArabic[dateObj.getUTCDay()];
              }
          }
          return updatedDay;
      }));
  };

  return (
    <div className="space-y-6">
        {/* Schedule Grid - Indigo Theme */}
        <div className="bg-white p-0 rounded-xl shadow-lg border-4 border-indigo-900 overflow-hidden relative group">
             <div className="flex items-center gap-3 p-4 bg-indigo-900 text-white">
                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-md border-2 border-white ring-2 ring-blue-300">
                    <Calendar size={24} className="stroke-[3]" />
                </div>
                <div>
                    <h2 className="font-extrabold text-2xl">الجدول الزمني (10 أيام)</h2>
                    <p className="text-xs font-bold text-indigo-200 opacity-90">حدد اليوم النشط لإدارة التوزيع والغياب الخاص به</p>
                </div>
             </div>
             
             {/* Horizontal Navigation Arrows */}
             <div className="absolute top-1/2 left-2 z-10 transform -translate-y-1/2 md:block hidden">
                 <button 
                    onClick={() => scrollSchedule('left')}
                    className="bg-indigo-700 text-white p-2 rounded-full shadow-lg hover:bg-indigo-600 transition border-2 border-white opacity-80 hover:opacity-100"
                 >
                     <ChevronLeft size={24} className="stroke-[3]" />
                 </button>
             </div>
             <div className="absolute top-1/2 right-2 z-10 transform -translate-y-1/2 md:block hidden">
                 <button 
                    onClick={() => scrollSchedule('right')}
                    className="bg-indigo-700 text-white p-2 rounded-full shadow-lg hover:bg-indigo-600 transition border-2 border-white opacity-80 hover:opacity-100"
                 >
                     <ChevronRight size={24} className="stroke-[3]" />
                 </button>
             </div>

             {/* Vertical Navigation Arrows (New) */}
             <div className="absolute top-[88px] left-1/2 z-20 transform -translate-x-1/2 md:block hidden pointer-events-auto">
                 <button 
                    onClick={() => scrollVertical('up')}
                    className="bg-indigo-700 text-white p-1 rounded-full shadow-lg hover:bg-indigo-600 transition border-2 border-white opacity-80 hover:opacity-100"
                    title="تحرك لأعلى"
                 >
                     <ChevronUp size={20} className="stroke-[3]" />
                 </button>
             </div>
             <div className="absolute bottom-4 left-1/2 z-20 transform -translate-x-1/2 md:block hidden pointer-events-auto">
                 <button 
                    onClick={() => scrollVertical('down')}
                    className="bg-indigo-700 text-white p-1 rounded-full shadow-lg hover:bg-indigo-600 transition border-2 border-white opacity-80 hover:opacity-100"
                    title="تحرك للأسفل"
                 >
                     <ChevronDown size={20} className="stroke-[3]" />
                 </button>
             </div>

             <div 
                ref={scheduleScrollRef}
                className="p-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-indigo-200"
             >
                 <div className="min-w-[1000px]">
                     <div className="grid grid-cols-12 gap-2 mb-3 text-sm font-extrabold text-gray-900 text-center uppercase tracking-wider">
                         <div className="col-span-1">تحديد</div>
                         <div className="col-span-1">اليوم</div>
                         <div className="col-span-2">التاريخ (قائمة)</div>
                         <div className="col-span-1 text-emerald-700">عاشر</div>
                         <div className="col-span-1 text-black">11ع</div>
                         <div className="col-span-1 text-red-700">11د</div>
                         <div className="col-span-2 text-emerald-700 border-r-2 border-gray-300">12ع</div>
                         <div className="col-span-2 text-black">12د</div>
                     </div>
                     <div ref={scheduleVerticalRef} className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-indigo-300">
                        {schedule.map((day) => (
                            <div 
                                key={day.id} 
                                className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg border-2 transition-all ${selectedDayId === day.id ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                            >
                                <div className="col-span-1 flex justify-center">
                                    <input 
                                        type="radio" 
                                        name="activeDay"
                                        checked={selectedDayId === day.id}
                                        onChange={() => setSelectedDayId(day.id)}
                                        className="w-6 h-6 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                    />
                                </div>
                                <div className="col-span-1">
                                     <input 
                                        type="text" 
                                        placeholder="السبت..."
                                        value={day.dayOfWeek}
                                        onChange={(e) => updateSchedule(day.id, 'dayOfWeek', e.target.value)}
                                        className="w-full p-2 text-sm font-extrabold text-white bg-indigo-600 border-none rounded text-center shadow-sm placeholder-gray-400 focus:bg-indigo-700 transition"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="date" 
                                        value={day.date}
                                        onChange={(e) => updateSchedule(day.id, 'date', e.target.value)}
                                        className="w-full p-2 text-sm font-extrabold text-white bg-indigo-600 border-none rounded text-center shadow-sm focus:bg-indigo-700 transition outline-none cursor-pointer"
                                    />
                                </div>
                                {/* Grade 10 - Emerald */}
                                <div className="col-span-1">
                                    <input 
                                        type="text" 
                                        value={day.subject10}
                                        onChange={(e) => updateSchedule(day.id, 'subject10', e.target.value)}
                                        className="w-full p-2 text-xs font-extrabold text-gray-900 bg-white border-2 border-emerald-200 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-center"
                                    />
                                </div>
                                {/* Grade 11S - Black */}
                                <div className="col-span-1">
                                    <input 
                                        type="text" 
                                        placeholder="11ع"
                                        value={day.subject11Sci}
                                        onChange={(e) => updateSchedule(day.id, 'subject11Sci', e.target.value)}
                                        className="w-full p-2 text-xs font-extrabold text-gray-900 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-black outline-none text-center"
                                    />
                                </div>
                                {/* Grade 11 Arts - Red */}
                                <div className="col-span-1">
                                    <input 
                                        type="text" 
                                        placeholder="11د"
                                        value={day.subject11Arts}
                                        onChange={(e) => updateSchedule(day.id, 'subject11Arts', e.target.value)}
                                        className="w-full p-2 text-xs font-extrabold text-gray-900 bg-white border-2 border-red-200 rounded focus:ring-2 focus:ring-red-500 outline-none text-center"
                                    />
                                </div>
                                {/* Grade 12 Sci - Emerald */}
                                <div className="col-span-2 border-r-2 border-gray-300 pr-1">
                                    <input 
                                        type="text" 
                                        placeholder="12ع"
                                        value={day.subject12Sci}
                                        onChange={(e) => updateSchedule(day.id, 'subject12Sci', e.target.value)}
                                        className="w-full p-2 text-xs font-extrabold text-gray-900 bg-white border-2 border-emerald-200 rounded focus:ring-2 focus:ring-emerald-500 outline-none text-center"
                                    />
                                </div>
                                {/* Grade 12 Arts - Black */}
                                <div className="col-span-2">
                                    <input 
                                        type="text" 
                                        placeholder="الثاني عشر"
                                        value={day.subject12Arts}
                                        onChange={(e) => updateSchedule(day.id, 'subject12Arts', e.target.value)}
                                        className="w-full p-2 text-xs font-extrabold text-gray-900 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-black outline-none text-center"
                                    />
                                </div>
                            </div>
                        ))}
                     </div>
                 </div>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Committees Section - Brown Theme */}
        <div className="bg-amber-950 p-5 rounded-xl shadow-lg border-4 border-amber-900 order-1 md:order-2">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-amber-800">
                <div className="p-2 bg-amber-600 text-white rounded-lg shadow-md border-2 border-white ring-2 ring-amber-400">
                    <Layers size={24} className="stroke-[3]" />
                </div>
                <h2 className="text-xl font-extrabold text-amber-50">بيانات اللجان الرئيسية</h2>
            </div>

            <div className="flex flex-col gap-3 mb-4 bg-amber-900/50 p-4 rounded-lg border border-amber-800">
                <div className="mb-2">
                    <button 
                        onClick={addGradeCommittees}
                        className="w-full bg-white text-amber-950 text-sm py-3 rounded border-2 border-amber-200 hover:bg-amber-50 font-extrabold flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Plus size={18} className="stroke-[3]" />
                         إضافة اللجان السريعة (عاشر + 11 + 12)
                    </button>
                </div>

                <div className="mt-2 border-t border-amber-800 pt-4 space-y-3">
                    <div className="bg-amber-950 p-3 rounded border border-amber-800">
                        <label className="text-xs font-extrabold text-white uppercase block mb-2">إضافة لجنة مخصصة</label>
                        <input
                            type="text"
                            placeholder="اسم اللجنة (مثال: لجنة الثاني عشر)"
                            className="w-full p-2 border-2 border-amber-700 rounded text-sm font-extrabold text-white bg-amber-900 placeholder-white focus:ring-2 focus:ring-amber-500 outline-none mb-2"
                            value={newCommitteeName}
                            onChange={(e) => setNewCommitteeName(e.target.value)}
                        />
                        
                        {/* Leadership Inputs for New Committee */}
                        <div className="grid grid-cols-1 gap-2">
                            <input
                                type="text"
                                placeholder="مراقب اللجنة (رئيس اللجنة)"
                                className="w-full p-2 text-xs font-bold border border-amber-700 rounded text-white bg-amber-900 placeholder-white focus:ring-2 focus:ring-amber-500 outline-none"
                                value={newHeadName}
                                onChange={(e) => setNewHeadName(e.target.value)}
                            />
                             <input
                                type="text"
                                placeholder="النائب الأول"
                                className="w-full p-2 text-xs font-bold border border-amber-700 rounded text-white bg-amber-900 placeholder-white focus:ring-2 focus:ring-amber-500 outline-none"
                                value={newAsst1}
                                onChange={(e) => setNewAsst1(e.target.value)}
                            />
                             <input
                                type="text"
                                placeholder="النائب الثاني"
                                className="w-full p-2 text-xs font-bold border border-amber-700 rounded text-white bg-amber-900 placeholder-white focus:ring-2 focus:ring-amber-500 outline-none"
                                value={newAsst2}
                                onChange={(e) => setNewAsst2(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="flex flex-col relative">
                        <label className="text-xs font-extrabold text-amber-200 mb-1 block">عدد الفرعيات</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none z-10">
                                <div className="bg-white p-1 rounded border border-gray-200 shadow-sm">
                                    <Hash size={16} className="text-amber-950 stroke-[3]" />
                                </div>
                            </div>
                            <select
                                className="w-full p-2 pr-12 border-2 border-amber-700 rounded text-center font-extrabold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer appearance-none bg-white"
                                value={subCount}
                                onChange={(e) => setSubCount(parseInt(e.target.value) || 1)}
                            >
                                {Array.from({length: 30}, (_, i) => i + 1).map(num => (
                                    <option key={num} value={num}>{num}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs font-extrabold text-amber-200 mb-1 block">عدد الملاحظين (إجمالي)</label>
                        <input
                            type="number"
                            readOnly
                            className="w-full p-2 border-2 border-amber-700 rounded text-center bg-amber-900 text-white font-extrabold"
                            value={subCount * 2}
                            title="حاصل ضرب عدد الفرعيات × 2"
                        />
                    </div>
                </div>
                <button 
                    onClick={addCommittee}
                    className="w-full mt-2 bg-black text-white px-4 py-3 rounded hover:bg-gray-800 transition flex items-center justify-center gap-2 font-extrabold text-sm border border-gray-700"
                    >
                    <Plus size={18} className="stroke-[3]" />
                    إضافة يدوية
                </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {committees.length === 0 ? (
                <div className="text-center py-6 bg-amber-900/30 rounded border-2 border-dashed border-amber-800">
                    <p className="text-amber-400 text-sm font-bold">لم يتم إضافة أي لجنة بعد</p>
                </div>
            ) : (
                committees.map((comm) => (
                <div key={comm.id} className="bg-amber-950 p-3 mb-2 rounded border-2 border-amber-800 hover:border-amber-500 hover:shadow-md transition relative group shadow-sm">
                    <div className="flex justify-between items-start">
                        <div className="w-full pl-8">
                            <h3 className="font-extrabold text-white text-sm mb-2 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm"></span>
                                {comm.name}
                            </h3>
                            
                            {/* Editable Leadership Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 mb-2">
                                <input 
                                    className="text-[10px] bg-amber-900 border border-amber-700 rounded px-2 py-1.5 w-full text-white font-extrabold focus:bg-amber-800 focus:ring-1 focus:ring-amber-500 outline-none placeholder-amber-400"
                                    placeholder="مراقب اللجنة"
                                    value={comm.headName || ''}
                                    onChange={(e) => updateCommittee(comm.id, 'headName', e.target.value)}
                                />
                                <input 
                                    className="text-[10px] bg-amber-900 border border-amber-700 rounded px-2 py-1.5 w-full text-white font-bold focus:bg-amber-800 focus:ring-1 focus:ring-amber-500 outline-none placeholder-amber-400"
                                    placeholder="النائب الأول"
                                    value={comm.assistantName1 || ''}
                                    onChange={(e) => updateCommittee(comm.id, 'assistantName1', e.target.value)}
                                />
                                <input 
                                    className="text-[10px] bg-amber-900 border border-amber-700 rounded px-2 py-1.5 w-full text-white font-bold focus:bg-amber-800 focus:ring-1 focus:ring-amber-500 outline-none placeholder-amber-400"
                                    placeholder="النائب الثاني"
                                    value={comm.assistantName2 || ''}
                                    onChange={(e) => updateCommittee(comm.id, 'assistantName2', e.target.value)}
                                />
                            </div>

                            <div className="flex gap-2 text-xs text-amber-200 bg-amber-900/50 p-2 rounded inline-flex items-center font-extrabold border border-amber-800">
                                <span>فرعيات: <b className="text-white">{comm.subCommitteesCount}</b></span>
                                <span className="text-amber-700">|</span>
                                <span>عدد الملاحظين: <b className="text-white">{comm.subCommitteesCount * 2}</b></span>
                            </div>
                        </div>
                        <button onClick={() => removeCommittee(comm.id)} className="absolute top-2 left-2 text-amber-400 hover:text-red-400 bg-amber-900/50 p-1.5 rounded hover:bg-red-900/50 transition border border-amber-800">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                ))
            )}
            </div>
        </div>

        {/* Observers Section - Emerald Theme */}
        <div className="bg-white p-0 rounded-xl shadow-lg border-4 border-emerald-700 order-2 md:order-1 overflow-hidden">
            <div className="flex items-center justify-between mb-0 p-4 bg-emerald-700 text-white">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-md border-2 border-white ring-2 ring-emerald-400">
                        <Users size={24} className="stroke-[3]" />
                    </div>
                    <h2 className="text-xl font-extrabold">بيانات العاملين</h2>
                </div>
                <div className="text-xs bg-white/10 px-3 py-2 rounded border border-white/20 font-extrabold flex items-center gap-2 shadow-sm backdrop-blur-sm">
                    <span className="text-white font-extrabold">
                        <span className="text-emerald-100">الإعدادات لـ:</span> 
                        {currentDay?.dayOfWeek || "اليوم المحدد"} 
                    </span>
                    {activeDayDate && (
                        <span className="bg-indigo-900 text-white px-2 py-0.5 rounded text-[11px] font-extrabold border border-indigo-700">{activeDayDate}</span>
                    )}
                </div>
            </div>

            <div className="p-4">
                <div className="mb-4 space-y-2 bg-emerald-50 p-4 rounded-lg border-2 border-emerald-200">
                    <p className="text-xs text-emerald-900 font-extrabold flex items-center gap-1">
                        <Edit3 size={14} />
                        إدخال سريع: (الاسم، القسم، الدور)
                    </p>
                    <textarea
                        placeholder="مثال:&#10;محمد أحمد علي، اللغة العربية، ملاحظ&#10;خالد حسن إبراهيم، العلوم، مراقب"
                        className="w-full p-2 border-2 border-emerald-300 rounded h-24 focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm font-bold text-gray-900 bg-white placeholder-gray-400"
                        value={bulkNames}
                        onChange={(e) => setBulkNames(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <button 
                            onClick={addBulkObservers}
                            disabled={!bulkNames.trim()}
                            className="flex-1 bg-black text-white hover:bg-gray-900 px-3 py-3 rounded transition text-sm font-extrabold disabled:opacity-50 shadow-sm"
                        >
                            إضافة القائمة
                        </button>
                        
                        {observers.length > 0 && (
                            <button 
                                onClick={handleDeleteAllObservers}
                                className="bg-red-50 text-red-600 px-3 py-3 rounded hover:bg-red-100 transition text-sm flex items-center gap-1 border border-red-200 font-extrabold"
                                title="حذف جميع الأسماء والأقسام"
                            >
                                <Trash2 size={16} />
                                حذف الكل
                            </button>
                        )}
                    </div>
                </div>

                {/* List Container */}
                <div className="border-2 border-emerald-600 rounded overflow-hidden shadow-sm">
                    {/* Headers for List */}
                    <div className="grid grid-cols-12 gap-1 text-[11px] text-white font-extrabold px-2 py-3 bg-black border-b-2 border-emerald-600 text-center uppercase tracking-wide">
                        <div className="col-span-3 text-right pr-2">الاسم / القسم</div>
                        <div className="col-span-2">الدور</div>
                        <div className="col-span-3">توزيع ثابت</div>
                        <div className="col-span-2 text-red-400">غياب</div>
                        <div className="col-span-1 text-emerald-400">العد</div>
                        <div className="col-span-1">حذف</div>
                    </div>

                    <div className="bg-white p-1 h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-200">
                    {observers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
                            <Users size={40} className="opacity-20 stroke-[1.5]" />
                            <p className="font-extrabold text-gray-400">لا يوجد بيانات مضافة</p>
                        </div>
                    ) : (
                        observers.map((obs, idx) => {
                            const isAbsent = dailyAbsence[selectedDayId]?.[obs.id] || false;
                            const prevCount = getObservationCount(obs.id);
                            const manualAssign = dailyManualAssignments[selectedDayId]?.[obs.id];
                            const assignedCommittee = manualAssign ? committees.find(c => c.id === manualAssign.committeeId) : null;

                            return (
                                <div key={obs.id} className={`grid grid-cols-12 gap-1 items-center p-1.5 mb-1 rounded border transition-all hover:bg-gray-50 ${isAbsent ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                                    
                                    {/* Name & Dept */}
                                    <div className="col-span-3 flex flex-col text-right pr-1">
                                        <span className={`text-xs font-extrabold break-words leading-tight mb-0.5 ${isAbsent ? 'text-gray-400 line-through decoration-red-500' : 'text-gray-900'}`}>{idx + 1}. {obs.name}</span>
                                        <input 
                                            className="text-[10px] text-gray-500 bg-transparent border-none p-0 outline-none w-full placeholder-gray-300 focus:text-black font-bold transition"
                                            value={obs.department || ''}
                                            placeholder="القسم العلمي..."
                                            onChange={(e) => updateObserverDepartment(obs.id, e.target.value)}
                                            title="اضغط للتعديل"
                                        />
                                    </div>
                                    
                                    {/* Role Selector */}
                                    <div className="col-span-2">
                                        <select
                                            value={obs.role}
                                            onChange={(e) => updateObserverRole(obs.id, e.target.value as ObserverRole)}
                                            className={`
                                                w-full text-[10px] font-extrabold py-1 px-1 rounded border-2 outline-none cursor-pointer
                                                ${obs.role === 'mullahiz' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : ''}
                                                ${obs.role === 'muraqib' ? 'bg-gray-50 text-black border-gray-300' : ''}
                                                ${obs.role === 'reserve' ? 'bg-red-50 text-red-800 border-red-200' : ''}
                                            `}
                                        >
                                            <option value="mullahiz">ملاحظ (🟢)</option>
                                            <option value="muraqib">مراقب (⚫)</option>
                                            <option value="reserve">احتياطي (🔴)</option>
                                        </select>
                                    </div>

                                    {/* Manual Assignment */}
                                    <div className="col-span-3 flex justify-center">
                                        {obs.role === 'mullahiz' && !isAbsent ? (
                                            manualAssign && assignedCommittee ? (
                                                <div className="flex items-center gap-1 bg-black text-white border border-gray-600 px-1 py-0.5 rounded">
                                                    <span 
                                                        className="text-[10px] font-bold cursor-pointer truncate max-w-[70px]" 
                                                        onClick={() => openAssignmentModal(obs)}
                                                        title={`${assignedCommittee.name} - فرعية ${manualAssign.subCommitteeNumber}`}
                                                    >
                                                        {assignedCommittee.name.split(" ").slice(-1)[0]} - {manualAssign.subCommitteeNumber}
                                                    </span>
                                                    <button onClick={() => clearManualAssignment(obs.id)} className="text-gray-400 hover:text-red-400">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => openAssignmentModal(obs)}
                                                    className="text-[10px] text-gray-500 hover:text-white hover:bg-black border border-gray-200 px-2 py-1 rounded transition flex items-center gap-1 font-bold"
                                                >
                                                    <MapPin size={10} /> تحديد
                                                </button>
                                            )
                                        ) : (
                                            <span className="text-[10px] text-gray-200 font-bold">-</span>
                                        )}
                                    </div>

                                    {/* Absence Checkbox */}
                                    <div className="col-span-2 flex justify-center">
                                        <label className="cursor-pointer p-1 relative">
                                            <input 
                                                type="checkbox"
                                                checked={isAbsent}
                                                onChange={() => toggleAbsence(obs.id)}
                                                className="appearance-none w-5 h-5 border-2 border-red-400 rounded checked:bg-red-600 checked:border-red-600 transition cursor-pointer"
                                            />
                                            {isAbsent && <X size={14} className="text-white absolute top-1.5 left-1 pointer-events-none stroke-[3px]" />}
                                        </label>
                                    </div>

                                    {/* Previous Count */}
                                    <div className="col-span-1 flex justify-center">
                                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border ${prevCount > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`} title="عدد مرات الملاحظة السابقة">
                                            {prevCount}
                                        </span>
                                    </div>

                                    {/* Delete */}
                                    <div className="col-span-1 flex justify-center">
                                        <button onClick={() => removeObserver(obs.id)} className="text-gray-300 hover:text-red-600 transition">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    </div>
                    
                    <div className="bg-emerald-50 border-t-2 border-emerald-200 p-2 text-[11px] text-emerald-900 font-extrabold flex justify-between items-center">
                        <span>العدد الكلي: {observers.length}</span>
                        <span className="bg-white border px-2 py-0.5 rounded text-red-600 border-red-200 shadow-sm">غياب: {Object.values(dailyAbsence[selectedDayId] || {}).filter(Boolean).length}</span>
                    </div>
                </div>
            </div>
        </div>
        </div>

        {/* Modal for Manual Assignment */}
        {isAssignmentModalOpen && assignmentObserver && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-96 shadow-2xl border-4 border-black">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="font-extrabold text-lg text-black flex items-center gap-2">
                            <MapPin size={20} className="text-emerald-600" />
                            توزيع يدوي: {assignmentObserver.name}
                        </h3>
                        <button onClick={() => setIsAssignmentModalOpen(false)} className="text-gray-400 hover:text-red-600">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-extrabold text-gray-900 uppercase mb-1">اللجنة الرئيسية</label>
                            <select 
                                className="w-full p-2 border-2 border-gray-300 rounded bg-gray-50 outline-none focus:ring-2 focus:ring-black text-sm font-bold text-gray-900"
                                value={selectedCommId}
                                onChange={(e) => setSelectedCommId(e.target.value)}
                            >
                                <option value="" disabled>اختر اللجنة...</option>
                                {committees.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-extrabold text-gray-900 uppercase mb-1">اللجنة الفرعية (رقم الغرفة)</label>
                            <select 
                                className="w-full p-2 border-2 border-gray-300 rounded bg-gray-50 outline-none focus:ring-2 focus:ring-black text-sm font-bold text-gray-900"
                                value={selectedSubNum}
                                onChange={(e) => setSelectedSubNum(Number(e.target.value))}
                            >
                                {(() => {
                                    const comm = committees.find(c => c.id === selectedCommId);
                                    if (!comm) return <option>اختر لجنة أولاً</option>;
                                    return Array.from({ length: comm.subCommitteesCount }, (_, i) => i + 1).map(num => (
                                        <option key={num} value={num}>فرعية {num}</option>
                                    ));
                                })()}
                            </select>
                        </div>
                        
                        <div className="bg-red-50 p-3 rounded text-xs text-red-800 border border-red-200 flex gap-2 font-bold">
                            <AlertOctagon size={18} className="shrink-0" />
                            <span>تنبيه: سيتم تثبيت هذا الملاحظ في هذه اللجنة ولن يدخل في القرعة العشوائية لباقي اللجان.</span>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button 
                                onClick={saveManualAssignment}
                                className="flex-1 bg-emerald-700 text-white py-2 rounded font-extrabold hover:bg-emerald-800 transition"
                            >
                                حفظ التعيين
                            </button>
                            <button 
                                onClick={() => setIsAssignmentModalOpen(false)}
                                className="flex-1 bg-white text-gray-700 py-2 rounded font-extrabold hover:bg-gray-100 transition border border-gray-300"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Warning Modal (Alert Replacement) */}
        {warningModal && warningModal.isOpen && (
             <div className="fixed inset-0 bg-red-900/40 backdrop-blur-sm flex items-center justify-center z-[60]">
                <div className="bg-white rounded-xl p-6 w-[400px] shadow-2xl animate-in zoom-in duration-200 border-t-8 border-red-600">
                    <div className="flex justify-between items-center mb-4">
                         <h3 className="font-extrabold text-2xl text-red-600 flex items-center gap-2">
                            <AlertOctagon size={28} />
                            تنبيه هام
                        </h3>
                    </div>
                    
                    <div className="py-2 text-center text-gray-900">
                        <p className="mb-4 text-xl font-extrabold">
                            قد تم بالفعل تكليف ملاحظين لهذه الفرعية
                        </p>
                        
                        <div className="bg-red-50 p-4 rounded border-2 border-red-200 mb-4">
                            <p className="mb-1 text-gray-500 text-xs font-extrabold uppercase">رقم الفرعية</p>
                            <p className="text-4xl font-black text-red-600 mb-2">{warningModal.subNum}</p>
                            
                            <p className="text-gray-500 text-xs font-extrabold uppercase">اللجنة الرئيسية</p>
                            <p className="text-lg font-extrabold text-black">{warningModal.commName}</p>
                        </div>
                        
                        <p className="text-sm text-gray-500 font-bold">
                            لا يمكن إضافة المزيد (الحد الأقصى 2)
                        </p>
                    </div>

                    <div className="pt-2">
                        <button 
                            onClick={() => setWarningModal(null)}
                            className="w-full bg-black text-white py-3 rounded font-extrabold hover:bg-gray-900 transition"
                        >
                            فهمت ذلك
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
