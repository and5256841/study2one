import { jsPDF } from "jspdf";

interface CredentialData {
  fullName: string;
  email: string;
  password: string;
  cohortName: string;
}

export function generateCredentialPDF(data: CredentialData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("study2one", pageWidth / 2, 30, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Credenciales de Acceso", pageWidth / 2, 40, { align: "center" });

  // Divider
  doc.setDrawColor(200);
  doc.line(20, 48, pageWidth - 20, 48);

  // Cohort
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Cohorte: ${data.cohortName}`, pageWidth / 2, 58, {
    align: "center",
  });

  // Credential box
  const boxY = 68;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(25, boxY, pageWidth - 50, 60, 3, 3, "F");

  doc.setTextColor(60);
  doc.setFontSize(11);

  doc.setFont("helvetica", "bold");
  doc.text("Nombre:", 35, boxY + 15);
  doc.setFont("helvetica", "normal");
  doc.text(data.fullName, 75, boxY + 15);

  doc.setFont("helvetica", "bold");
  doc.text("Correo:", 35, boxY + 28);
  doc.setFont("helvetica", "normal");
  doc.text(data.email, 75, boxY + 28);

  doc.setFont("helvetica", "bold");
  doc.text("Contraseña:", 35, boxY + 41);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 100, 0);
  doc.text(data.password, 75, boxY + 41);

  // Warning
  doc.setTextColor(180, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(
    "IMPORTANTE: Guarda este documento. La contraseña no se puede recuperar.",
    pageWidth / 2,
    boxY + 75,
    { align: "center" }
  );

  // Footer
  doc.setTextColor(160);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generado el ${new Date().toLocaleDateString("es-CO")}`,
    pageWidth / 2,
    280,
    { align: "center" }
  );

  // Download
  doc.save(`credenciales-${data.fullName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
