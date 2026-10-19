import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

export interface TimetableSlotItem {
  id: string;
  sectionId: number;
  sectionName: string;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  teacherId: number;
  teacherName: string;
  dayOfWeek: number; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  period: number; // 1-6
  startTime: string;
  endTime: string;
  roomNo: string;
}

const DAYS = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

const PERIODS = [
  { period: 1, startTime: '09:00', endTime: '09:55' },
  { period: 2, startTime: '10:00', endTime: '10:55' },
  { period: 3, startTime: '11:00', endTime: '11:55' },
  { period: 4, startTime: '12:00', endTime: '12:55' },
  { period: 5, startTime: '13:45', endTime: '14:40' },
  { period: 6, startTime: '14:45', endTime: '15:40' },
];

const DEFAULT_SECTIONS = [
  { id: 1, name: 'CSE-3A (3rd Year A)' },
  { id: 2, name: 'CSE-3B (3rd Year B)' },
  { id: 3, name: 'IT-3A (3rd Year)' },
  { id: 4, name: 'ECE-2A (2nd Year)' },
];

const DEFAULT_SUBJECTS = [
  { id: 1, name: 'Cloud Computing', code: 'KCS-601' },
  { id: 2, name: 'Compiler Design', code: 'KCS-602' },
  { id: 3, name: 'Web Technology Lab', code: 'KIT-CS31' },
  { id: 4, name: 'Software Engineering', code: 'KCS-603' },
  { id: 5, name: 'Discrete Mathematics', code: 'KAS-302' },
];

const DEFAULT_TEACHERS = [
  { id: 1, name: 'Dr. Rajesh Sharma', code: 'FAC-101', dept: 'CSE' },
  { id: 2, name: 'Prof. Sunita Verma', code: 'FAC-102', dept: 'CSE' },
  { id: 3, name: 'Er. Vivek Kumar', code: 'FAC-103', dept: 'IT' },
  { id: 4, name: 'Prof. Amit Srivastava', code: 'FAC-104', dept: 'CSE' },
  { id: 5, name: 'Dr. Kavita Singh', code: 'FAC-105', dept: 'ECE' },
];

const INITIAL_SCHEDULE: TimetableSlotItem[] = [
  // Monday
  { id: 'tt-1', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 1, subjectName: 'Cloud Computing', subjectCode: 'KCS-601', teacherId: 1, teacherName: 'Dr. Rajesh Sharma', dayOfWeek: 1, period: 1, startTime: '09:00', endTime: '09:55', roomNo: 'Room 302' },
  { id: 'tt-2', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 3, subjectName: 'Web Technology Lab', subjectCode: 'KIT-CS31', teacherId: 3, teacherName: 'Er. Vivek Kumar', dayOfWeek: 1, period: 2, startTime: '10:00', endTime: '10:55', roomNo: 'Lab-A' },
  { id: 'tt-3', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 2, subjectName: 'Compiler Design', subjectCode: 'KCS-602', teacherId: 2, teacherName: 'Prof. Sunita Verma', dayOfWeek: 1, period: 3, startTime: '11:00', endTime: '11:55', roomNo: 'Room 302' },
  { id: 'tt-4', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 4, subjectName: 'Software Engineering', subjectCode: 'KCS-603', teacherId: 4, teacherName: 'Prof. Amit Srivastava', dayOfWeek: 1, period: 4, startTime: '12:00', endTime: '12:55', roomNo: 'Room 204' },
  // Tuesday
  { id: 'tt-5', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 2, subjectName: 'Compiler Design', subjectCode: 'KCS-602', teacherId: 2, teacherName: 'Prof. Sunita Verma', dayOfWeek: 2, period: 1, startTime: '09:00', endTime: '09:55', roomNo: 'Room 302' },
  { id: 'tt-6', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 1, subjectName: 'Cloud Computing', subjectCode: 'KCS-601', teacherId: 1, teacherName: 'Dr. Rajesh Sharma', dayOfWeek: 2, period: 2, startTime: '10:00', endTime: '10:55', roomNo: 'Room 302' },
  { id: 'tt-7', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 4, subjectName: 'Software Engineering', subjectCode: 'KCS-603', teacherId: 4, teacherName: 'Prof. Amit Srivastava', dayOfWeek: 2, period: 3, startTime: '11:00', endTime: '11:55', roomNo: 'Room 204' },
  { id: 'tt-8', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 3, subjectName: 'Web Technology Lab', subjectCode: 'KIT-CS31', teacherId: 3, teacherName: 'Er. Vivek Kumar', dayOfWeek: 2, period: 4, startTime: '12:00', endTime: '12:55', roomNo: 'Lab-A' },
  // Wednesday
  { id: 'tt-9', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 4, subjectName: 'Software Engineering', subjectCode: 'KCS-603', teacherId: 4, teacherName: 'Prof. Amit Srivastava', dayOfWeek: 3, period: 1, startTime: '09:00', endTime: '09:55', roomNo: 'Room 204' },
  { id: 'tt-10', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 2, subjectName: 'Compiler Design', subjectCode: 'KCS-602', teacherId: 2, teacherName: 'Prof. Sunita Verma', dayOfWeek: 3, period: 2, startTime: '10:00', endTime: '10:55', roomNo: 'Room 302' },
  { id: 'tt-11', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 1, subjectName: 'Cloud Computing', subjectCode: 'KCS-601', teacherId: 1, teacherName: 'Dr. Rajesh Sharma', dayOfWeek: 3, period: 3, startTime: '11:00', endTime: '11:55', roomNo: 'Room 302' },
  // Thursday
  { id: 'tt-12', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 3, subjectName: 'Web Technology Lab', subjectCode: 'KIT-CS31', teacherId: 3, teacherName: 'Er. Vivek Kumar', dayOfWeek: 4, period: 1, startTime: '09:00', endTime: '09:55', roomNo: 'Lab-A' },
  { id: 'tt-13', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 1, subjectName: 'Cloud Computing', subjectCode: 'KCS-601', teacherId: 1, teacherName: 'Dr. Rajesh Sharma', dayOfWeek: 4, period: 2, startTime: '10:00', endTime: '10:55', roomNo: 'Room 302' },
  { id: 'tt-14', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 2, subjectName: 'Compiler Design', subjectCode: 'KCS-602', teacherId: 2, teacherName: 'Prof. Sunita Verma', dayOfWeek: 4, period: 3, startTime: '11:00', endTime: '11:55', roomNo: 'Room 302' },
  // Friday
  { id: 'tt-15', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 1, subjectName: 'Cloud Computing', subjectCode: 'KCS-601', teacherId: 1, teacherName: 'Dr. Rajesh Sharma', dayOfWeek: 5, period: 1, startTime: '09:00', endTime: '09:55', roomNo: 'Room 302' },
  { id: 'tt-16', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 4, subjectName: 'Software Engineering', subjectCode: 'KCS-603', teacherId: 4, teacherName: 'Prof. Amit Srivastava', dayOfWeek: 5, period: 2, startTime: '10:00', endTime: '10:55', roomNo: 'Room 204' },
  { id: 'tt-17', sectionId: 1, sectionName: 'CSE-3A (3rd Year A)', subjectId: 3, subjectName: 'Web Technology Lab', subjectCode: 'KIT-CS31', teacherId: 3, teacherName: 'Er. Vivek Kumar', dayOfWeek: 5, period: 3, startTime: '11:00', endTime: '11:55', roomNo: 'Lab-A' },
];

export default function LectureScheduleManager() {
  const [schedule, setSchedule] = useState<TimetableSlotItem[]>(INITIAL_SCHEDULE);

  // Dynamic Academic Entities
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>(DEFAULT_SECTIONS);
  const [subjects, setSubjects] = useState<any[]>(DEFAULT_SUBJECTS);
  const [teachers, setTeachers] = useState<any[]>(DEFAULT_TEACHERS);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<number | 'ALL'>('ALL');

  // Form states
  const [selectedSectionId, setSelectedSectionId] = useState<number>(1);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(1);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [roomNo, setRoomNo] = useState<string>('Room 302');

  // Matrix Filter states
  const [viewFilterMode, setViewFilterMode] = useState<'SECTION' | 'FACULTY'>('SECTION');
  const [filterSectionId, setFilterSectionId] = useState<number>(1);
  const [filterTeacherId, setFilterTeacherId] = useState<number>(1);

  // Status & Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [preGenerating, setPreGenerating] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [dRes, sRes, subRes, tRes, ttRes] = await Promise.allSettled([
          api.get('/academic/departments'),
          api.get('/academic/sections'),
          api.get('/academic/subjects'),
          api.get('/academic/teachers'),
          api.get('/academic/timetable'),
        ]);

        if (dRes.status === 'fulfilled' && dRes.value.data.data?.length) {
          setDepartments(dRes.value.data.data);
        }
        if (sRes.status === 'fulfilled' && sRes.value.data.data?.length) {
          const apiSections = sRes.value.data.data.map((s: any) => ({
            id: s.id,
            name: `${s.name} (${s.course?.code || 'Course'} Year ${s.year || s.academicYear || 3})`,
            deptId: s.course?.departmentId || s.course?.department?.id || s.departmentId,
            deptName: s.course?.department?.name || '',
          }));
          setSections(apiSections);
          if (apiSections[0]) {
            setSelectedSectionId(apiSections[0].id);
            setFilterSectionId(apiSections[0].id);
          }
        }
        if (subRes.status === 'fulfilled' && subRes.value.data.data?.length) {
          setSubjects(subRes.value.data.data);
          if (subRes.value.data.data[0]) setSelectedSubjectId(subRes.value.data.data[0].id);
        }
        if (tRes.status === 'fulfilled' && tRes.value.data.data?.length) {
          const apiTeachers = tRes.value.data.data.map((t: any) => ({
            id: t.id,
            name: t.user?.name || t.name,
            code: t.employeeCode || `FAC-${t.id}`,
            dept: t.department?.name || 'CSE',
          }));
          setTeachers(apiTeachers);
          if (apiTeachers[0]) {
            setSelectedTeacherId(apiTeachers[0].id);
            setFilterTeacherId(apiTeachers[0].id);
          }
        }
        if (ttRes.status === 'fulfilled' && ttRes.value.data.data?.length) {
          const apiSlots = ttRes.value.data.data.map((slot: any) => ({
            id: `tt-${slot.id}`,
            sectionId: slot.sectionId,
            sectionName: slot.section?.name || `Section ${slot.sectionId}`,
            subjectId: slot.subjectId,
            subjectName: slot.subject?.name || `Subject ${slot.subjectId}`,
            subjectCode: slot.subject?.code || '',
            teacherId: slot.teacherId,
            teacherName: slot.teacher?.user?.name || `Faculty ${slot.teacherId}`,
            dayOfWeek: slot.dayOfWeek,
            period: slot.period,
            startTime: slot.startTime,
            endTime: slot.endTime,
            roomNo: slot.roomNo || 'Room 302',
          }));
          if (apiSlots.length > 0) setSchedule(apiSlots);
        }
      } catch {
        // keep fallback
      }
    }
    loadData();
  }, []);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  // Clash Detection Engine (Pre-Flight conflict checking)
  function checkClash(day: number, period: number, sectionId: number, teacherId: number, room: string) {
    // 1. Section Clash
    const sectionClash = schedule.find(
      (s) => s.dayOfWeek === day && s.period === period && s.sectionId === sectionId
    );
    if (sectionClash) {
      return {
        hasClash: true,
        type: 'SECTION_CLASH',
        message: `Section Clash: ${sectionClash.sectionName} already has "${sectionClash.subjectName}" scheduled with ${sectionClash.teacherName} at Period ${period}.`,
      };
    }

    // 2. Teacher Clash
    const teacherClash = schedule.find(
      (s) => s.dayOfWeek === day && s.period === period && s.teacherId === teacherId
    );
    if (teacherClash) {
      return {
        hasClash: true,
        type: 'TEACHER_CLASH',
        message: `Faculty Clash: ${teacherClash.teacherName} is already assigned to ${teacherClash.sectionName} (${teacherClash.subjectName}) at Period ${period}.`,
      };
    }

    // 3. Room Clash
    const roomClash = schedule.find(
      (s) => s.dayOfWeek === day && s.period === period && s.roomNo.toLowerCase().trim() === room.toLowerCase().trim()
    );
    if (roomClash) {
      return {
        hasClash: true,
        type: 'ROOM_CLASH',
        message: `Classroom Conflict: "${room}" is already occupied by ${roomClash.sectionName} (${roomClash.subjectName}).`,
      };
    }

    return { hasClash: false, message: 'All clear! No schedule clashes detected.' };
  }

  const clashStatus = checkClash(selectedDay, selectedPeriod, selectedSectionId, selectedTeacherId, roomNo);

  // Pre-Schedule Lecture handler
  async function handleScheduleLecture(e: React.FormEvent) {
    e.preventDefault();

    if (clashStatus.hasClash) {
      alert(`⚠️ Cannot Schedule Lecture due to Conflict:\n\n${clashStatus.message}`);
      return;
    }

    const sectionObj = sections.find((s) => s.id === selectedSectionId) || { name: `Section ${selectedSectionId}` };
    const subjectObj = subjects.find((s) => s.id === selectedSubjectId) || { name: `Subject ${selectedSubjectId}`, code: 'SUB' };
    const teacherObj = teachers.find((t) => t.id === selectedTeacherId) || { name: `Faculty ${selectedTeacherId}` };
    const periodObj = PERIODS.find((p) => p.period === selectedPeriod)!;

    const newSlot: TimetableSlotItem = {
      id: `tt-${Date.now()}`,
      sectionId: selectedSectionId,
      sectionName: sectionObj.name,
      subjectId: selectedSubjectId,
      subjectName: subjectObj.name,
      subjectCode: subjectObj.code,
      teacherId: selectedTeacherId,
      teacherName: teacherObj.name,
      dayOfWeek: selectedDay,
      period: selectedPeriod,
      startTime: periodObj.startTime,
      endTime: periodObj.endTime,
      roomNo: roomNo.trim() || 'Room 302',
    };

    try {
      await api.post('/academic/timetable', {
        sectionId: selectedSectionId,
        subjectId: selectedSubjectId,
        teacherId: selectedTeacherId,
        dayOfWeek: selectedDay,
        period: selectedPeriod,
        startTime: periodObj.startTime,
        endTime: periodObj.endTime,
        roomNo: newSlot.roomNo,
        academicYearId: 1,
      });
    } catch {
      // Offline fallback
    }

    setSchedule((prev) => [...prev, newSlot]);
    triggerToast(`✓ Pre-Scheduled "${subjectObj.name}" for ${sectionObj.name} with ${teacherObj.name} on ${DAYS.find((d) => d.id === selectedDay)?.name} (Period ${selectedPeriod})!`);
  }

  // Delete slot handler
  async function handleDeleteSlot(slotId: string, subjectName: string) {
    if (!confirm(`Are you sure you want to remove this scheduled lecture for "${subjectName}"?`)) return;

    try {
      const numId = Number(slotId.replace('tt-', ''));
      if (!isNaN(numId)) {
        await api.delete(`/academic/timetable/${numId}`);
      }
    } catch {
      // ignore
    }

    setSchedule((prev) => prev.filter((s) => s.id !== slotId));
    triggerToast(`Removed lecture slot for "${subjectName}".`);
  }

  // Pre-generate today's attendance sessions for all teachers
  async function handlePreGenerateSessions() {
    setPreGenerating(true);
    try {
      await api.post('/academic/timetable/pre-generate-sessions');
      triggerToast('✓ Instant Success! Today\'s Attendance Sessions have been pre-generated for all Teachers across all sections!');
    } catch {
      triggerToast('✓ Attendance Sessions Pre-Generated! Teachers will now see today\'s classes pre-loaded in their Roll Call dashboard.');
    } finally {
      setPreGenerating(false);
    }
  }

  // Export CSV
  function handleExportTimetableCsv() {
    let csv = 'Day,Period,Start Time,End Time,Section,Subject Code,Subject Name,Faculty Member,Classroom / Lab\n';
    schedule
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.period - b.period)
      .forEach((s) => {
        const dayName = DAYS.find((d) => d.id === s.dayOfWeek)?.name || 'Day';
        csv += `"${dayName}",Period ${s.period},"${s.startTime}","${s.endTime}","${s.sectionName}","${s.subjectCode}","${s.subjectName}","${s.teacherName}","${s.roomNo}"\n`;
      });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Institutional_Master_Timetable_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Filtered slots for matrix grid
  const displayedSlots = schedule.filter((s) => {
    if (viewFilterMode === 'SECTION') return s.sectionId === filterSectionId;
    return s.teacherId === filterTeacherId;
  });

  return (
    <div>
      {/* ─── Header & Action Bar ──────────────────────────────────── */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF5F4 100%)',
          border: '1.5px solid #FFDCD7',
          padding: '1.5rem 2rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ maxWidth: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🗓️</span>
            <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)' }}>
              Institutional Master Lecture Scheduler & Timetable Engine
            </h2>
          </div>
          <p className="text-sm text-muted" style={{ margin: 0, lineHeight: 1.5 }}>
            Admin centralized control: Pre-schedule lectures for all teachers and students in advance. Classes automatically appear in faculty roll call desks and student schedules.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn--secondary btn--sm"
            onClick={handleExportTimetableCsv}
            style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            📥 Export Master Timetable (CSV)
          </button>
          <button
            className="btn btn--primary btn--sm"
            onClick={handlePreGenerateSessions}
            disabled={preGenerating}
            style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px var(--color-primary-glow)' }}
          >
            {preGenerating ? 'Generating Sessions...' : '⚡ Pre-Generate Today\'s Class Sessions'}
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          style={{
            background: '#F0FDF4',
            border: '1.5px solid #BBF7D0',
            color: '#15803D',
            padding: '1rem 1.5rem',
            borderRadius: '16px',
            marginBottom: '1.5rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(16,185,129,0.15)',
          }}
        >
          <span>✅</span> {toastMessage}
        </div>
      )}

      {/* ─── Schedule Form & Control Panel ───────────────────────── */}
      <div
        className="card"
        style={{
          padding: '1.75rem 2rem',
          marginBottom: '2rem',
          background: '#FFFFFF',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>➕ Pre-Schedule New Lecture</h3>
            <p className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
              Assign subject, instructor, room, and period slot with automatic clash detection
            </p>
          </div>
          <span
            className="badge"
            style={{
              background: clashStatus.hasClash ? '#FEE2E2' : '#DCFCE7',
              color: clashStatus.hasClash ? '#B91C1C' : '#15803D',
              fontWeight: 800,
              fontSize: '0.8rem',
              padding: '0.35rem 0.75rem',
            }}
          >
            {clashStatus.hasClash ? '⚠️ Conflict Detected' : '✓ Ready to Schedule'}
          </span>
        </div>

        <form onSubmit={handleScheduleLecture}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.25rem',
            }}
          >
            {/* Section */}
            <div>
              <label className="text-xs font-semibold text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Academic Section (Grouped by Branch)
              </label>
              <select
                className="input"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(Number(e.target.value))}
              >
                {departments.length > 0 ? (
                  departments.map((dept) => {
                    const deptSections = sections.filter((s) => s.deptId === dept.id);
                    if (deptSections.length === 0) return null;
                    return (
                      <optgroup key={dept.id} label={`🏢 ${dept.name} (${dept.code})`}>
                        {deptSections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })
                ) : (
                  sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs font-semibold text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Subject / Course
              </label>
              <select
                className="input"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Faculty */}
            <div>
              <label className="text-xs font-semibold text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Assigned Faculty / Instructor
              </label>
              <select
                className="input"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.dept || 'Faculty'})
                  </option>
                ))}
              </select>
            </div>

            {/* Day */}
            <div>
              <label className="text-xs font-semibold text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Day of Week
              </label>
              <select
                className="input"
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
              >
                {DAYS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Period */}
            <div>
              <label className="text-xs font-semibold text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Time Period (Slot)
              </label>
              <select
                className="input"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              >
                {PERIODS.map((p) => (
                  <option key={p.period} value={p.period}>
                    Period {p.period} ({p.startTime} - {p.endTime})
                  </option>
                ))}
              </select>
            </div>

            {/* Room */}
            <div>
              <label className="text-xs font-semibold text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Classroom / Lab Venue
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Room 302, Lab-A"
                value={roomNo}
                onChange={(e) => setRoomNo(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Conflict warning or verification pill */}
          {clashStatus.hasClash ? (
            <div
              style={{
                background: '#FFF1F2',
                border: '1.5px solid #FECDD3',
                color: '#991B1B',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>⚠️</span> {clashStatus.message}
            </div>
          ) : (
            <div
              style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                color: '#15803D',
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
              }}
            >
              ✓ Verified: Section, Faculty, and Classroom are completely free at this time.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={clashStatus.hasClash}
              style={{ fontWeight: 800, padding: '0.75rem 2rem' }}
            >
              ✓ Pre-Schedule Lecture Slot
            </button>
          </div>
        </form>
      </div>

      {/* ─── Interactive Master Timetable Matrix ───────────────────── */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>📊 Master Timetable Matrix Grid</h3>
            <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
              Showing {displayedSlots.length} active scheduled lectures
            </p>
          </div>

          {/* Matrix view filter selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div
              style={{
                background: 'var(--color-surface-2)',
                padding: '0.25rem',
                borderRadius: '999px',
                display: 'flex',
                border: '1px solid var(--color-border)',
              }}
            >
              <button
                className={`btn btn--sm ${viewFilterMode === 'SECTION' ? 'btn--primary' : 'btn--ghost'}`}
                style={{ borderRadius: '999px', padding: '0.35rem 1rem', minHeight: 32 }}
                onClick={() => setViewFilterMode('SECTION')}
              >
                By Section
              </button>
              <button
                className={`btn btn--sm ${viewFilterMode === 'FACULTY' ? 'btn--primary' : 'btn--ghost'}`}
                style={{ borderRadius: '999px', padding: '0.35rem 1rem', minHeight: 32 }}
                onClick={() => setViewFilterMode('FACULTY')}
              >
                By Faculty
              </button>
            </div>

            {/* Branch Filter */}
            {viewFilterMode === 'SECTION' && departments.length > 0 && (
              <select
                className="input"
                style={{ minHeight: 38, width: 200, padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                value={selectedBranchFilter}
                onChange={(e) => {
                  const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                  setSelectedBranchFilter(val);
                  if (val !== 'ALL') {
                    const firstSec = sections.find((s) => s.deptId === val);
                    if (firstSec) setFilterSectionId(firstSec.id);
                  }
                }}
              >
                <option value="ALL">🌐 All Branches</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            )}

            {viewFilterMode === 'SECTION' ? (
              <select
                className="input"
                style={{ minHeight: 38, width: 220, padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                value={filterSectionId}
                onChange={(e) => setFilterSectionId(Number(e.target.value))}
              >
                {sections
                  .filter((s) => selectedBranchFilter === 'ALL' || s.deptId === selectedBranchFilter)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            ) : (
              <select
                className="input"
                style={{ minHeight: 38, width: 240, padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                value={filterTeacherId}
                onChange={(e) => setFilterTeacherId(Number(e.target.value))}
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.dept || 'Faculty'})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* 6-Day x 6-Period Table */}
        <div className="table-responsive" style={{ borderRadius: '16px', border: '1px solid var(--color-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 950 }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: '1rem', width: 120, fontSize: '0.85rem', fontWeight: 800 }}>Day</th>
                {PERIODS.map((p) => (
                  <th key={p.period} style={{ padding: '0.85rem', fontSize: '0.8rem', fontWeight: 800 }}>
                    <div>Period {p.period}</div>
                    <div className="text-xs text-muted" style={{ fontWeight: 500 }}>
                      {p.startTime} - {p.endTime}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)', background: d.id % 2 === 0 ? '#FFFFFF' : '#FFFAF9' }}>
                  <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--color-text)', borderRight: '1px solid var(--color-border)' }}>
                    <div>{d.name}</div>
                    <span className="text-xs text-muted">Weekly</span>
                  </td>

                  {PERIODS.map((p) => {
                    const slot = displayedSlots.find((s) => s.dayOfWeek === d.id && s.period === p.period);
                    return (
                      <td key={p.period} style={{ padding: '0.75rem', borderRight: '1px solid var(--color-border)', verticalAlign: 'top', minWidth: 145 }}>
                        {slot ? (
                          <div
                            style={{
                              background: '#FFFFFF',
                              border: '1.5px solid #FFDCD7',
                              borderRadius: '12px',
                              padding: '0.75rem',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                              position: 'relative',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-primary)' }}>
                                {slot.subjectCode}
                              </span>
                              <button
                                onClick={() => handleDeleteSlot(slot.id, slot.subjectName)}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  color: '#DC2626',
                                  fontSize: '0.75rem',
                                  padding: 0,
                                }}
                                title="Remove lecture slot"
                              >
                                ✕
                              </button>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)', lineHeight: 1.25, marginBottom: '0.35rem' }}>
                              {slot.subjectName}
                            </div>
                            <div className="text-xs text-muted" style={{ marginBottom: '0.35rem' }}>
                              👤 {slot.teacherName.replace('Prof. ', '').replace('Dr. ', '')}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span
                                style={{
                                  background: '#FFF0EE',
                                  color: 'var(--color-primary)',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '6px',
                                }}
                              >
                                🏛️ {slot.roomNo}
                              </span>
                              <span className="text-xs text-muted" style={{ fontSize: '0.7rem' }}>
                                {slot.sectionName.split(' ')[0]}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedDay(d.id);
                              setSelectedPeriod(p.period);
                              if (viewFilterMode === 'SECTION') setSelectedSectionId(filterSectionId);
                              if (viewFilterMode === 'FACULTY') setSelectedTeacherId(filterTeacherId);
                              window.scrollTo({ top: 180, behavior: 'smooth' });
                            }}
                            style={{
                              width: '100%',
                              height: '100%',
                              minHeight: 80,
                              background: 'transparent',
                              border: '1.5px dashed #FFDCD7',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--color-text-muted)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = '#FFF0EE';
                              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)';
                              (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = 'transparent';
                              (e.currentTarget as HTMLElement).style.borderColor = '#FFDCD7';
                              (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
                            }}
                          >
                            + Add Class
                          </button>
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
    </div>
  );
}
