const fs = require('fs');
const file = 'src/hooks/useSchedulePage.ts';
let content = fs.readFileSync(file, 'utf8');

const searchStr = `export interface SchedulePageData {
	appointments: Appointment[];
	therapists: TherapistProfileRow[];
	patients: PatientRow[];
	birthdaysToday: PatientRow[];
	staffBirthdaysToday: TherapistProfileRow[];
	organizationId: string;
}`;

const insertStr = `export interface SchedulePageData {
	appointments: Appointment[];
	therapists: TherapistProfileRow[];
	patients: PatientRow[];
	birthdaysToday: PatientRow[];
	staffBirthdaysToday: TherapistProfileRow[];
	tarefas?: any[];
	organizationId: string;
}`;

if (content.includes(searchStr)) {
    content = content.replace(searchStr, insertStr);
    fs.writeFileSync(file, content);
    console.log("Patched interface");
} else {
    console.log("Not found");
}
