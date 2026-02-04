import { useState, useEffect } from "react";

export const TaskbarClock = () => {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className="px-2 text-white text-msn-base font-normal flex items-center justify-center h-full select-none cursor-default truncate"
      style={{
        textShadow: "1px 1px 1px #000",
        fontFamily: "Tahoma, sans-serif",
      }}
    >
      {time}
    </div>
  );
};
