
import React, { useRef, useEffect } from 'react';
import { DistributionResult, Observer, Committee, ExamDay, DailyDistributionHistory } from '../types';
import { FileSpreadsheet, AlertTriangle, Briefcase, Calendar, Users, Home, CheckCircle } from 'lucide-react';

interface DistributionViewProps {
  distribution: DistributionResult[];
  reserves: Observer[];
  muraqibs: Observer[];
  committees: Committee[];
  examSubject: string;
  examDate: string;
  dayName: string; // e.g. Sunday
  onExport: () => void;
  onRedistribute: () => void;
  
  // New props for day navigation
  days: ExamDay[];
  selectedDayId: string;
  onSelectDay: (id: string) => void;
  history: DailyDistributionHistory;
}

export const DistributionView: React.FC<DistributionViewProps> = ({ 
    distribution, reserves, muraqibs, committees, examSubject, examDate, dayName, onExport, onRedistribute,
    days, selectedDayId, onSelectDay, history
}) => {
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to selected day
  useEffect(() => {
    if (scrollContainerRef.current) {
        const selectedEl = scrollContainerRef.current.querySelector(`[data-day-id="${selectedDayId}"]`);
        if (selectedEl) {
            selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
  }, [selectedDayId]);

  // Group by Committee Name for better display
  const grouped = distribution.reduce((acc, curr) => {
    if (!acc[curr.committeeName]) acc[curr.committeeName] = [];
    acc[curr.committeeName].push(curr);
    return acc;
  }, {} as Record<string, DistributionResult[]>);

  // Determine max observers per room to set column headers dynamically
  const maxObservers = distribution.reduce((max, curr) => Math.max(max, curr.observers.length), 0);
  const observerColumns = Array.from({ length: maxObservers }, (_, i) => i + 1);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- Day Navigation Bar --- */}
      <div className="bg-white rounded-xl shadow-sm p-2 border-2 border-gray-900 sticky top-4 z-30">
         <div 
            ref={scrollContainerRef}
            className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-none"
         >
             {days.map((day) => {
                 const hasData = !!history[day.id];
                 const isSelected = day.id === selectedDayId;
                 return (
                     <button
                        key={day.id}
                        data-day-id={day.id}
                        onClick={() => onSelectDay(day.id)}
                        className={`
                            flex-shrink-0 px-4 py-2 rounded-lg text-sm font-extrabold transition-all border-2
                            ${isSelected 
                                ? 'bg-black text-white border-black' 
                                : hasData 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }
                        `}
                     >
                         <div className="flex flex-col items-center leading-tight">
                            <span>{day.dayOfWeek || day.label}</span>
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-gray-300' : 'opacity-70'}`}>{day.date || '-'}</span>
                         </div>
                     </button>
                 );
             })}
         </div>
      </div>

      {/* Date & Stats Header */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-900">
          
          <div className="p-5 flex flex-wrap items-center justify-between gap-6 border-b-2 border-gray-200">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center text-white border-2 border-gray-700 shadow-md">
                    <Calendar size={24} className="stroke-[3]" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-black">{dayName} <span className="text-emerald-700 ml-2">{examDate}</span></h2>
                    <h3 className="text-sm text-gray-600 font-bold mt-1">
                        <span className="text-black">المادة:</span> <span className="text-blue-900 font-extrabold">{examSubject || "غير محدد"}</span>
                    </h3>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={onRedistribute}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-black border-2 border-black rounded-lg hover:bg-black hover:text-white transition font-extrabold text-sm"
                >
                    <Home size={18} className="stroke-[3]" />
                    <span>العودة للرئيسية</span>
                </button>
                <button 
                    onClick={onExport}
                    disabled={distribution.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-extrabold text-sm disabled:opacity-50 border-2 border-emerald-800"
                >
                    <FileSpreadsheet size={18} className="stroke-[3]" />
                    تصدير Excel
                </button>
            </div>
          </div>
          
          {distribution.length === 0 ? (
             <div className="p-10 text-center text-gray-400 bg-gray-50">
                 <AlertTriangle size={32} className="mx-auto mb-3 opacity-20" />
                 <p className="text-lg font-bold text-gray-500">لا يوجد توزيع محفوظ لهذا اليوم</p>
                 <p className="text-sm mt-1 font-semibold">الرجاء الانتقال إلى لوحة "الأعداد" للتوزيع أو اختيار يوم آخر.</p>
             </div>
          ) : (
            <div className="bg-gray-100 p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-lg border-2 border-red-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] text-gray-500 font-extrabold uppercase block mb-1">إجمالي الاحتياط</span>
                        <span className="text-3xl font-black text-red-600">{reserves.length}</span>
                    </div>
                    <div className="bg-red-600 p-2 rounded-lg text-white shadow-sm">
                        <AlertTriangle size={24} className="stroke-[3]" />
                    </div>
                </div>
                <div className="bg-white p-3 rounded-lg border-2 border-black shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] text-gray-500 font-extrabold uppercase block mb-1">إجمالي المراقبين</span>
                        <span className="text-3xl font-black text-black">{muraqibs.length}</span>
                    </div>
                    <div className="bg-black p-2 rounded-lg text-white shadow-sm">
                        <Briefcase size={24} className="stroke-[3]" />
                    </div>
                </div>
            </div>
          )}
      </div>

      {distribution.length > 0 && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-6">
            {Object.keys(grouped).sort().map(committeeName => {
                const subCommittees = grouped[committeeName];
                const totalObserversInCommittee = subCommittees.reduce((sum, item) => sum + item.observers.length, 0);

                return (
                    <div key={committeeName} className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-gray-900">
                        
                        {/* 1. Header: Committee Name */}
                        <div className="bg-black text-white p-4 border-b-2 border-gray-700">
                            <div className="flex justify-between items-center flex-wrap gap-2">
                                <h3 className="font-extrabold text-lg text-emerald-400 flex items-center gap-2">
                                    <div className="w-2 h-5 bg-emerald-500 rounded-sm"></div>
                                    {committeeName}
                                </h3>
                                <div className="flex gap-2">
                                    <span className="text-[10px] bg-white/20 px-2 py-1 rounded text-white font-extrabold">
                                        {subCommittees.length} فرعيات
                                    </span>
                                    <span className="text-[10px] bg-emerald-700 px-2 py-1 rounded text-white border border-emerald-500 flex items-center gap-1 font-extrabold">
                                        <Users size={12} />
                                        {totalObserversInCommittee} ملاحظ
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Sub-section: Observers Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead className="bg-gray-100 text-gray-600 text-[11px] uppercase font-extrabold tracking-wider">
                                    <tr>
                                        <th className="p-3 w-1/4 border-b-2 border-gray-300">رقم الفرعية</th>
                                        {observerColumns.map(num => (
                                            <th key={num} className="p-3 border-b-2 border-gray-300">ملاحظ ({num})</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-sm">
                                    {subCommittees.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition duration-150">
                                            <td className="p-3 font-extrabold text-black bg-gray-50 border-l border-gray-300">
                                                <span className="bg-white border-2 border-gray-300 px-3 py-1 rounded shadow-sm text-xs">
                                                    فرعية {row.subCommitteeNumber}
                                                </span>
                                            </td>
                                            {observerColumns.map((num, i) => {
                                                const obs = row.observers[i];
                                                return (
                                                    <td key={num} className="p-3">
                                                        {obs ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                                                                <div>
                                                                    <div className="text-gray-900 font-extrabold text-xs">{obs.name}</div>
                                                                    <div className="text-[10px] text-gray-500 font-bold">{obs.department}</div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300 text-[10px] font-bold">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Sidebar: Reserves and Muraqibs */}
        <div className="lg:col-span-1 space-y-4">
            
            {/* Muraqibs (Monitors) */}
            {muraqibs.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-black">
                    <div className="bg-black text-white p-3 flex justify-between items-center">
                        <h3 className="font-extrabold flex items-center gap-2 text-sm">
                            <Briefcase size={18} className="text-amber-400 stroke-[3]" />
                            المراقبين (إشراف)
                        </h3>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-extrabold">
                            {muraqibs.length}
                        </span>
                    </div>
                    <div className="p-2 bg-gray-100 max-h-[40vh] overflow-y-auto">
                        <ul className="space-y-1 p-1">
                            {muraqibs.map(obs => (
                                <li key={obs.id} className="bg-white p-2 rounded border-2 border-gray-200 shadow-sm text-xs flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="font-extrabold text-black">{obs.name}</span>
                                        {obs.department && <span className="text-[10px] text-gray-500 font-bold">{obs.department}</span>}
                                    </div>
                                    <CheckCircle size={16} className="text-black" />
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Reserves */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-red-600 sticky top-24">
                 <div className="bg-red-600 text-white p-3 flex justify-between items-center">
                    <h3 className="font-extrabold flex items-center gap-2 text-sm">
                        <AlertTriangle size={18} className="text-white stroke-[3]" />
                        قائمة الاحتياط
                    </h3>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-extrabold">
                         {reserves.length}
                    </span>
                </div>
                <div className="p-2 bg-red-50 min-h-[200px] max-h-[60vh] overflow-y-auto">
                    {reserves.length === 0 ? (
                        <p className="text-gray-400 text-center py-6 text-xs font-bold">لا يوجد احتياط.</p>
                    ) : (
                        <ul className="space-y-1 p-1">
                            {reserves.map(res => (
                                <li key={res.id} className="bg-white p-2 rounded border-2 border-red-100 shadow-sm text-xs flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="font-extrabold text-black">{res.name}</span>
                                        {res.department && <span className="text-[10px] text-gray-500 font-bold">{res.department}</span>}
                                    </div>
                                    <span className="text-[10px] text-red-700 font-extrabold bg-red-100 px-2 py-0.5 rounded border border-red-200">احتياط</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
      </div>
      )}
    </div>
  );
};
