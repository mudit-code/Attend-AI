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

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function LectureScheduleManager() {
  const [schedule, setSchedule] = useState<TimetableSlotItem[]>([]);

  // Dynamic Academic Entities
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<number | 'ALL'>('ALL');

  // Form states
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [roomNo, setRoomNo] = useState<string>('');

  // Matrix Filter states
  const [viewFilterMode, setViewFilterMode] = useState<'SECTION' | 'FACULTY'>('SECTION');
  const [filterSectionId, setFilterSectionId] = useState<number | null>(null);
  const [filterTeacherId, setFilterTeacherId] = useState<number | null>(null);

  // Status & Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [preGenerating, setPreGenerating] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [dRes, sRes, subRes, tRes, ttRes] = await Promise.allSettled([
          api.get('/academic/departments'),
          api.get('/academic/sections'),
          api.get('/academic/subjects'),
          api.get('/users/teachers'),
          api.get('/academic/timetable'),
        ]);

        const apiDepartments = dRes.status === 'fulfilled' ? dRes.value.data.data ?? [] : [];
        const apiSections = sRes.status === 'fulfilled'
          ? sRes.value.data.data.map((s: any) => ({
            id: s.id,
            name: `${s.name} (${s.course?.code ?? ''} Year ${s.year})`,
            deptId: s.course?.departmentId || s.course?.department?.id || s.departmentId,
            deptName: s.course?.department?.name ?? '',
            academicYearId: s.academicYearId,
          }))
          : [];
        const apiSubjects = subRes.status === 'fulfilled' ? subRes.value.data.data ?? [] : [];
        const apiTeachers = tRes.status === 'fulfilled'
          ? tRes.value.data.data.map((t: any) => ({
            id: t.id,
            name: t.user?.name ?? t.name ?? '',
            code: t.employeeCode ?? '',
            dept: t.department?.name ?? '',
          }))
          : [];
        setDepartments(apiDepartments);
        setSections(apiSections);
        setSubjects(apiSubjects);
        setTeachers(apiTeachers);
        if (apiSections[0]) {
          setSelectedSectionId(apiSections[0].id);
          setFilterSectionId(apiSections[0].id);
        }
        if (apiSubjects[0]) setSelectedSubjectId(apiSubjects[0].id);
        if (apiTeachers[0]) {
          setSelectedTeacherId(apiTeachers[0].id);
          setFilterTeacherId(apiTeachers[0].id);
        }

        if (ttRes.status === 'fulfilled') {
          const apiSlots = (ttRes.value.data.data ?? []).map((slot: any) => ({
            id: `tt-${slot.id}`,
            sectionId: slot.sectionId,
            sectionName: slot.section?.name ?? '',
            subjectId: slot.subjectId,
            subjectName: apiSubjects.find((subject: any) => subject.id === slot.subjectId)?.name ?? '',
            subjectCode: apiSubjects.find((subject: any) => subject.id === slot.subjectId)?.code ?? '',
            teacherId: slot.teacherId,
            teacherName: apiTeachers.find((teacher: any) => teacher.id === slot.teacherId)?.name ?? '',
            dayOfWeek: slot.dayOfWeek,
            period: slot.period,
            startTime: slot.startTime,
            endTime: slot.endTime,
            roomNo: slot.roomNo ?? '',
          }));
          setSchedule(apiSlots);
        }
        const failedRequests = [dRes, sRes, subRes, tRes, ttRes].some((result) => result.status === 'rejected');
        setLoadError(failedRequests ? 'Some timetable data could not be loaded. Check the server connection and refresh.' : null);
      } catch (error: any) {
        setLoadError(error.response?.data?.error?.message || 'Could not load timetable setup data.');
        setDepartments([]);
        setSections([]);
        setSubjects([]);
        setTeachers([]);
        setSchedule([]);
      }
    }
    void loadData();
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

  const hasSelections = selectedSectionId !== null && selectedSubjectId !== null && selectedTeacherId !== null;
  const clashStatus = hasSelections
    ? checkClash(selectedDay, selectedPeriod, selectedSectionId, selectedTeacherId, roomNo)
    : { hasClash: false, message: 'Load academic records and select a section, subject, and teacher.' };

  // Pre-Schedule Lecture handler
  async function handleScheduleLecture(e: React.FormEvent) {
    e.preventDefault();

    if (!hasSelections) {
      setLoadError('Select a section, subject, and teacher before scheduling.');
      return;
    }
    if (!roomNo.trim() || !startTime || !endTime || startTime >= endTime) {
      setLoadError('Enter a room and valid start/end times before scheduling.');
      return;
    }
    if (clashStatus.hasClash) {
      alert(` Cannot Schedule Lecture due to Conflict:\n\n${clashStatus.message}`);
      return;
    }

    const sectionObj = sections.find((section) => section.id === selectedSectionId);
    const subjectObj = subjects.find((subject) => subject.id === selectedSubjectId);
    const teacherObj = teachers.find((teacher) => teacher.id === selectedTeacherId);
    if (!sectionObj || !subjectObj || !teacherObj || !sectionObj.academicYearId) {
      setLoadError('The selected academic records are incomplete. Refresh the data before scheduling.');
      return;
    }

    try {
      const response = await api.post('/academic/timetable', {
        sectionId: selectedSectionId,
        subjectId: selectedSubjectId,
        teacherId: selectedTeacherId,
        dayOfWeek: selectedDay,
        period: selectedPeriod,
        startTime,
        endTime,
        roomNo: roomNo.trim(),
        academicYearId: sectionObj.academicYearId,
      });
      const savedSlot = response.data.data;
      setSchedule((prev) => [...prev, {
        id: `tt-${savedSlot.id}`,
        sectionId: selectedSectionId,
        sectionName: sectionObj.name,
        subjectId: selectedSubjectId,
        subjectName: subjectObj.name,
        subjectCode: subjectObj.code,
        teacherId: selectedTeacherId,
        teacherName: teacherObj.name,
        dayOfWeek: selectedDay,
        period: selectedPeriod,
        startTime: savedSlot.startTime,
        endTime: savedSlot.endTime,
        roomNo: savedSlot.roomNo ?? roomNo.trim(),
      }]);
      setLoadError(null);
      triggerToast(`Scheduled "${subjectObj.name}" for ${sectionObj.name} with ${teacherObj.name} on ${DAYS.find((d) => d.id === selectedDay)?.name} (Period ${selectedPeriod}).`);
    } catch (error: any) {
      setLoadError(error.response?.data?.error?.message || 'Could not schedule the lecture.');
    }
  }

  // Delete slot handler
  async function handleDeleteSlot(slotId: string, subjectName: string) {
    if (!confirm(`Are you sure you want to remove this scheduled lecture for "${subjectName}"?`)) return;

    try {
      const numId = Number(slotId.replace('tt-', ''));
      if (!Number.isInteger(numId)) throw new Error('Invalid timetable record ID.');
      await api.delete(`/academic/timetable/${numId}`);
      setSchedule((prev) => prev.filter((s) => s.id !== slotId));
      triggerToast(`Removed lecture slot for "${subjectName}".`);
    } catch (error: any) {
      setLoadError(error.response?.data?.error?.message || 'Could not remove the lecture slot.');
    }
  }

  // Pre-generate today's attendance sessions for all teachers
  async function handlePreGenerateSessions() {
    setPreGenerating(true);
    try {
      const response = await api.post('/academic/timetable/pre-generate-sessions');
      triggerToast(response.data.message || 'Attendance sessions were created.');
    } catch (error: any) {
      setLoadError(error.response?.data?.error?.message || 'Could not create today\'s attendance sessions.');
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
             Export Master Timetable (CSV)
          </button>
          <button
            className="btn btn--primary btn--sm"
            onClick={handlePreGenerateSessions}
            disabled={preGenerating || schedule.length === 0}
            style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 14px var(--color-primary-glow)' }}
          >
            {preGenerating ? 'Generating Sessions...' : 'Pre-Generate Today\'s Class Sessions'}
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
           {toastMessage}
        </div>
      )}
      {loadError && <p className="alert alert--error" role="alert">{loadError}</p>}

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
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}> Pre-Schedule New Lecture</h3>
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
            {clashStatus.hasClash ? 'Conflict detected' : hasSelections ? 'Ready to schedule' : 'Select academic records'}
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
                value={selectedSectionId ?? ''}
                onChange={(e) => setSelectedSectionId(Number(e.target.value))}
              >
                <option value="" disabled>Select a section</option>
                {departments.length > 0 ? (
                  departments.map((dept) => {
                    const deptSections = sections.filter((s) => s.deptId === dept.id);
                    if (deptSections.length === 0) return null;
                    return (
                      <optgroup key={dept.id} label={` ${dept.name} (${dept.code})`}>
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
                value={selectedSubjectId ?? ''}
                onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
              >
                <option value="" disabled>Select a subject</option>
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
                value={selectedTeacherId ?? ''}
                onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
              >
                <option value="" disabled>Select a teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.dept ? ` (${t.dept})` : ''}
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
                {PERIODS.map((period) => (
                  <option key={period} value={period}>
                    Period {period}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Start Time
              </label>
              <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
                End Time
              </label>
              <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
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
               {clashStatus.message}
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
              {hasSelections
                ? 'No matching section, teacher, or room conflict was found in the loaded timetable.'
                : clashStatus.message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={clashStatus.hasClash || !hasSelections}
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
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}> Master Timetable Matrix Grid</h3>
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
                <option value="ALL"> All Branches</option>
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
                value={filterSectionId ?? ''}
                onChange={(e) => setFilterSectionId(Number(e.target.value))}
              >
                <option value="" disabled>Select a section</option>
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
                value={filterTeacherId ?? ''}
                onChange={(e) => setFilterTeacherId(Number(e.target.value))}
              >
                <option value="" disabled>Select a teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.dept ? ` (${t.dept})` : ''}
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
                {PERIODS.map((period) => (
                  <th key={period} style={{ padding: '0.85rem', fontSize: '0.8rem', fontWeight: 800 }}>
                    Period {period}
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

                  {PERIODS.map((period) => {
                    const slot = displayedSlots.find((s) => s.dayOfWeek === d.id && s.period === period);
                    return (
                      <td key={period} style={{ padding: '0.75rem', borderRight: '1px solid var(--color-border)', verticalAlign: 'top', minWidth: 145 }}>
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
                              {slot.startTime}–{slot.endTime}
                            </div>
                            <div className="text-xs text-muted" style={{ marginBottom: '0.35rem' }}>
                               {slot.teacherName.replace('Prof. ', '').replace('Dr. ', '')}
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
                                 {slot.roomNo}
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
                              setSelectedPeriod(period);
                              if (viewFilterMode === 'SECTION' && filterSectionId !== null) setSelectedSectionId(filterSectionId);
                              if (viewFilterMode === 'FACULTY' && filterTeacherId !== null) setSelectedTeacherId(filterTeacherId);
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
