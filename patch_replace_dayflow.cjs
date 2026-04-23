const fs = require('fs');
const file = 'src/pages/Schedule.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace import
content = content.replace('import { DayFlowCalendarWrapper } from "@/components/schedule/DayFlowCalendar";', 'import { FullCalendarWrapper } from "@/components/schedule/FullCalendarWrapper";');

// Replace Component
const searchStr = `<DayFlowCalendarWrapper`;
const insertStr = `<FullCalendarWrapper`;
content = content.replace(searchStr, insertStr);

fs.writeFileSync(file, content);
console.log("Replaced DayFlowCalendarWrapper with FullCalendarWrapper");
