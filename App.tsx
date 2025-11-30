
import React, { useState, useEffect } from 'react';
import { DataInput } from './components/DataInput';
import { DistributionView } from './components/DistributionView';
import { Observer, Committee, DistributionResult, ExamDay, DailyAbsenceMap, DailyDistributionHistory, DailyManualAssignmentMap } from './types';
import { exportToExcel } from './utils/excelExport';
import { generateSampleData } from './services/geminiService';
import { LayoutDashboard, FileSpreadsheet, Sparkles, AlertCircle, Users, History, ChevronDown, Palette } from 'lucide-react';

// Fisher-Yates Shuffle
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const App: React.FC = () => {
  // Master Data (Staff & Committees)
  const [observers, setObservers] = useState<Observer[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  
  // Daily Tracking State
  const [dailyAbsence, setDailyAbsence] = useState<DailyAbsenceMap>({});
  const [dailyManualAssignments, setDailyManualAssignments] = useState<DailyManualAssignmentMap>({});
  const [dailyHistory, setDailyHistory] = useState<DailyDistributionHistory>({});
  
  // Schedule State (10 Days as requested)
  const [schedule, setSchedule] = useState<ExamDay[]>(
    Array.from({ length: 10 }, (_, i) => ({
        id: `day-${i+1}`,
        label: `اليوم ${i+1}`,
        dayOfWeek: i === 0 ? 'الأحد' : i === 1 ? 'الاثنين' : i === 2 ? 'الثلاثاء' : i === 3 ? 'الأربعاء' : i === 4 ? 'الخميس' : '...',
        subject10: '',
        subject11Sci: '',
        subject11Arts: '',
        subject12Sci: '',
        subject12Arts: '',
        date: ''
    }))
  );
  const [selectedDayId, setSelectedDayId] = useState('day-1');

  // UI State
  const [activeTab, setActiveTab] = useState<'input' | 'results'>('input');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- PERSISTENCE (MEMORY) ---
  useEffect(() => {
      const savedData = localStorage.getItem('examApp_v6_memory'); 
      if (savedData) {
          try {
              const parsed = JSON.parse(savedData);
              if(parsed.observers) setObservers(parsed.observers);
              if(parsed.committees) setCommittees(parsed.committees);
              if(parsed.schedule) setSchedule(parsed.schedule);
              if(parsed.dailyAbsence) setDailyAbsence(parsed.dailyAbsence);
              if(parsed.dailyManualAssignments) setDailyManualAssignments(parsed.dailyManualAssignments);
              if(parsed.dailyHistory) setDailyHistory(parsed.dailyHistory);
          } catch(e) {
              console.error("Failed to load saved data", e);
          }
      }
  }, []);

  useEffect(() => {
      const dataToSave = {
          observers, committees, schedule, dailyAbsence, dailyManualAssignments, dailyHistory
      };
      localStorage.setItem('examApp_v6_memory', JSON.stringify(dataToSave));
  }, [observers, committees, schedule, dailyAbsence, dailyManualAssignments, dailyHistory]);


  // --- LOGO CONFIGURATION ---
  const KUWAIT_FLAG_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Flag_of_Kuwait.svg/1200px-Flag_of_Kuwait.svg.png";

  // Helpers
  const currentDay = schedule.find(d => d.id === selectedDayId);
  
  // Construct a combined subject string for the View and Excel including Grade 12
  const currentSubject = currentDay 
    ? [
        currentDay.subject10 ? `(10: ${currentDay.subject10})` : '',
        currentDay.subject11Sci ? `(11ع: ${currentDay.subject11Sci})` : '',
        currentDay.subject11Arts ? `(11د: ${currentDay.subject11Arts})` : '',
        currentDay.subject12Sci ? `(12ع: ${currentDay.subject12Sci})` : '',
        currentDay.subject12Arts ? `(12د: ${currentDay.subject12Arts})` : ''
      ].filter(Boolean).join(' | ') || "لا يوجد مواد"
    : '';

  const currentDate = currentDay?.date ? currentDay.date.split('-').reverse().join('/') : '';
  const currentDayName = currentDay?.dayOfWeek || '';
  
  // Current Day Results from History
  const currentDistribution = dailyHistory[selectedDayId]?.results || [];
  const currentMuraqibs = dailyHistory[selectedDayId]?.muraqibs || [];
  const currentReserves = dailyHistory[selectedDayId]?.reserves || [];
  const hasResultForDay = !!dailyHistory[selectedDayId];

  // Logic: Get observation count for a specific person across ALL history
  const getObservationCount = (observerId: string) => {
      let count = 0;
      Object.keys(dailyHistory).forEach(key => {
          const record = dailyHistory[key];
          record.results.forEach(res => {
              res.observers.forEach(obs => {
                  if (obs.id === observerId) count++;
              });
          });
      });
      return count;
  };

  // Stats for the "Counts" button
  const totalSubCommittees = committees.reduce((acc, c) => acc + c.subCommitteesCount, 0);
  const totalMullahiz = observers.filter(o => o.role === 'mullahiz').length;
  const totalReservesStatic = observers.filter(o => o.role === 'reserve').length;

  const handleDistribution = () => {
    setErrorMsg(null);
    if (observers.length === 0 || committees.length === 0) {
      setErrorMsg("الرجاء إضافة بيانات العاملين واللجان قبل التوزيع");
      return;
    }

    // 1. Filter Staff for TODAY (Apply Absence)
    const todayAbsence = dailyAbsence[selectedDayId] || {};
    const todayManual = dailyManualAssignments[selectedDayId] || {};
    
    // Separate by roles, EXCLUDING absent people
    const presentObservers = observers.filter(obs => !todayAbsence[obs.id]);
    
    // Monitors (Muraqib) - Manual Role
    const manualMuraqibs = presentObservers.filter(o => o.role === 'muraqib');
    
    // Reserves (Manual)
    const manualReserves = presentObservers.filter(o => o.role === 'reserve');
    
    // All Mullahiz (Observers)
    const allMullahiz = presentObservers.filter(o => o.role === 'mullahiz');

    // Separate Mullahiz into "Fixed/Manual" and "Pool for Shuffle"
    const fixedMullahiz: Observer[] = [];
    const poolMullahiz: Observer[] = [];

    allMullahiz.forEach(obs => {
        if (todayManual[obs.id]) {
            fixedMullahiz.push(obs);
        } else {
            poolMullahiz.push(obs);
        }
    });

    // Calculate required observers (SubCommittees * 2 usually)
    const totalRequired = committees.reduce((acc, curr) => acc + (curr.subCommitteesCount * curr.observersPerRoom), 0);

    if ((fixedMullahiz.length + poolMullahiz.length) < totalRequired) {
      setErrorMsg(`تنبيه: عدد الملاحظين الحضور (${fixedMullahiz.length + poolMullahiz.length}) أقل من العدد المطلوب (${totalRequired}). سيتم ترك لجان فارغة.`);
    }

    // 2. Shuffle Pool
    const shuffledPool = shuffleArray<Observer>(poolMullahiz);
    
    // 3. Distribute
    const results: DistributionResult[] = [];
    let poolIndex = 0;

    for (const committee of committees) {
      for (let i = 1; i <= committee.subCommitteesCount; i++) {
        const required = committee.observersPerRoom; // Usually 2
        const roomObservers: Observer[] = [];
        
        // Step 3a: Check for Manual Assignments for this specific room
        // Find observers assigned to THIS committee and THIS sub-committee
        const manualForThisRoom = fixedMullahiz.filter(obs => {
            const assign = todayManual[obs.id];
            return assign && assign.committeeId === committee.id && assign.subCommitteeNumber === i;
        });

        // Add them to the room
        manualForThisRoom.forEach(obs => {
            roomObservers.push(obs);
        });

        // Step 3b: Fill remaining spots from the shuffled pool
        while (roomObservers.length < required) {
            if (poolIndex < shuffledPool.length) {
                roomObservers.push(shuffledPool[poolIndex]);
                poolIndex++;
            } else {
                break; // No more observers available
            }
        }

        if (roomObservers.length > 0) {
           results.push({
             committeeName: committee.name,
             subCommitteeNumber: i,
             observers: roomObservers
           });
        }
      }
    }

    // 4. Collect Leftovers
    const leftovers = shuffledPool.slice(poolIndex);
    
    // Add any fixed Mullahiz who were assigned to non-existent committees (edge case cleanup)
    // (Ideally validation prevents this, but for safety)
    const assignedIds = new Set(results.flatMap(r => r.observers.map(o => o.id)));
    const unusedFixed = fixedMullahiz.filter(obs => !assignedIds.has(obs.id));
    
    const finalReserves = [...manualReserves, ...leftovers, ...unusedFixed];

    // 5. SAVE TO HISTORY FOR THIS DAY
    setDailyHistory(prev => ({
        ...prev,
        [selectedDayId]: {
            results: results,
            muraqibs: manualMuraqibs,
            reserves: finalReserves,
            timestamp: Date.now()
        }
    }));

    setActiveTab('results');
  };

  const handleSmartGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const data = await generateSampleData();
      setObservers(data.observers);
      setCommittees(data.committees);
      
      if (data.schedule && data.schedule.length > 0) {
          const newSchedule = [...schedule];
          data.schedule.forEach((item: any, idx: number) => {
              if (idx < newSchedule.length) {
                  newSchedule[idx].subject10 = item.subject10 || '';
                  newSchedule[idx].subject11Sci = item.subject11Sci || '';
                  newSchedule[idx].subject11Arts = item.subject11Arts || '';
                  newSchedule[idx].subject12Sci = item.subject12Sci || '';
                  newSchedule[idx].subject12Arts = item.subject12Arts || '';
                  newSchedule[idx].date = item.date || '';
                  newSchedule[idx].dayOfWeek = item.dayOfWeek || newSchedule[idx].dayOfWeek;
              }
          });
          setSchedule(newSchedule);
      }
      
      alert("تم توليد بيانات تجريبية: لجان العاشر والحادي عشر والثاني عشر وجدول دراسي.");
    } catch (e) {
      console.error(e);
      setErrorMsg("حدث خطأ أثناء الاتصال بـ Gemini لتوليد البيانات. تأكد من إعداد مفتاح API.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pb-10 font-sans text-gray-900">
      
      {/* --- HERO HEADER --- */}
      <header className="bg-white border-b-4 border-black shadow-sm pb-6 pt-6 sticky top-0 z-40">
        <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex flex-col items-center justify-center text-center gap-4">
                
                <div className="flex items-center justify-between w-full relative">
                     {/* Placeholder Right - Now contains Designer Name */}
                     <div className="w-48 flex justify-center">
                         <span className="text-xs font-black text-white border-2 border-black rounded-full px-4 py-1.5 bg-red-600 shadow-sm">
                             تصميم أ.صلاح عبد العظيم
                         </span>
                     </div>

                    {/* School Info Center */}
                    <div className="flex-1">
                        <h3 className="text-gray-600 font-extrabold text-sm tracking-widest uppercase mb-1">
                            دولة الكويت - وزارة التربية
                        </h3>
                        <h1 className="text-3xl font-black text-black leading-tight mb-2">
                            ثانوية جابر الأحمد الصباح - بنين
                        </h1>
                        <div className="inline-block bg-emerald-600 text-white px-5 py-1.5 rounded-full text-sm font-bold border-2 border-emerald-800">
                            توزيع الملاحظين على اللجان
                        </div>
                    </div>

                    {/* Flag Left - Smaller & Static */}
                    <div className="w-48 flex justify-center">
                        <img 
                            src={KUWAIT_FLAG_URL}
                            alt="علم دولة الكويت" 
                            className="h-28 w-auto drop-shadow-xl"
                        />
                    </div>
                </div>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-6xl mt-8">
        
        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-900 p-1 mb-8 flex flex-col md:flex-row gap-1">
          <button
            onClick={() => setActiveTab('input')}
            className={`flex-1 py-4 px-6 rounded-lg font-extrabold flex justify-center items-center gap-3 transition-all ${
              activeTab === 'input' 
                ? 'bg-gray-100 text-black shadow-inner border-2 border-gray-300' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-black'
            }`}
          >
             <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                    <LayoutDashboard size={24} className="stroke-[3]" />
                    <span>لوحة الإعدادات</span>
                </div>
                {/* Mini Stats in Tab */}
                <div className="flex gap-2 text-[10px] mt-1 font-bold">
                    <span className={`px-2 border rounded ${totalSubCommittees > 0 ? 'bg-red-900 text-white border-red-950' : 'bg-blue-600 text-white border-blue-800'}`}>
                        الفرعيات: {totalSubCommittees}
                    </span>
                    <span className={`px-2 border rounded ${totalMullahiz > 0 ? 'bg-red-900 text-white border-red-950' : 'bg-blue-600 text-white border-blue-800'}`}>
                        الملاحظين: {totalMullahiz}
                    </span>
                    <span className={`px-2 border rounded ${totalReservesStatic > 0 ? 'bg-red-900 text-white border-red-950' : 'bg-blue-600 text-white border-blue-800'}`}>
                        الاحتياط: {totalReservesStatic}
                    </span>
                </div>
             </div>
          </button>
          
          <button
            onClick={() => hasResultForDay && setActiveTab('results')}
            disabled={!hasResultForDay}
            className={`flex-1 py-4 px-6 rounded-lg font-extrabold flex justify-center items-center gap-3 transition-all ${
              activeTab === 'results' 
                ? 'bg-emerald-600 text-white shadow-md border-2 border-emerald-700' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-black disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2">
                <FileSpreadsheet size={24} className="stroke-[3]" />
                <div className="text-right">
                    <div>نتائج التوزيع</div>
                    <div className="text-[10px] opacity-80 font-bold">
                        {currentDayName ? `عرض: ${currentDayName}` : 'لم يتم التوزيع بعد'}
                    </div>
                </div>
            </div>
          </button>
        </div>

        {/* Error / Warning Message */}
        {errorMsg && (
          <div className="mb-6 bg-red-50 border-r-8 border-red-600 p-4 rounded-lg flex items-center gap-3 text-red-700 animate-in fade-in shadow-sm">
            <AlertCircle className="shrink-0 stroke-[3]" />
            <span className="font-extrabold">{errorMsg}</span>
          </div>
        )}

        {/* Content Area */}
        {activeTab === 'input' ? (
          <div className="space-y-6">
            
            {/* Toolbar: Memory & Generate */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border-2 border-gray-900 shadow-md">
                 
                 {/* Memory Dropdown */}
                 <div className="flex-1 flex items-center gap-3 w-full md:w-auto">
                     {/* Smaller Icon */}
                     <div className="w-9 h-9 bg-black rounded-md flex items-center justify-center text-white shrink-0">
                         <History size={18} className="stroke-[3]" />
                     </div>
                     <div className="flex-grow">
                         <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">الأرشيف اليومي</label>
                         <div className="relative">
                             <select
                                value={selectedDayId}
                                onChange={(e) => setSelectedDayId(e.target.value)}
                                className="w-full appearance-none bg-indigo-900 text-white py-3 pr-4 pl-10 rounded-lg text-sm font-extrabold shadow-sm cursor-pointer hover:bg-indigo-800 transition border-2 border-indigo-700"
                             >
                                {schedule.map((day) => {
                                    const isSaved = !!dailyHistory[day.id];
                                    const formattedDate = day.date ? day.date.split('-').reverse().join('/') : '';
                                    return (
                                        <option key={day.id} value={day.id}>
                                            {day.dayOfWeek || day.label} {formattedDate ? ` ${formattedDate}` : ''} {isSaved ? '✅ (محفوظ)' : ''}
                                        </option>
                                    );
                                })}
                             </select>
                             <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-white">
                                <ChevronDown size={20} className="stroke-[3]" />
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Smart Generate Button */}
                 <button 
                    onClick={handleSmartGenerate}
                    disabled={isGenerating}
                    className="w-full md:w-auto bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-sm hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-70 font-extrabold border-2 border-emerald-800"
                >
                    <Sparkles size={20} className="stroke-[3]" />
                    {isGenerating ? 'جاري التوليد...' : 'توليد بيانات ذكي'}
                </button>
            </div>

            <DataInput 
              observers={observers} 
              committees={committees} 
              setObservers={setObservers} 
              setCommittees={setCommittees} 
              schedule={schedule}
              setSchedule={setSchedule}
              selectedDayId={selectedDayId}
              setSelectedDayId={setSelectedDayId}
              dailyAbsence={dailyAbsence}
              setDailyAbsence={setDailyAbsence}
              getObservationCount={getObservationCount}
              dailyManualAssignments={dailyManualAssignments}
              setDailyManualAssignments={setDailyManualAssignments}
            />

            {/* MAIN ACTION BUTTONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pb-8">
              <button 
                onClick={handleDistribution}
                className="bg-emerald-600 text-white text-xl font-black py-5 px-8 rounded-xl shadow-lg hover:bg-emerald-700 hover:shadow-xl transition-all flex items-center justify-center gap-3 border-2 border-emerald-800"
              >
                <Users size={28} className="stroke-[3]" />
                <span>توزيع اللجان بتاريخ {currentDate}</span>
              </button>

              <button
                disabled={!hasResultForDay}
                onClick={() => exportToExcel(currentDistribution, currentReserves, currentMuraqibs, committees, currentSubject, currentDate, currentDayName)}
                className="bg-black text-white border-2 border-gray-700 text-xl font-black py-5 px-8 rounded-xl shadow-lg hover:bg-gray-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 <FileSpreadsheet size={28} className="stroke-[3]" />
                 <span>تصدير ملف Excel</span>
              </button>
            </div>
            
          </div>
        ) : (
          <DistributionView 
            distribution={currentDistribution} 
            reserves={currentReserves}
            muraqibs={currentMuraqibs}
            committees={committees}
            examSubject={currentSubject}
            examDate={currentDate}
            dayName={currentDayName}
            onExport={() => exportToExcel(currentDistribution, currentReserves, currentMuraqibs, committees, currentSubject, currentDate, currentDayName)}
            onRedistribute={() => setActiveTab('input')}
            
            // New Props for Navigation
            days={schedule}
            selectedDayId={selectedDayId}
            onSelectDay={setSelectedDayId}
            history={dailyHistory}
          />
        )}
      </main>
    </div>
  );
};

export default App;
