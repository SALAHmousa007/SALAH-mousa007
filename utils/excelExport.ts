
import * as XLSX from 'xlsx';
import { DistributionResult, Observer, Committee } from '../types';

export const exportToExcel = (
  distribution: DistributionResult[], 
  reserves: Observer[], 
  muraqibs: Observer[],
  committees: Committee[],
  subject: string,
  date: string,
  dayName: string
) => {
  const subjectText = subject || "-";
  const dateText = date || "-";
  const dayText = dayName || "-";

  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: MASTER DISTRIBUTION (جدول التوزيع)
  // Columns: Day, Date, Subject, Main Comm, Sub Comm, Obs 1, Obs 2, Signature
  // ==========================================
  const wsDistData: any[][] = [];
  
  // Header Row
  wsDistData.push([
      "اليوم", 
      "التاريخ", 
      "المادة", 
      "اللجنة الرئيسية", 
      "الفرعية", 
      "ملاحظ 1", 
      "التوقيع",
      "ملاحظ 2",
      "التوقيع", 
      "ملاحظ 3 (إن وجد)"
  ]);

  // Sort distribution by Committee then Sub-committee
  const sortedDist = [...distribution].sort((a, b) => {
      if (a.committeeName !== b.committeeName) return a.committeeName.localeCompare(b.committeeName);
      return a.subCommitteeNumber - b.subCommitteeNumber;
  });

  sortedDist.forEach(item => {
      const row = [
          dayText,
          dateText,
          subjectText,
          item.committeeName,
          item.subCommitteeNumber,
          item.observers[0] ? item.observers[0].name : "-",
          "", // Signature
          item.observers[1] ? item.observers[1].name : "-",
          "", // Signature
          item.observers[2] ? item.observers[2].name : ""
      ];
      wsDistData.push(row);
  });

  const wsDist = XLSX.utils.aoa_to_sheet(wsDistData);
  // Set column widths
  wsDist['!cols'] = [
      { wch: 10 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 8 }, 
      { wch: 35 }, { wch: 10 }, { wch: 35 }, { wch: 10 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDist, "جدول التوزيع العام");


  // ==========================================
  // SHEET 2: SIGNATURE LIST (كشف التوقيع للطباعة)
  // Grouped by Committee + Reserves at bottom
  // ==========================================
  const wsSignData: any[][] = [];

  // Title Info
  wsSignData.push(["كشف توقيع العاملين باللجان (شامل)"]);
  wsSignData.push(["اليوم:", dayText, "التاريخ:", dateText]);
  wsSignData.push(["المادة:", subjectText]);
  wsSignData.push([]); 

  // Group data
  const groupedDist: Record<string, DistributionResult[]> = {};
  distribution.forEach(d => {
      if(!groupedDist[d.committeeName]) groupedDist[d.committeeName] = [];
      groupedDist[d.committeeName].push(d);
  });

  // 1. Committees
  committees.forEach(comm => {
      // Committee Header with Leadership
      wsSignData.push([`>>> اللجنة الرئيسية: ${comm.name} <<<`]);
      wsSignData.push(["مراقب اللجنة:", comm.headName || "-"]);
      wsSignData.push(["النائب الأول:", comm.assistantName1 || "-"]);
      wsSignData.push(["النائب الثاني:", comm.assistantName2 || "-"]);
      wsSignData.push([]);
      
      // Table Header
      const commResults = groupedDist[comm.name] || [];
      const maxObs = commResults.reduce((max, r) => Math.max(max, r.observers.length), 2);
      
      const headerRow = ["الفرعية"];
      for(let i=1; i<=maxObs; i++) {
          headerRow.push(`ملاحظ ${i}`);
          headerRow.push(`توقيع ${i}`);
      }
      wsSignData.push(headerRow);

      // Data Rows
      commResults.sort((a,b) => a.subCommitteeNumber - b.subCommitteeNumber);
      if (commResults.length === 0) {
          wsSignData.push(["لا يوجد توزيع لهذه اللجنة"]);
      } else {
          commResults.forEach(res => {
              const row: any[] = [res.subCommitteeNumber];
              for(let i=0; i<maxObs; i++) {
                  const obs = res.observers[i];
                  row.push(obs ? obs.name : "-");
                  row.push(""); // Empty for signature
              }
              wsSignData.push(row);
          });
      }
      wsSignData.push([]); // Spacer
      wsSignData.push([]); 
  });

  // 2. Monitors Section in Signature List
  wsSignData.push(["========================================="]);
  wsSignData.push(["كشف توقيع المراقبين (خارج اللجان)"]);
  wsSignData.push(["م", "الاسم", "القسم", "التوقيع"]);
  if (muraqibs.length > 0) {
      muraqibs.forEach((r, idx) => {
          wsSignData.push([idx + 1, r.name, r.department || "-", ""]);
      });
  } else {
      wsSignData.push(["-", "لا يوجد مراقبين إضافيين", "-", "-"]);
  }
  wsSignData.push([]);

  // 3. Reserves Section in Signature List
  wsSignData.push(["========================================="]);
  wsSignData.push(["كشف توقيع الاحتياط"]);
  wsSignData.push(["م", "الاسم", "القسم", "التوقيع"]);
  if (reserves.length > 0) {
      reserves.forEach((r, idx) => {
          wsSignData.push([idx + 1, r.name, r.department || "-", ""]);
      });
  } else {
      wsSignData.push(["-", "لا يوجد احتياط", "-", "-"]);
  }

  const wsSign = XLSX.utils.aoa_to_sheet(wsSignData);
  wsSign['!cols'] = [{ wch: 10 }, { wch: 35 }, { wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsSign, "كشف التوقيع (لجان)");


  // ==========================================
  // SHEET 3: RESERVES & MURAQIBS (الاحتياط والمراقبين - تنسيق رسمي)
  // ==========================================
  const wsReserveData: any[][] = [];
  
  wsReserveData.push(["كشف متابعة المراقبين وقوة الاحتياط"]);
  wsReserveData.push(["اليوم:", dayText, "التاريخ:", dateText]);
  wsReserveData.push(["المادة:", subjectText]);
  wsReserveData.push([]);

  // Monitors
  wsReserveData.push(["أولاً: السادة المراقبين (لجان الإشراف والمتابعة)"]);
  wsReserveData.push(["م", "الاسم الرباعي", "القسم العلمي", "طبيعة العمل", "التوقيع بالحضور", "ملاحظات"]);
  
  if (muraqibs.length === 0) {
      wsReserveData.push(["-", "لا يوجد مراقبين مسجلين", "-", "-", "-", "-"]);
  } else {
      muraqibs.forEach((r, idx) => {
          wsReserveData.push([idx + 1, r.name, r.department || "-", "مراقب لجنة", "", ""]);
      });
  }

  wsReserveData.push([]);
  wsReserveData.push([]);

  // Reserves
  wsReserveData.push(["ثانياً: السادة أعضاء الاحتياط"]);
  wsReserveData.push(["م", "الاسم الرباعي", "القسم العلمي", "طبيعة العمل", "التوقيع بالحضور", "تم التوجيه إلى لجنة"]);
  
  if (reserves.length === 0) {
      wsReserveData.push(["-", "لا يوجد احتياط", "-", "-", "-", "-"]);
  } else {
      reserves.forEach((r, idx) => {
          wsReserveData.push([idx + 1, r.name, r.department || "-", "احتياطي", "", ""]);
      });
  }

  const wsReserves = XLSX.utils.aoa_to_sheet(wsReserveData);
  // Wider columns for better printing layout
  wsReserves['!cols'] = [
      { wch: 5 },  // Index
      { wch: 35 }, // Name
      { wch: 20 }, // Dept
      { wch: 15 }, // Role
      { wch: 20 }, // Signature
      { wch: 30 }  // Notes/Direction
  ];
  XLSX.utils.book_append_sheet(wb, wsReserves, "الاحتياط والمراقبين");

  // ==========================================
  // WRITE FILE
  // ==========================================
  const cleanSubject = subject ? `_${subject.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_').substring(0, 20)}` : '';
  const cleanDay = dayName ? `_${dayName}` : '';
  XLSX.writeFile(wb, `توزيع_اللجان${cleanDay}${cleanSubject}.xlsx`);
};
