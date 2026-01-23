"use client";

import { useEffect, useState } from "react";

export default function PushNotificationSetup() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if push is supported and not yet subscribed
    if ("serviceWorker" in navigator && "PushManager" in window) {
      if (Notification.permission === "default") {
        // Show banner after 5 seconds
        const timer = setTimeout(() => setShowBanner(true), 5000);
        return () => clearTimeout(timer);
      } else if (Notification.permission === "granted") {
        registerServiceWorker();
      }
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
        ),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });
    } catch (error) {
      console.error("Push registration error:", error);
    }
  };

  const handleEnable = async () => {
    setShowBanner(false);
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await registerServiceWorker();
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-16 left-2 right-2 z-40 bg-blue-500/20 border border-blue-500/30 backdrop-blur-xl rounded-xl p-3 flex items-center gap-3 animate-in slide-in-from-top">
      <span className="text-xl">🔔</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Activa las notificaciones</p>
        <p className="text-xs text-gray-400">Recordatorios diarios y rachas</p>
      </div>
      <button
        onClick={handleEnable}
        className="px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-lg whitespace-nowrap"
      >
        Activar
      </button>
      <button
        onClick={() => setShowBanner(false)}
        className="text-gray-500 text-sm"
      >
        ✕
      </button>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
