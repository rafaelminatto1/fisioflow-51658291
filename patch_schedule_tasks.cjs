const fs = require('fs');
const file = 'src/pages/Schedule.tsx';
let content = fs.readFileSync(file, 'utf8');

// Inside Schedule.tsx, let's merge data.appointments and data.tarefas
// First, find the return part
const searchStr = `	return (`;
const insertStr = `
	// Combine appointments and tasks
	const combinedEvents = useMemo(() => {
		const appts = data?.appointments || [];
		const tasks = data?.tarefas || [];

		const mappedTasks = tasks.map(t => ({
			id: t.id,
			patient: t.patientId ? { fullName: \`Tarefa: \${t.title}\` } : { fullName: \`Tarefa: \${t.title}\` },
			date: t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
			startTime: "00:00:00", // Tasks don't have start/end currently, we default to all day
			allDay: true,
			status: t.status === "concluida" ? "atendido" : "agendado", // mapped loosely for colors
			_isTask: true,
			originalTask: t
		}));

		return [...appts, ...mappedTasks];
	}, [data?.appointments, data?.tarefas]);

	return (`;

if (!content.includes('combinedEvents')) {
    content = content.replace(searchStr, insertStr);
}

// Ensure useMemo is imported
if (!content.includes('useMemo')) {
    content = content.replace('import { Suspense, useEffect } from "react";', 'import { Suspense, useEffect, useMemo } from "react";');
}

// Pass combinedEvents to FullCalendarWrapper
content = content.replace('appointments={data?.appointments || []}', 'appointments={combinedEvents}');

fs.writeFileSync(file, content);
console.log("Patched Schedule.tsx");
