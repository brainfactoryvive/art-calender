import { StudentCalendarShell } from "@/components/student-calendar-shell";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <StudentCalendarShell />
      </main>
    </div>
  );
}
