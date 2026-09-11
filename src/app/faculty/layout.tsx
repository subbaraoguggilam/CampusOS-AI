import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || !["faculty", "hod"].includes(session.role)) redirect("/login");
  return <>{children}</>;
}
