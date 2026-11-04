import StudentPublicProfile from "@/components/students/StudentPublicProfile";
export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentPublicProfile key={id} studentId={id} />;
}
