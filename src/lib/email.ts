import { Resend } from "resend";

const FROM_EMAIL = "Study2One <noreply@study2one.com>";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendWeeklyReport(
  to: string,
  data: {
    name: string;
    daysCompleted: number;
    streak: number;
    rank: number;
    totalStudents: number;
    quizAvg: number;
  }
) {
  const resend = getResend();
  if (!resend) return null;

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #111; color: #fff; border-radius: 16px;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">Hola, ${data.name} 👋</h1>
      <p style="color: #999; font-size: 14px;">Tu reporte semanal de Study2One</p>

      <div style="background: #1a1a1a; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
          <div style="text-align: center; flex: 1;">
            <p style="font-size: 28px; font-weight: bold; margin: 0;">${data.daysCompleted}</p>
            <p style="font-size: 12px; color: #999; margin: 4px 0 0;">Dias completados</p>
          </div>
          <div style="text-align: center; flex: 1;">
            <p style="font-size: 28px; font-weight: bold; margin: 0;">🔥${data.streak}</p>
            <p style="font-size: 12px; color: #999; margin: 4px 0 0;">Racha</p>
          </div>
        </div>
        <div style="display: flex; gap: 12px;">
          <div style="text-align: center; flex: 1;">
            <p style="font-size: 28px; font-weight: bold; margin: 0;">#${data.rank}</p>
            <p style="font-size: 12px; color: #999; margin: 4px 0 0;">de ${data.totalStudents}</p>
          </div>
          <div style="text-align: center; flex: 1;">
            <p style="font-size: 28px; font-weight: bold; margin: 0;">${data.quizAvg}%</p>
            <p style="font-size: 12px; color: #999; margin: 4px 0 0;">Quiz promedio</p>
          </div>
        </div>
      </div>

      <a href="https://study2one.onrender.com/dashboard" style="display: block; text-align: center; background: linear-gradient(to right, #15803d, #22c55e); color: white; padding: 12px; border-radius: 12px; text-decoration: none; font-weight: 600;">
        Continuar estudiando →
      </a>

      <p style="color: #666; font-size: 11px; text-align: center; margin-top: 20px;">
        Study2One - Saber Pro Medicina 2026
      </p>
    </div>
  `;

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `📊 Tu semana: ${data.daysCompleted} dias, racha de ${data.streak}`,
    html,
  });
}

export async function sendInactivityAlert(
  to: string,
  data: { name: string; daysMissed: number; streak: number }
) {
  const resend = getResend();
  if (!resend) return null;

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #111; color: #fff; border-radius: 16px;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">Te extrañamos, ${data.name} 😢</h1>
      <p style="color: #999; font-size: 14px;">Llevas ${data.daysMissed} dias sin estudiar</p>

      ${data.streak > 0 ? `
        <div style="background: #1a1a1a; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
          <p style="font-size: 16px; color: #f59e0b;">⚠️ Tu racha de ${data.streak} dias esta en riesgo</p>
        </div>
      ` : ""}

      <p style="color: #ccc; font-size: 14px; line-height: 1.6;">
        Solo toma 15 minutos al dia. Escucha el audio mientras desayunas o caminas.
      </p>

      <a href="https://study2one.onrender.com/dashboard" style="display: block; text-align: center; background: linear-gradient(to right, #15803d, #22c55e); color: white; padding: 12px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 20px;">
        Retomar ahora →
      </a>
    </div>
  `;

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `⚠️ ${data.name}, tu racha esta en riesgo`,
    html,
  });
}
